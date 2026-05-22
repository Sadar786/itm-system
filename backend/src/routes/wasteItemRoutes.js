// src/routes/wasteItemRoutes.js
import express from "express";
import {
  createWasteItem,
  getAllWasteItems,
  getWasteItemById,
  updateWasteItem,
  deleteWasteItem,
} from "../controllers/wasteItemController.js";

const router = express.Router();

router.post("/", createWasteItem);
router.get("/", getAllWasteItems);
router.get("/:id", getWasteItemById);
router.put("/:id", updateWasteItem);
router.delete("/:id", deleteWasteItem);

export default router;