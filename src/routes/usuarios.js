import express from "express";
import { auth } from "../middleware/auth.js";
import {
  registrarUsuario,
  loginUsuario,
  obtenerPerfil,
  actualizarUsuario,
  inhabilitarUsuario
} from "../controllers/usuariosController.js";

const router = express.Router();

router.post("/register", registrarUsuario);
router.post("/login", loginUsuario);
router.get("/me", auth(), obtenerPerfil);
router.put("/:id", auth(), actualizarUsuario);
router.delete("/:id", auth(), inhabilitarUsuario);

export default router;
