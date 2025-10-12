import express from "express";
import Usuario from "../models/Usuario.js";
import jwt from "jsonwebtoken";
import { auth } from "../middleware/auth.js";

const router = express.Router();

// create usuario
router.post("/register", async (req, res) => {
  try {
    const { nombre, email, password, rol } = req.body;
    const exist = await Usuario.findOne({ email });
    if (exist) return res.status(400).json({ msg: "Email ya registrado" });

    const nuevoUsuario = new Usuario({ nombre, email, password, rol });
    await nuevoUsuario.save();
    res.status(201).json({ msg: "Usuario creado exitosamente" });
  } catch (err) {
    res.status(400).json({ msg: "Error al crear usuario", error: err.message });
  }
});

// read usuario
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const usuario = await Usuario.findOne({ email, activo: true });
    if (!usuario) return res.status(404).json({ msg: "Usuario no encontrado" });

    const valido = await usuario.compararPassword(password);
    if (!valido) return res.status(401).json({ msg: "Contraseña incorrecta" });

    const token = jwt.sign(
      { id: usuario._id, rol: usuario.rol, nombre: usuario.nombre },
      process.env.JWT_SECRET,
      { expiresIn: "8h" }
    );

    res.json({ token });
  } catch (err) {
    res.status(500).json({ msg: "Error en login", error: err.message });
  }
});

// read perfil (token-auth)
router.get("/me", auth(), async (req, res) => {
  try {
    const usuario = await Usuario.findById(req.user.id).select("-password");
    if (!usuario) return res.status(404).json({ msg: "Usuario no encontrado" });
    res.json(usuario);
  } catch (err) {
    res.status(500).json({ msg: "Error al obtener usuario" });
  }
});

// update usuario
router.put("/:id", auth(), async (req, res) => {
  try {
    if (req.user.id !== req.params.id && req.user.rol !== "admin")
      return res.status(403).json({ msg: "No autorizado" });

    const updateData = { ...req.body };
    delete updateData.password; // si cambia contraseña, debería implementarse separado
    await Usuario.findByIdAndUpdate(req.params.id, updateData);
    res.json({ msg: "Usuario actualizado" });
  } catch (err) {
    res.status(500).json({ msg: "Error al actualizar usuario", error: err.message });
  }
});

// delete usuario
router.delete("/:id", auth(), async (req, res) => {
  try {
    if (req.user.id !== req.params.id && req.user.rol !== "admin")
      return res.status(403).json({ msg: "No autorizado" });

    await Usuario.findByIdAndUpdate(req.params.id, { activo: false });
    res.json({ msg: "Usuario inhabilitado" });
  } catch (err) {
    res.status(500).json({ msg: "Error al inhabilitar usuario", error: err.message });
  }
});

export default router;
