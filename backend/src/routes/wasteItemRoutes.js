// src/routes/wasteItemRoutes.js
import express from "express";
import {
  createWasteItem,
  getAllWasteItems,
  getWasteItemById,
  updateWasteItem,
  deleteWasteItem,
} from "../controllers/wasteItemController.js";
import { protect } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js";

const router = express.Router();

router.use(protect);

router.post("/", authorizeRoles("admin", "shop_keeper"), createWasteItem);
router.get("/", authorizeRoles("admin", "shop_keeper"), getAllWasteItems);
router.get("/:id", authorizeRoles("admin", "shop_keeper"), getWasteItemById);
router.put("/:id", authorizeRoles("admin"), updateWasteItem);
router.delete("/:id", authorizeRoles("admin"), deleteWasteItem);

export default router;
