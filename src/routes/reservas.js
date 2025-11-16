import express from "express";
import { auth } from "../middleware/auth.js";
import {
  crearReserva,
  obtenerHistorialPorUsuario,
  obtenerHistorialPorLibro
} from "../controllers/reservasController.js";

const router = express.Router();

router.post("/", auth(), crearReserva);
router.get("/usuario/:id", auth(), obtenerHistorialPorUsuario);
router.get("/libro/:id", auth(["admin"]), obtenerHistorialPorLibro);

export default router;
