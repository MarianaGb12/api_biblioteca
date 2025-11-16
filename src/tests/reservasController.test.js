import { describe, test, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import mongoose from 'mongoose';
import request from 'supertest';
import express from 'express';
import dotenv from 'dotenv';
import Reserva from '../models/Reserva.js';
import Libro from '../models/Libro.js';
import Usuario from '../models/Usuario.js';
import {
  crearReserva,
  obtenerHistorialPorUsuario,
  obtenerHistorialPorLibro
} from '../controllers/reservasController.js';
import { auth } from '../middleware/auth.js';
import jwt from 'jsonwebtoken';

dotenv.config();

const app = express();
app.use(express.json());

// Rutas de prueba
app.post('/', auth(), crearReserva);
app.get('/usuario/:id', auth(), obtenerHistorialPorUsuario);
app.get('/libro/:id', auth(['admin']), obtenerHistorialPorLibro);

describe('Reservas Controller', () => {
  let mongoUri;
  let usuarioToken;
  let usuarioId;
  let adminToken;
  let adminId;
  let libroId;

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
    await Promise.all([
      Reserva.deleteMany({}),
      Libro.deleteMany({}),
      Usuario.deleteMany({})
    ]);

    const usuario = await Usuario.findOneAndUpdate(
      { email: 'usuario@test.com' },
      {
        nombre: 'Usuario Test',
        email: 'usuario@test.com',
        password: 'password123',
        rol: 'lector',
        activo: true
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    usuarioId = usuario._id.toString();
    
    usuarioToken = jwt.sign(
      { id: usuarioId, rol: 'lector', nombre: 'Usuario Test' },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    const admin = await Usuario.findOneAndUpdate(
      { email: 'admin@test.com' },
      {
        nombre: 'Admin Test',
        email: 'admin@test.com',
        password: 'password123',
        rol: 'admin',
        activo: true
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    adminId = admin._id.toString();
    
    adminToken = jwt.sign(
      { id: adminId, rol: 'admin', nombre: 'Admin Test' },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    const libro = await Libro.findOneAndUpdate(
      { titulo: 'Libro Test', autor: 'Autor Test' },
      {
        titulo: 'Libro Test',
        autor: 'Autor Test',
        disponible: true,
        activo: true
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    libroId = libro._id.toString();
  });

  describe('crearReserva', () => {
    test('debe crear una reserva exitosamente', async () => {
      let libroAntes = await Libro.findById(libroId);
      if (!libroAntes) {
        libroAntes = new Libro({
          titulo: 'Libro Test',
          autor: 'Autor Test',
          disponible: true,
          activo: true
        });
        await libroAntes.save();
        libroId = libroAntes._id.toString();
      }
      expect(libroAntes).not.toBeNull();
      expect(libroAntes.disponible).toBe(true);

      const response = await request(app)
        .post('/')
        .set('Authorization', `Bearer ${usuarioToken}`)
        .send({
          libro: libroId,
          fecha_entrega: new Date('2024-12-31')
        });

      expect(response.status).toBe(201);
      expect(response.body.libro.toString()).toBe(libroId);
      expect(response.body.usuario.toString()).toBe(usuarioId);

      const libroDespues = await Libro.findById(libroId);
      expect(libroDespues).not.toBeNull();
      expect(libroDespues.disponible).toBe(false);
    });

    test('debe fallar cuando falta el ID de libro', async () => {
      const response = await request(app)
        .post('/')
        .set('Authorization', `Bearer ${usuarioToken}`)
        .send({
          fecha_entrega: new Date('2024-12-31')
        });

      expect(response.status).toBe(400);
      expect(response.body.msg).toContain('requerido');
    });

    test('debe fallar sin token de autenticación', async () => {
      const response = await request(app)
        .post('/')
        .send({
          libro: libroId,
          fecha_entrega: new Date('2024-12-31')
        });

      expect(response.status).toBe(401);
    });

    test('debe fallar cuando el libro no existe', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const libroExistente = await Libro.findById(fakeId);
      expect(libroExistente).toBeNull();

      const response = await request(app)
        .post('/')
        .set('Authorization', `Bearer ${usuarioToken}`)
        .send({
          libro: fakeId,
          fecha_entrega: new Date('2024-12-31')
        });

      expect(response.status).toBe(404);
      expect(response.body.msg).toBe('Libro no disponible');
    });

    test('debe fallar cuando el libro está inhabilitado', async () => {
      const timestamp = Date.now();
      const libroInhabilitado = new Libro({
        titulo: `Libro Inhabilitado ${timestamp}`,
        autor: `Autor Test ${timestamp}`,
        disponible: true,
        activo: false
      });
      await libroInhabilitado.save();
      const libroInhabilitadoId = libroInhabilitado._id.toString();

      const response = await request(app)
        .post('/')
        .set('Authorization', `Bearer ${usuarioToken}`)
        .send({
          libro: libroInhabilitadoId,
          fecha_entrega: new Date('2024-12-31')
        });

      expect(response.status).toBe(404);
      expect(response.body.msg).toBe('Libro no disponible');
    });

    test('debe fallar cuando el libro no está disponible', async () => {
      const timestamp = Date.now();
      const libroNoDisponible = new Libro({
        titulo: `Libro No Disponible ${timestamp}`,
        autor: `Autor Test ${timestamp}`,
        disponible: false,
        activo: true
      });
      await libroNoDisponible.save();
      const libroNoDisponibleId = libroNoDisponible._id.toString();

      const response = await request(app)
        .post('/')
        .set('Authorization', `Bearer ${usuarioToken}`)
        .send({
          libro: libroNoDisponibleId,
          fecha_entrega: new Date('2024-12-31')
        });

      expect(response.status).toBe(400);
      expect(response.body.msg).toContain('no está disponible');
    });

    test('debe fallar con ID de libro inválido', async () => {
      const response = await request(app)
        .post('/')
        .set('Authorization', `Bearer ${usuarioToken}`)
        .send({
          libro: 'id_invalido',
          fecha_entrega: new Date('2024-12-31')
        });

      expect(response.status).toBe(400);
      expect(response.body.msg).toContain('inválido');
    });
  });

  describe('obtenerHistorialPorUsuario', () => {
    beforeEach(async () => {
      await Reserva.deleteMany({});
      
      const libro = await Libro.findById(libroId);
      if (libro) {
        libro.disponible = true;
        libro.activo = true;
        await libro.save();
      }
      
      await Reserva.create([
        {
          usuario: usuarioId,
          libro: libroId,
          fecha_entrega: new Date('2024-12-31')
        },
        {
          usuario: usuarioId,
          libro: libroId,
          fecha_entrega: new Date('2025-01-15')
        }
      ]);
    });

    test('debe obtener el historial de reservas del usuario exitosamente', async () => {
      let usuario = await Usuario.findById(usuarioId);
      if (!usuario) {
        usuario = new Usuario({
          nombre: 'Usuario Test',
          email: 'usuario@test.com',
          password: 'password123',
          rol: 'lector'
        });
        await usuario.save();
        usuarioId = usuario._id.toString();
        usuarioToken = jwt.sign(
          { id: usuarioId, rol: 'lector', nombre: 'Usuario Test' },
          process.env.JWT_SECRET,
          { expiresIn: '8h' }
        );
      }
      expect(usuario).not.toBeNull();

      const response = await request(app)
        .get(`/usuario/${usuarioId}`)
        .set('Authorization', `Bearer ${usuarioToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(2);
      expect(response.body[0]).toHaveProperty('nombre_libro');
      expect(response.body[0]).toHaveProperty('fecha_reserva');
    });

    test('debe permitir a admin ver historial de cualquier usuario', async () => {
      const response = await request(app)
        .get(`/usuario/${usuarioId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    test('debe fallar cuando intenta ver historial de otro usuario sin ser admin', async () => {
      const otroUsuario = new Usuario({
        nombre: 'Otro Usuario',
        email: `otro${Date.now()}@test.com`,
        password: 'password123'
      });
      await otroUsuario.save();
      const otroUsuarioId = otroUsuario._id.toString();

      const response = await request(app)
        .get(`/usuario/${otroUsuarioId}`)
        .set('Authorization', `Bearer ${usuarioToken}`);

      expect(response.status).toBe(403);
      expect(response.body.msg).toBe('No autorizado');
    });

    test('debe retornar array vacío cuando no hay reservas', async () => {
      await Reserva.deleteMany({});
      
      const response = await request(app)
        .get(`/usuario/${usuarioId}`)
        .set('Authorization', `Bearer ${usuarioToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('msg');
      expect(response.body.reservas).toEqual([]);
    });

    test('debe fallar sin token de autenticación', async () => {
      const response = await request(app)
        .get(`/usuario/${usuarioId}`);

      expect(response.status).toBe(401);
    });

    test('debe fallar con ID de usuario inválido', async () => {
      const response = await request(app)
        .get('/usuario/id_invalido')
        .set('Authorization', `Bearer ${usuarioToken}`);

      expect([400, 403]).toContain(response.status);
    });
  });

  describe('obtenerHistorialPorLibro', () => {
    let otroUsuarioId;

    beforeEach(async () => {
      await Reserva.deleteMany({});
      
      const libro = await Libro.findById(libroId);
      if (libro) {
        libro.disponible = true;
        libro.activo = true;
        await libro.save();
      }
      
      const otroUsuario = new Usuario({
        nombre: 'Otro Usuario',
        email: `otro${Date.now()}@test.com`,
        password: 'password123'
      });
      await otroUsuario.save();
      otroUsuarioId = otroUsuario._id.toString();

      await Reserva.create([
        {
          usuario: usuarioId,
          libro: libroId,
          fecha_entrega: new Date('2024-12-31')
        },
        {
          usuario: otroUsuarioId,
          libro: libroId,
          fecha_entrega: new Date('2025-01-15')
        }
      ]);
    });

    test('debe obtener el historial de reservas del libro exitosamente', async () => {
      const libro = await Libro.findById(libroId);
      const usuario = await Usuario.findById(usuarioId);
      const otroUsuario = await Usuario.findById(otroUsuarioId);
      
      expect(libro).not.toBeNull();
      expect(usuario).not.toBeNull();
      expect(otroUsuario).not.toBeNull();

      const response = await request(app)
        .get(`/libro/${libroId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(2);
      expect(response.body[0]).toHaveProperty('nombre_usuario');
      expect(response.body[0]).toHaveProperty('email_usuario');
      expect(response.body[0]).toHaveProperty('fecha_reserva');
    });

    test('debe retornar array vacío cuando no hay reservas', async () => {
      await Reserva.deleteMany({});
      
      const response = await request(app)
        .get(`/libro/${libroId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('msg');
      expect(response.body.reservas).toEqual([]);
    });

    test('debe fallar sin token de autenticación', async () => {
      const response = await request(app)
        .get(`/libro/${libroId}`);

      expect(response.status).toBe(401);
    });

    test('debe fallar con rol no autorizado (solo admin)', async () => {
      const response = await request(app)
        .get(`/libro/${libroId}`)
        .set('Authorization', `Bearer ${usuarioToken}`);

      expect(response.status).toBe(403);
      expect(response.body.msg).toBe('No autorizado');
    });

    test('debe fallar con ID de libro inválido', async () => {
      const response = await request(app)
        .get('/libro/id_invalido')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(400);
      expect(response.body.msg).toContain('inválido');
    });
  });
});

