import express from "express";
import Reserva from "../models/Reserva.js";
import Libro from "../models/Libro.js";
import { auth } from "../middleware/auth.js";

const router = express.Router();

// create reserva
router.post("/", auth(), async (req, res) => {
  try {
    const { libro: libroId, fecha_entrega } = req.body;
    const libro = await Libro.findById(libroId);
    if (!libro || !libro.activo) return res.status(404).json({ msg: "Libro no disponible" });

    const reserva = new Reserva({
      usuario: req.user.id,
      libro: libroId,
      fecha_entrega
    });
    await reserva.save();

    res.status(201).json(reserva);
  } catch (err) {
    res.status(500).json({ msg: "Error al crear reserva", error: err.message });
  }
});

// historial reserva id usuario
router.get("/usuario/:id", auth(), async (req, res) => {
  try {
    if (req.user.id !== req.params.id && req.user.rol !== "admin") {
      return res.status(403).json({ msg: "No autorizado" });
    }
    
    const reservas = await Reserva.find({ usuario: req.params.id })
      .populate("libro", "titulo autor")
      .select("libro fecha_reserva fecha_entrega createdAt");
    
    const historialFormateado = reservas.map(reserva => ({
      nombre_libro: reserva.libro.titulo,
      fecha_reserva: reserva.fecha_reserva,
      fecha_entrega: reserva.fecha_entrega,
      fecha_creacion: reserva.createdAt
    }));
    
    res.json(historialFormateado);
  } catch (err) {
    res.status(500).json({ msg: "Error al obtener historial", error: err.message });
  }
});

// historial reservas id libro
router.get("/libro/:id", auth(["admin"]), async (req, res) => {
  try {
    const reservas = await Reserva.find({ libro: req.params.id })
      .populate("usuario", "nombre email")
      .select("usuario fecha_reserva fecha_entrega createdAt");
    
    const historialFormateado = reservas.map(reserva => ({
      nombre_usuario: reserva.usuario.nombre,
      fecha_reserva: reserva.fecha_reserva,
      fecha_entrega: reserva.fecha_entrega,
      fecha_creacion: reserva.createdAt
    }));
    
    res.json(historialFormateado);
  } catch (err) {
    res.status(500).json({ msg: "Error al obtener historial", error: err.message });
  }
});

export default router;
