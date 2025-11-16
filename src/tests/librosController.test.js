import { describe, test, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import mongoose from 'mongoose';
import request from 'supertest';
import express from 'express';
import dotenv from 'dotenv';
import Libro from '../models/Libro.js';
import {
  crearLibro,
  obtenerLibros,
  obtenerLibroPorId,
  actualizarLibro,
  inhabilitarLibro
} from '../controllers/librosController.js';
import { auth } from '../middleware/auth.js';
import jwt from 'jsonwebtoken';

dotenv.config();

const app = express();
app.use(express.json());

// Rutas de prueba
app.post('/', auth(['admin', 'editor']), crearLibro);
app.get('/', obtenerLibros);
app.get('/:id', obtenerLibroPorId);
app.put('/:id', auth(['admin', 'editor']), actualizarLibro);
app.delete('/:id', auth(['admin']), inhabilitarLibro);

describe('Libros Controller', () => {
  let mongoUri;
  let adminToken;
  let editorToken;

  beforeAll(async () => {
    mongoUri = process.env.MONGO_URI_TEST || process.env.MONGO_URI;
    if (mongoUri) {
      await mongoose.connect(mongoUri);
    }

    // Crear tokens para pruebas
    adminToken = jwt.sign(
      { id: new mongoose.Types.ObjectId(), rol: 'admin', nombre: 'Admin' },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    editorToken = jwt.sign(
      { id: new mongoose.Types.ObjectId(), rol: 'editor', nombre: 'Editor' },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    await Libro.deleteMany({});
  });

  describe('crearLibro', () => {
    test('debe crear un libro exitosamente', async () => {
      const nuevoLibro = {
        titulo: 'El Quijote',
        autor: 'Miguel de Cervantes',
        genero: 'Novela',
        casa_editorial: 'Editorial Test',
        disponible: true
      };

      const response = await request(app)
        .post('/')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(nuevoLibro);

      expect(response.status).toBe(201);
      expect(response.body.titulo).toBe(nuevoLibro.titulo);
      expect(response.body.autor).toBe(nuevoLibro.autor);
    });

    test('debe fallar cuando falta el título', async () => {
      const libroIncompleto = {
        autor: 'Autor Test'
      };

      const response = await request(app)
        .post('/')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(libroIncompleto);

      expect(response.status).toBe(400);
      expect(response.body.msg).toContain('requeridos');
    });

    test('debe fallar cuando falta el autor', async () => {
      const libroIncompleto = {
        titulo: 'Título Test'
      };

      const response = await request(app)
        .post('/')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(libroIncompleto);

      expect(response.status).toBe(400);
      expect(response.body.msg).toContain('requeridos');
    });

    test('debe fallar cuando el libro ya existe', async () => {
      const libro = new Libro({
        titulo: 'Libro Duplicado',
        autor: 'Autor Test',
        casa_editorial: 'Editorial Test'
      });
      await libro.save();

      const response = await request(app)
        .post('/')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          titulo: 'Libro Duplicado',
          autor: 'Autor Test',
          casa_editorial: 'Editorial Test'
        });

      expect(response.status).toBe(400);
      expect(response.body.msg).toContain('Ya existe un libro');
    });

    test('debe fallar sin token de autenticación', async () => {
      const response = await request(app)
        .post('/')
        .send({
          titulo: 'Libro Test',
          autor: 'Autor Test'
        });

      expect(response.status).toBe(401);
    });

    test('debe fallar con rol no autorizado', async () => {
      const lectorToken = jwt.sign(
        { id: new mongoose.Types.ObjectId(), rol: 'lector', nombre: 'Lector' },
        process.env.JWT_SECRET,
        { expiresIn: '8h' }
      );

      const response = await request(app)
        .post('/')
        .set('Authorization', `Bearer ${lectorToken}`)
        .send({
          titulo: 'Libro Test',
          autor: 'Autor Test'
        });

      expect(response.status).toBe(403);
    });
  });

  describe('obtenerLibros', () => {
    beforeEach(async () => {
      await Libro.insertMany([
        {
          titulo: 'Libro 1',
          autor: 'Autor 1',
          genero: 'Ficción',
          disponible: true,
          activo: true
        },
        {
          titulo: 'Libro 2',
          autor: 'Autor 2',
          genero: 'Drama',
          disponible: true,
          activo: true
        },
        {
          titulo: 'Libro 3',
          autor: 'Autor 1',
          genero: 'Ficción',
          disponible: false,
          activo: true
        }
      ]);
    });

    test('debe obtener todos los libros exitosamente', async () => {
      const response = await request(app)
        .get('/');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('libros');
      expect(response.body).toHaveProperty('total_libros');
      expect(response.body.libros.length).toBeGreaterThan(0);
    });

    test('debe filtrar por género', async () => {
      const response = await request(app)
        .get('/')
        .query({ genero: 'Ficción' });

      expect(response.status).toBe(200);
      expect(response.body.libros.every(libro => libro.genero === 'Ficción')).toBe(true);
    });

    test('debe filtrar por autor', async () => {
      const response = await request(app)
        .get('/?autor=Autor 1');

      expect(response.status).toBe(200);
      expect(response.body.libros.every(libro => libro.autor === 'Autor 1')).toBe(true);
    });

    test('debe filtrar por disponibilidad', async () => {
      const response = await request(app)
        .get('/?disponible=true');

      expect(response.status).toBe(200);
      expect(response.body.libros.every(libro => libro.disponible === true)).toBe(true);
    });

    test('debe paginar correctamente', async () => {
      const response = await request(app)
        .get('/?page=1&limit=2');

      expect(response.status).toBe(200);
      expect(response.body.libros.length).toBeLessThanOrEqual(2);
      expect(response.body.pagina_actual).toBe(1);
    });

    test('debe manejar parámetros de paginación inválidos', async () => {
      const response = await request(app)
        .get('/?page=-1&limit=5');

      expect([200, 400, 500]).toContain(response.status);
    });

    test('debe manejar límite inválido', async () => {
      const response = await request(app)
        .get('/?page=1&limit=abc');

      expect([200, 400]).toContain(response.status);
    });
  });

  describe('obtenerLibroPorId', () => {
    let libroId;

    beforeEach(async () => {
      await Libro.deleteMany({ titulo: 'Libro Test' });
      
      const libro = new Libro({
        titulo: 'Libro Test',
        autor: 'Autor Test',
        disponible: true,
        activo: true
      });
      await libro.save();
      libroId = libro._id.toString();
    });

    test('debe obtener un libro por ID exitosamente', async () => {
      const response = await request(app)
        .get(`/${libroId}`);

      expect(response.status).toBe(200);
      expect(response.body.titulo).toBe('Libro Test');
      expect(response.body._id.toString()).toBe(libroId);
    });

    test('debe fallar con ID inválido', async () => {
      const response = await request(app)
        .get('/id_invalido');

      expect(response.status).toBe(400);
      expect(response.body.msg).toBe('ID de libro inválido');
    });

    test('debe fallar cuando el libro no existe', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .get(`/${fakeId}`);

      expect(response.status).toBe(404);
      expect(response.body.msg).toBe('Libro no encontrado');
    });

    test('debe fallar cuando el libro está inhabilitado', async () => {
      const libro = await Libro.findById(libroId);
      libro.activo = false;
      await libro.save();

      const response = await request(app)
        .get(`/${libroId}`);

      expect(response.status).toBe(404);
      expect(response.body.msg).toBe('Libro no encontrado');
    });
  });

  describe('actualizarLibro', () => {
    let libroId;

    beforeEach(async () => {
      await Libro.deleteMany({ titulo: 'Libro Original' });
      
      const libro = new Libro({
        titulo: 'Libro Original',
        autor: 'Autor Original',
        activo: true
      });
      await libro.save();
      libroId = libro._id.toString();
    });

    test('debe actualizar un libro exitosamente', async () => {
      const libro = await Libro.findById(libroId);
      expect(libro).not.toBeNull();

      const response = await request(app)
        .put(`/${libroId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          titulo: 'Libro Actualizado'
        });

      expect(response.status).toBe(200);
      expect(response.body.msg).toBe('Libro actualizado');
      expect(response.body.libro.titulo).toBe('Libro Actualizado');
    });

    test('debe fallar sin token de autenticación', async () => {
      const response = await request(app)
        .put(`/${libroId}`)
        .send({
          titulo: 'Libro Actualizado'
        });

      expect(response.status).toBe(401);
    });

    test('debe fallar con rol no autorizado', async () => {
      const lectorToken = jwt.sign(
        { id: new mongoose.Types.ObjectId(), rol: 'lector', nombre: 'Lector' },
        process.env.JWT_SECRET,
        { expiresIn: '8h' }
      );

      const response = await request(app)
        .put(`/${libroId}`)
        .set('Authorization', `Bearer ${lectorToken}`)
        .send({
          titulo: 'Libro Actualizado'
        });

      expect(response.status).toBe(403);
    });

    test('debe fallar cuando el libro no existe', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .put(`/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          titulo: 'Libro Actualizado'
        });

      expect(response.status).toBe(404);
      expect(response.body.msg).toBe('Libro no encontrado');
    });
  });

  describe('inhabilitarLibro', () => {
    let libroId;

    beforeEach(async () => {
      const libro = new Libro({
        titulo: 'Libro a Inhabilitar',
        autor: 'Autor Test',
        activo: true
      });
      await libro.save();
      libroId = libro._id.toString();
    });

    test('debe inhabilitar un libro exitosamente', async () => {
      const response = await request(app)
        .delete(`/${libroId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.msg).toBe('Libro inhabilitado');

      const libro = await Libro.findById(libroId);
      expect(libro.activo).toBe(false);
    });

    test('debe fallar sin token de autenticación', async () => {
      const response = await request(app)
        .delete(`/${libroId}`);

      expect(response.status).toBe(401);
    });

    test('debe fallar con rol no autorizado (solo admin)', async () => {
      const response = await request(app)
        .delete(`/${libroId}`)
        .set('Authorization', `Bearer ${editorToken}`);

      expect(response.status).toBe(403);
    });

    test('debe fallar cuando el libro no existe', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .delete(`/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
      expect(response.body.msg).toBe('Libro no encontrado');
    });
  });
});

