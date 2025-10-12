import mongoose from "mongoose";

const libroSchema = new mongoose.Schema({
  titulo: { type: String, required: true },
  autor: { type: String, required: true },
  genero: { type: String },
  fecha_publicacion: { type: Date },
  casa_editorial: { type: String },
  disponible: { type: Boolean, default: true },
  activo: { type: Boolean, default: true },
}, { timestamps: true });

//evitar repetidos
libroSchema.index({ titulo: 1, autor: 1, casa_editorial: 1 }, { unique: true });

export default mongoose.model("Libro", libroSchema);
