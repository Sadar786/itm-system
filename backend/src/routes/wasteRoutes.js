import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js";
import { createWaste, getWastes, getWaste, exportWastes, updateWasteStatus, deleteWaste } from "../controllers/wasteController.js";

const router = express.Router();
router.use(protect, authorizeRoles("admin", "shop_keeper"));
router.post("/", createWaste);
router.get("/", getWastes);
router.get("/export", exportWastes);
router.get("/:id", getWaste);
router.patch("/:id/status", authorizeRoles("admin"), updateWasteStatus);
router.delete("/:id", authorizeRoles("admin"), deleteWaste);
export default router;
