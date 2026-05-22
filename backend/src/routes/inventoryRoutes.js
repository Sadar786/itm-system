import express from 'express'
const router = express.Router();

import { protect } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js";
import {
  addInventory,
  getCurrentInventory,
  getInventoryById,
  updateInventory,
  deleteInventory,
} from "../controllers/inventoryController.js";

router.use(protect);

router.post("/in", authorizeRoles("admin", "shop_keeper"), addInventory);
router.get("/current", authorizeRoles("admin", "shop_keeper"), getCurrentInventory);
router.get("/:id", authorizeRoles("admin", "shop_keeper"), getInventoryById);
router.put("/:id", authorizeRoles("admin"), updateInventory);
router.delete("/:id", authorizeRoles("admin"), deleteInventory);

export default router;

// =========================
