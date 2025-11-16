import Usuario from "../models/Usuario.js";
import jwt from "jsonwebtoken";

export const registrarUsuario = async (req, res) => {
  try {
    const { nombre, email, password, rol } = req.body;
    
    if (!nombre || !email || !password) {
      return res.status(400).json({ 
        msg: "Nombre, email y password son requeridos" 
      });
    }

    const exist = await Usuario.findOne({ email });
    if (exist) {
      return res.status(400).json({ msg: "Email ya registrado" });
    }

    const nuevoUsuario = new Usuario({ nombre, email, password, rol });
    await nuevoUsuario.save();
    
    res.status(201).json({ 
      msg: "Usuario creado exitosamente",
      usuario: {
        id: nuevoUsuario._id,
        nombre: nuevoUsuario.nombre,
        email: nuevoUsuario.email,
        rol: nuevoUsuario.rol
      }
    });
  } catch (err) {
    res.status(400).json({ 
      msg: "Error al crear usuario", 
      error: err.message 
    });
  }
};

export const loginUsuario = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ 
        msg: "Email y password son requeridos" 
      });
    }

    const usuario = await Usuario.findOne({ email, activo: true });
    if (!usuario) {
      return res.status(404).json({ msg: "Usuario no encontrado" });
    }

    const valido = await usuario.compararPassword(password);
    if (!valido) {
      return res.status(401).json({ msg: "Contraseña incorrecta" });
    }

    const token = jwt.sign(
      { id: usuario._id, rol: usuario.rol, nombre: usuario.nombre },
      process.env.JWT_SECRET,
      { expiresIn: "8h" }
    );

    res.json({ 
      token,
      usuario: {
        id: usuario._id,
        nombre: usuario.nombre,
        email: usuario.email,
        rol: usuario.rol
      }
    });
  } catch (err) {
    res.status(500).json({ 
      msg: "Error en login", 
      error: err.message 
    });
  }
};

export const obtenerPerfil = async (req, res) => {
  try {
    const usuario = await Usuario.findById(req.user.id).select("-password");
    if (!usuario) {
      return res.status(404).json({ msg: "Usuario no encontrado" });
    }
    res.json(usuario);
  } catch (err) {
    res.status(500).json({ 
      msg: "Error al obtener usuario",
      error: err.message 
    });
  }
};

export const actualizarUsuario = async (req, res) => {
  try {
    if (req.user.id !== req.params.id && req.user.rol !== "admin") {
      return res.status(403).json({ msg: "No autorizado" });
    }

    const updateData = { ...req.body };
    delete updateData.password; 
    
    const usuario = await Usuario.findByIdAndUpdate(
      req.params.id, 
      updateData, 
      { new: true, runValidators: true }
    ).select("-password");
    
    if (!usuario) {
      return res.status(404).json({ msg: "Usuario no encontrado" });
    }

    res.json({ 
      msg: "Usuario actualizado",
      usuario 
    });
  } catch (err) {
    res.status(500).json({ 
      msg: "Error al actualizar usuario", 
      error: err.message 
    });
  }
};

export const inhabilitarUsuario = async (req, res) => {
  try {
    if (req.user.id !== req.params.id && req.user.rol !== "admin") {
      return res.status(403).json({ msg: "No autorizado" });
    }

    const usuario = await Usuario.findByIdAndUpdate(
      req.params.id, 
      { activo: false },
      { new: true }
    );
    
    if (!usuario) {
      return res.status(404).json({ msg: "Usuario no encontrado" });
    }

    res.json({ msg: "Usuario inhabilitado" });
  } catch (err) {
    res.status(500).json({ 
      msg: "Error al inhabilitar usuario", 
      error: err.message 
    });
  }
};
