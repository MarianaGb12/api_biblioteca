import Libro from "../models/Libro.js";

export const crearLibro = async (req, res) => {
  try {
    const { titulo, autor, casa_editorial } = req.body;
    
    if (!titulo || !autor) {
      return res.status(400).json({ 
        msg: "Título y autor son requeridos" 
      });
    }
    
    const libroExistente = await Libro.findOne({ 
      titulo: titulo, 
      autor: autor, 
      casa_editorial: casa_editorial,
      activo: true 
    });
    
    if (libroExistente) {
      return res.status(400).json({ 
        msg: "Ya existe un libro con este título, autor y editorial", 
        libro_existente: {
          id: libroExistente._id,
          titulo: libroExistente.titulo,
          autor: libroExistente.autor,
          casa_editorial: libroExistente.casa_editorial
        }
      });
    }
    
    const libro = new Libro(req.body);
    await libro.save();
    res.status(201).json(libro);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ 
        msg: "Ya existe un libro con este título, autor y editorial",
        error: "Libro duplicado"
      });
    }
    res.status(400).json({ 
      msg: "Error al crear libro", 
      error: err.message 
    });
  }
};

export const obtenerLibros = async (req, res) => {
  try {
    const { 
      genero, 
      autor, 
      casa_editorial, 
      titulo, 
      disponible, 
      fecha_publicacion, 
      page = 1, 
      limit = 5 
    } = req.query;
    
    const filtros = { activo: true };
    if (genero) filtros.genero = genero;
    if (autor) filtros.autor = autor;
    if (casa_editorial) filtros.casa_editorial = casa_editorial;
    if (titulo) filtros.titulo = new RegExp(titulo, "i");
    if (disponible !== undefined) filtros.disponible = disponible === "true";
    if (fecha_publicacion) filtros.fecha_publicacion = new Date(fecha_publicacion);

    const skip = (Number(page) - 1) * Number(limit);
    const [libros, total] = await Promise.all([
      Libro.find(filtros).skip(skip).limit(Number(limit)),
      Libro.countDocuments(filtros)
    ]);

    res.json({
      libros,
      pagina_actual: Number(page),
      paginas_totales: Math.ceil(total / limit),
      libros_por_pagina: Number(limit),
      total_libros: total
    });
  } catch (err) {
    res.status(500).json({ 
      msg: "Error al obtener libros", 
      error: err.message 
    });
  }
};

export const obtenerLibroPorId = async (req, res) => {
  try {
    const libro = await Libro.findById(req.params.id);
    if (!libro || !libro.activo) {
      return res.status(404).json({ msg: "Libro no encontrado" });
    }
    res.json(libro);
  } catch (err) {
    if (err.name === 'CastError') {
      return res.status(400).json({ 
        msg: "ID de libro inválido" 
      });
    }
    res.status(500).json({ 
      msg: "Error al obtener libro", 
      error: err.message 
    });
  }
};

export const actualizarLibro = async (req, res) => {
  try {
    const libro = await Libro.findByIdAndUpdate(
      req.params.id, 
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!libro) {
      return res.status(404).json({ msg: "Libro no encontrado" });
    }
    
    res.json({ 
      msg: "Libro actualizado",
      libro 
    });
  } catch (err) {
    if (err.name === 'CastError') {
      return res.status(400).json({ 
        msg: "ID de libro inválido" 
      });
    }
    res.status(500).json({ 
      msg: "Error al actualizar libro", 
      error: err.message 
    });
  }
};

export const inhabilitarLibro = async (req, res) => {
  try {
    const libro = await Libro.findByIdAndUpdate(
      req.params.id, 
      { activo: false },
      { new: true }
    );
    
    if (!libro) {
      return res.status(404).json({ msg: "Libro no encontrado" });
    }
    
    res.json({ msg: "Libro inhabilitado" });
  } catch (err) {
    if (err.name === 'CastError') {
      return res.status(400).json({ 
        msg: "ID de libro inválido" 
      });
    }
    res.status(500).json({ 
      msg: "Error al inhabilitar libro", 
      error: err.message 
    });
  }
};

