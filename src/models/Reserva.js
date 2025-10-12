import mongoose from "mongoose";

const reservaSchema = new mongoose.Schema({
  usuario: { type: mongoose.Schema.Types.ObjectId, ref: "Usuario", required: true },
  libro: { type: mongoose.Schema.Types.ObjectId, ref: "Libro", required: true },
  fecha_reserva: { type: Date, default: Date.now },
  fecha_entrega: { type: Date },
}, { timestamps: true });

export default mongoose.model("Reserva", reservaSchema);
