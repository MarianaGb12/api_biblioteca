import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import morgan from "morgan";
import connectDB from "./config/db.js";
import usuariosRoutes from "./routes/usuarios.js";
import librosRoutes from "./routes/libros.js";
import reservasRoutes from "./routes/reservas.js";

dotenv.config();
await connectDB();

const app = express();
app.use(express.json());
app.use(cors());
app.use(morgan("dev"));

app.use("/api/usuarios", usuariosRoutes);
app.use("/api/libros", librosRoutes);
app.use("/api/reservas", reservasRoutes);

app.get("/", (req, res) => res.send("Proyecto01 Biblioteca - API funcionando"));

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`🚀 Servidor corriendo en puerto ${PORT}`));
