import Reserva from "../models/Reserva.js";
import Libro from "../models/Libro.js";

export const crearReserva = async (req, res) => {
  try {
    const { libro: libroId, fecha_entrega } = req.body;
    
    if (!libroId) {
      return res.status(400).json({ 
        msg: "ID de libro es requerido" 
      });
    }
    
    const libro = await Libro.findById(libroId);
    if (!libro || !libro.activo) {
      return res.status(404).json({ 
        msg: "Libro no disponible" 
      });
    }
    
    if (!libro.disponible) {
      return res.status(400).json({ 
        msg: "El libro no está disponible para reserva" 
      });
    }

    const reserva = new Reserva({
      usuario: req.user.id,
      libro: libroId,
      fecha_entrega
    });
    await reserva.save();
    
    await Libro.findByIdAndUpdate(libroId, { disponible: false });

    res.status(201).json(reserva);
  } catch (err) {
    if (err.name === 'CastError') {
      return res.status(400).json({ 
        msg: "ID de libro inválido" 
      });
    }
    res.status(500).json({ 
      msg: "Error al crear reserva", 
      error: err.message 
    });
  }
};

export const obtenerHistorialPorUsuario = async (req, res) => {
  try {
    if (req.user.id !== req.params.id && req.user.rol !== "admin") {
      return res.status(403).json({ msg: "No autorizado" });
    }
    
    const reservas = await Reserva.find({ usuario: req.params.id })
      .populate("libro", "titulo autor")
      .select("libro fecha_reserva fecha_entrega createdAt");
    
    if (reservas.length === 0) {
      return res.json({ 
        msg: "No se encontraron reservas para este usuario",
        reservas: [] 
      });
    }
    
    const historialFormateado = reservas
      .filter(reserva => reserva.libro) 
      .map(reserva => ({
        nombre_libro: reserva.libro.titulo,
        fecha_reserva: reserva.fecha_reserva,
        fecha_entrega: reserva.fecha_entrega,
        fecha_creacion: reserva.createdAt
      }));
    
    res.json(historialFormateado);
  } catch (err) {
    if (err.name === 'CastError') {
      return res.status(400).json({ 
        msg: "ID de usuario inválido" 
      });
    }
    res.status(500).json({ 
      msg: "Error al obtener historial", 
      error: err.message 
    });
  }
};

export const obtenerHistorialPorLibro = async (req, res) => {
  try {
    const reservas = await Reserva.find({ libro: req.params.id })
      .populate("usuario", "nombre email")
      .select("usuario fecha_reserva fecha_entrega createdAt");
    
    if (reservas.length === 0) {
      return res.json({ 
        msg: "No se encontraron reservas para este libro",
        reservas: [] 
      });
    }
    
    const historialFormateado = reservas
      .filter(reserva => reserva.usuario) 
      .map(reserva => ({
        nombre_usuario: reserva.usuario.nombre,
        email_usuario: reserva.usuario.email,
        fecha_reserva: reserva.fecha_reserva,
        fecha_entrega: reserva.fecha_entrega,
        fecha_creacion: reserva.createdAt
      }));
    
    res.json(historialFormateado);
  } catch (err) {
    if (err.name === 'CastError') {
      return res.status(400).json({ 
        msg: "ID de libro inválido" 
      });
    }
    res.status(500).json({ 
      msg: "Error al obtener historial", 
      error: err.message 
    });
  }
};

