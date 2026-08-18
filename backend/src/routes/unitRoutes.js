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

// Authentication required for all routes
router.use(protect);

// =========================
// READ ROUTES
// Admin + Shop Keeper
// =========================

router.get("/", authorizeRoles("admin", "shop_keeper"), getUnits);

router.get("/:id", authorizeRoles("admin", "shop_keeper"), getOneUnit);

// =========================
// ADMIN ONLY
// =========================

// Create Unit
router.post(
  "/create",
  authorizeRoles("admin"),
  createUnit
);

// Update Unit
router.put(
  "/update/:id",
  authorizeRoles("admin"),
  updateUnit
);

// Delete Unit
router.delete(
  "/delete/:id",
  authorizeRoles("admin"),
  deleteUnit
);

export default router;