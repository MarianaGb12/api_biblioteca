import { describe, test, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import mongoose from 'mongoose';
import request from 'supertest';
import express from 'express';
import dotenv from 'dotenv';
import Usuario from '../models/Usuario.js';
import {
  registrarUsuario,
  loginUsuario,
  obtenerPerfil,
  actualizarUsuario,
  inhabilitarUsuario
} from '../controllers/usuariosController.js';
import { auth } from '../middleware/auth.js';
import jwt from 'jsonwebtoken';

dotenv.config();

const app = express();
app.use(express.json());

app.post('/register', registrarUsuario);
app.post('/login', loginUsuario);
app.get('/me', auth(), obtenerPerfil);
app.put('/:id', auth(), actualizarUsuario);
app.delete('/:id', auth(), inhabilitarUsuario);

describe('Usuarios Controller', () => {
  let mongoUri;

  beforeAll(async () => {
    mongoUri = process.env.MONGO_URI_TEST || process.env.MONGO_URI;
    if (mongoUri) {
      await mongoose.connect(mongoUri);
    }
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    await Usuario.deleteMany({});
  });

  describe('registrarUsuario', () => {
    test('debe registrar un usuario exitosamente', async () => {
      const nuevoUsuario = {
        nombre: 'Juan Pérez',
        email: 'juan@test.com',
        password: 'password123',
        rol: 'lector'
      };

      const response = await request(app)
        .post('/register')
        .send(nuevoUsuario);

      expect(response.status).toBe(201);
      expect(response.body.msg).toBe('Usuario creado exitosamente');
      expect(response.body.usuario).toHaveProperty('id');
      expect(response.body.usuario.email).toBe(nuevoUsuario.email);
      expect(response.body.usuario.nombre).toBe(nuevoUsuario.nombre);
    });

    test('debe fallar cuando falta el nombre', async () => {
      const usuarioIncompleto = {
        email: 'test@test.com',
        password: 'password123'
      };

      const response = await request(app)
        .post('/register')
        .send(usuarioIncompleto);

      expect(response.status).toBe(400);
      expect(response.body.msg).toContain('requeridos');
    });

    test('debe fallar cuando falta el email', async () => {
      const usuarioIncompleto = {
        nombre: 'Test User',
        password: 'password123'
      };

      const response = await request(app)
        .post('/register')
        .send(usuarioIncompleto);

      expect(response.status).toBe(400);
      expect(response.body.msg).toContain('requeridos');
    });

    test('debe fallar cuando falta el password', async () => {
      const usuarioIncompleto = {
        nombre: 'Test User',
        email: 'test@test.com'
      };

      const response = await request(app)
        .post('/register')
        .send(usuarioIncompleto);

      expect(response.status).toBe(400);
      expect(response.body.msg).toContain('requeridos');
    });

    test('debe fallar cuando el email ya está registrado', async () => {  
      const response1 = await request(app)
        .post('/register')
        .send({
          nombre: 'Usuario Existente',
          email: 'existente@test.com',
          password: 'password123'
        });
      
      expect(response1.status).toBe(201);

      const response = await request(app)
        .post('/register')
        .send({
          nombre: 'Nuevo Usuario',
          email: 'existente@test.com',
          password: 'password123'
        });

      expect(response.status).toBe(400);
      expect(response.body.msg).toBe('Email ya registrado');
    });
  });

  describe('loginUsuario', () => {
    beforeEach(async () => {
      await Usuario.deleteMany({ email: 'test@test.com' });
      const usuario = new Usuario({
        nombre: 'Usuario Test',
        email: 'test@test.com',
        password: 'password123'
      });
      await usuario.save();
    });

    test('debe hacer login exitosamente', async () => {
      const response = await request(app)
        .post('/login')
        .send({
          email: 'test@test.com',
          password: 'password123'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
      expect(response.body.usuario.email).toBe('test@test.com');
      expect(response.body.usuario.nombre).toBe('Usuario Test');
    });

    test('debe fallar cuando falta el email', async () => {
      const response = await request(app)
        .post('/login')
        .send({
          password: 'password123'
        });

      expect(response.status).toBe(400);
      expect(response.body.msg).toContain('requeridos');
    });

    test('debe fallar cuando falta el password', async () => {
      const response = await request(app)
        .post('/login')
        .send({
          email: 'test@test.com'
        });

      expect(response.status).toBe(400);
      expect(response.body.msg).toContain('requeridos');
    });

    test('debe fallar con email incorrecto', async () => {
      const response = await request(app)
        .post('/login')
        .send({
          email: 'noexiste@test.com',
          password: 'password123'
        });

      expect(response.status).toBe(404);
      expect(response.body.msg).toBe('Usuario no encontrado');
    });

    test('debe fallar con password incorrecto', async () => {
      const response = await request(app)
        .post('/login')
        .send({
          email: 'test@test.com',
          password: 'passwordIncorrecto'
        });

      expect(response.status).toBe(401);
      expect(response.body.msg).toBe('Contraseña incorrecta');
    });

    test('debe fallar con usuario inhabilitado', async () => {
      const usuario = await Usuario.findOne({ email: 'test@test.com' });
      usuario.activo = false;
      await usuario.save();

      const response = await request(app)
        .post('/login')
        .send({
          email: 'test@test.com',
          password: 'password123'
        });

      expect(response.status).toBe(404);
      expect(response.body.msg).toBe('Usuario no encontrado');
    });
  });

  describe('obtenerPerfil', () => {
    let token;
    let usuarioId;

    beforeEach(async () => {
      const usuario = new Usuario({
        nombre: 'Usuario Test',
        email: 'test@test.com',
        password: 'password123'
      });
      await usuario.save();
      usuarioId = usuario._id.toString();
      
      token = jwt.sign(
        { id: usuarioId, rol: 'lector', nombre: 'Usuario Test' },
        process.env.JWT_SECRET,
        { expiresIn: '8h' }
      );
    });

    test('debe obtener el perfil exitosamente', async () => {
      const usuario = await Usuario.findById(usuarioId);
      expect(usuario).not.toBeNull();

      const response = await request(app)
        .get('/me')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.email).toBe('test@test.com');
      expect(response.body.nombre).toBe('Usuario Test');
      expect(response.body).not.toHaveProperty('password');
    });

    test('debe fallar sin token', async () => {
      const response = await request(app)
        .get('/me');

      expect(response.status).toBe(401);
      expect(response.body.msg).toBe('Token requerido');
    });

    test('debe fallar con token inválido', async () => {
      const response = await request(app)
        .get('/me')
        .set('Authorization', 'Bearer token_invalido');

      expect(response.status).toBe(401);
      expect(response.body.msg).toBe('Token inválido');
    });
  });

  describe('actualizarUsuario', () => {
    let token;
    let usuarioId;
    let adminToken;
    let adminId;

    beforeEach(async () => {
      await Usuario.deleteMany({ email: { $in: ['test@test.com', 'admin@test.com'] } });
      
      const usuario = new Usuario({
        nombre: 'Usuario Test',
        email: 'test@test.com',
        password: 'password123'
      });
      await usuario.save();
      usuarioId = usuario._id.toString();
      
      token = jwt.sign(
        { id: usuarioId, rol: 'lector', nombre: 'Usuario Test' },
        process.env.JWT_SECRET,
        { expiresIn: '8h' }
      );

      const admin = new Usuario({
        nombre: 'Admin Test',
        email: 'admin@test.com',
        password: 'password123',
        rol: 'admin'
      });
      await admin.save();
      adminId = admin._id.toString();
      
      adminToken = jwt.sign(
        { id: adminId, rol: 'admin', nombre: 'Admin Test' },
        process.env.JWT_SECRET,
        { expiresIn: '8h' }
      );
    });

    test('debe actualizar usuario exitosamente', async () => {
      let usuario = await Usuario.findById(usuarioId);
      if (!usuario) {
        usuario = new Usuario({
          nombre: 'Usuario Test',
          email: 'test@test.com',
          password: 'password123'
        });
        await usuario.save();
        usuarioId = usuario._id.toString();
        token = jwt.sign(
          { id: usuarioId, rol: 'lector', nombre: 'Usuario Test' },
          process.env.JWT_SECRET,
          { expiresIn: '8h' }
        );
      }
      expect(usuario).not.toBeNull();

      const response = await request(app)
        .put(`/${usuarioId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          nombre: 'Nombre Actualizado'
        });

      expect(response.status).toBe(200);
      expect(response.body.msg).toBe('Usuario actualizado');
      expect(response.body.usuario.nombre).toBe('Nombre Actualizado');
    });

    test('debe fallar cuando intenta actualizar otro usuario sin ser admin', async () => {
      const otroUsuario = new Usuario({
        nombre: 'Otro Usuario',
        email: 'otro@test.com',
        password: 'password123'
      });
      await otroUsuario.save();

      const response = await request(app)
        .put(`/${otroUsuario._id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          nombre: 'Nombre Actualizado'
        });

      expect(response.status).toBe(403);
      expect(response.body.msg).toBe('No autorizado');
    });

    test('debe permitir a admin actualizar cualquier usuario', async () => {
      let usuario = await Usuario.findById(usuarioId);
      let admin = await Usuario.findById(adminId);
      
      if (!usuario) {
        usuario = new Usuario({
          nombre: 'Usuario Test',
          email: 'test@test.com',
          password: 'password123'
        });
        await usuario.save();
        usuarioId = usuario._id.toString();
      }
      
      if (!admin) {
        admin = new Usuario({
          nombre: 'Admin Test',
          email: 'admin@test.com',
          password: 'password123',
          rol: 'admin'
        });
        await admin.save();
        adminId = admin._id.toString();
        adminToken = jwt.sign(
          { id: adminId, rol: 'admin', nombre: 'Admin Test' },
          process.env.JWT_SECRET,
          { expiresIn: '8h' }
        );
      }
      
      expect(usuario).not.toBeNull();
      expect(admin).not.toBeNull();

      const response = await request(app)
        .put(`/${usuarioId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          nombre: 'Actualizado por Admin'
        });

      expect(response.status).toBe(200);
      expect(response.body.usuario.nombre).toBe('Actualizado por Admin');
    });

    test('debe fallar con ID de usuario inválido', async () => {
      const response = await request(app)
        .put('/id_invalido')
        .set('Authorization', `Bearer ${token}`)
        .send({
          nombre: 'Nombre Actualizado'
        });

      expect([400, 403, 404, 500]).toContain(response.status);
    });
  });

  describe('inhabilitarUsuario', () => {
    let token;
    let usuarioId;
    let adminToken;
    let adminId;

    beforeEach(async () => {
      await Usuario.deleteMany({ email: { $in: ['test@test.com', 'admin@test.com'] } });
      
      const usuario = new Usuario({
        nombre: 'Usuario Test',
        email: 'test@test.com',
        password: 'password123'
      });
      await usuario.save();
      usuarioId = usuario._id.toString();
      
      token = jwt.sign(
        { id: usuarioId, rol: 'lector', nombre: 'Usuario Test' },
        process.env.JWT_SECRET,
        { expiresIn: '8h' }
      );

      const admin = new Usuario({
        nombre: 'Admin Test',
        email: 'admin@test.com',
        password: 'password123',
        rol: 'admin'
      });
      await admin.save();
      adminId = admin._id.toString();
      
      adminToken = jwt.sign(
        { id: adminId, rol: 'admin', nombre: 'Admin Test' },
        process.env.JWT_SECRET,
        { expiresIn: '8h' }
      );
    });

    test('debe inhabilitar usuario exitosamente', async () => {
      let usuarioAntes = await Usuario.findById(usuarioId);
      if (!usuarioAntes) {
        usuarioAntes = new Usuario({
          nombre: 'Usuario Test',
          email: 'test@test.com',
          password: 'password123'
        });
        await usuarioAntes.save();
        usuarioId = usuarioAntes._id.toString();
        token = jwt.sign(
          { id: usuarioId, rol: 'lector', nombre: 'Usuario Test' },
          process.env.JWT_SECRET,
          { expiresIn: '8h' }
        );
      }
      expect(usuarioAntes).not.toBeNull();
      expect(usuarioAntes.activo).toBe(true);

      const response = await request(app)
        .delete(`/${usuarioId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.msg).toBe('Usuario inhabilitado');

      const usuarioDespues = await Usuario.findById(usuarioId);
      expect(usuarioDespues).not.toBeNull();
      expect(usuarioDespues.activo).toBe(false);
    });

    test('debe fallar cuando intenta inhabilitar otro usuario sin ser admin', async () => {
      const otroUsuario = new Usuario({
        nombre: 'Otro Usuario',
        email: 'otro@test.com',
        password: 'password123'
      });
      await otroUsuario.save();

      const response = await request(app)
        .delete(`/${otroUsuario._id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(403);
      expect(response.body.msg).toBe('No autorizado');
    });

    test('debe permitir a admin inhabilitar cualquier usuario', async () => {
      let usuario = await Usuario.findById(usuarioId);
      let admin = await Usuario.findById(adminId);
      
      if (!usuario) {
        usuario = new Usuario({
          nombre: 'Usuario Test',
          email: 'test@test.com',
          password: 'password123'
        });
        await usuario.save();
        usuarioId = usuario._id.toString();
      }
      
      if (!admin) {
        admin = new Usuario({
          nombre: 'Admin Test',
          email: 'admin@test.com',
          password: 'password123',
          rol: 'admin'
        });
        await admin.save();
        adminId = admin._id.toString();
        adminToken = jwt.sign(
          { id: adminId, rol: 'admin', nombre: 'Admin Test' },
          process.env.JWT_SECRET,
          { expiresIn: '8h' }
        );
      }
      
      expect(usuario).not.toBeNull();
      expect(admin).not.toBeNull();

      const response = await request(app)
        .delete(`/${usuarioId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.msg).toBe('Usuario inhabilitado');

      const usuarioInhabilitado = await Usuario.findById(usuarioId);
      expect(usuarioInhabilitado.activo).toBe(false);
    });

    test('debe fallar con ID de usuario no encontrado', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .delete(`/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
      expect(response.body.msg).toBe('Usuario no encontrado');
    });
  });
});

