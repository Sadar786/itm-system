// src/routes/transferRoutes.js

import express from "express";

import {
  createTransfer,
  getAllTransfers,
  getTransferById,
  deleteTransfer,
  markTransferDelivered,
  cancelTransfer,
} from "../controllers/transferController.js";

import { protect } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js";

const router = express.Router();

router.post(
  "/",
  protect,
  authorizeRoles("admin", "shop_keeper"),
  createTransfer
);

router.get(
  "/",
  protect,
  authorizeRoles("admin", "shop_keeper"),
  getAllTransfers
);

router.get(
  "/:id",
  protect,
  authorizeRoles("admin", "shop_keeper"),
  getTransferById
);

// Receiver actions
router.patch(
  "/:id/deliver",
  protect,
  authorizeRoles("shop_keeper"),
  markTransferDelivered
);

//cecel action
router.patch(
  "/:id/cancel",
  protect,
  authorizeRoles("shop_keeper"),
  cancelTransfer
);


router.delete(
  "/:id",
  protect,
  authorizeRoles("admin"),
  deleteTransfer
);


export default router;
