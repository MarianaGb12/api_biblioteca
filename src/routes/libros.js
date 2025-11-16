import express from "express";
import { auth } from "../middleware/auth.js";
import {
  crearLibro,
  obtenerLibros,
  obtenerLibroPorId,
  actualizarLibro,
  inhabilitarLibro
} from "../controllers/librosController.js";

const router = express.Router();

router.post("/", auth(["admin", "editor"]), crearLibro);
router.get("/", obtenerLibros);
router.get("/:id", obtenerLibroPorId);
router.put("/:id", auth(["admin", "editor"]), actualizarLibro);
router.delete("/:id", auth(["admin"]), inhabilitarLibro);

export default router;
