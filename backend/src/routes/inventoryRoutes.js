import express from 'express'
const router = express.Router();

import {
  addInventory,
  getCurrentInventory,
  getInventoryById,
  updateInventory,
  deleteInventory,
} from "../controllers/inventoryController.js";

router.post("/in", addInventory);
router.get("/current", getCurrentInventory);
router.get("/:id", getInventoryById);
router.put("/:id", updateInventory);
router.delete("/:id", deleteInventory);

export default router;

// =========================