import express from "express";
import cors from "cors";
import AppError from "./utils/AppError.js";
import errorMiddleware from "./middleware/errorMiddleware.js";
import authRoutes from "./routes/authRoutes.js";
import shopRoutes from "./routes/shopRoutes.js";
import productRoutes from "./routes/productRoutes.js";
import inventoryRoutes from "./routes/inventoryRoutes.js";
import transferRoutes from "./routes/transferRoutes.js";
import wasteItemRoutes from "./routes/wasteItemRoutes.js";
import reportRoutes from "./routes/reportRoutes.js";
import devRoutes from "./routes/devRoutes.js";
import metaRoutes from "./routes/metaRoutes.js";

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/shops", shopRoutes);
app.use("/api/products", productRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/transfers", transferRoutes);
app.use("/api/waste_items", wasteItemRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/meta", metaRoutes);
app.use("/api/dev", devRoutes);

app.get("/", (req, res) => {
  res.json({ message: "API running" });
});

app.get("/error", (req, res, next) => {
  next(new AppError("Test error route", 400));
});

app.all("*", (req, res, next) => {
  next(new AppError("Route not found", 404));
});

app.use(errorMiddleware);

export default app;
