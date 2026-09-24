import express from "express";
import analyticsRoutes from "./routes/analyticsRoutes.js";
import cors from "cors";
import AppError from "./utils/AppError.js";
import errorMiddleware from "./middleware/errorMiddleware.js";
import authRoutes from "./routes/authRoutes.js";
import shopRoutes from "./routes/shopRoutes.js";
import productRoutes from "./routes/productRoutes.js";
import inventoryRoutes from "./routes/inventoryRoutes.js";
import transferRoutes from "./routes/transferRoutes.js";
import wasteRoutes from "./routes/wasteRoutes.js";
import reportRoutes from "./routes/reportRoutes.js";
import devRoutes from "./routes/devRoutes.js";
import metaRoutes from "./routes/metaRoutes.js";
import unitRoutes from "./routes/unitRoutes.js";

const app = express();

app.use(cors());
// A selection of 10,000 product IDs exceeds the default 100 KB JSON limit.
app.delete("/api/products/bulk", express.json({ limit: "512kb" }));
// Allow the same maximum selection size for wastage deletion.
app.delete("/api/wastes/bulk", express.json({ limit: "512kb" }));
app.use(express.json());
app.use("/api/analytics", analyticsRoutes);

app.use("/api/auth", authRoutes);
app.use("/api/shops", shopRoutes);
app.use("/api/products", productRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/transfers", transferRoutes);
app.use("/api/wastes", wasteRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/meta", metaRoutes);
app.use("/api/dev", devRoutes);
app.use("/api/units", unitRoutes);

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
