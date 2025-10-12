import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();

export const auth = (roles = []) => {
  return (req, res, next) => {
    const header = req.headers.authorization || "";
    const token = header.split(" ")[1];
    if (!token) return res.status(401).json({ msg: "Token requerido" });

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded;

      if (roles.length && !roles.includes(decoded.rol)) {
        return res.status(403).json({ msg: "No autorizado" });
      }

      next();
    } catch (err) {
      return res.status(401).json({ msg: "Token inválido" });
    }
  };
};
