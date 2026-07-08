import express from "express";
import {
  createUnit,
  getUnits,
  getOneUnit,
  updateUnit,
  deleteUnit,
} from "../controllers/unitController.js";
import { protect } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js";

const router = express.Router();

// Protect all routes
router.use(protect);

// Admin only
router.use(authorizeRoles("admin"));

// =========================
// CRUD Routes
// =========================

// Create Unit
router.post("/create", createUnit);

// Get All Units
router.get("/", getUnits);

// Get One Unit
router.get("/:id", getOneUnit);

// Update Unit
router.put("/update/:id", updateUnit);

// Delete Unit
router.delete("/delete/:id", deleteUnit);

export default router;