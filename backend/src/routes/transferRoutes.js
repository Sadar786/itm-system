// src/routes/transferRoutes.js

import express from "express";

import {
  createTransfer,
  getAllTransfers,
  getTransferById,
  deleteTransfer,
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


router.delete(
  "/:id",
  protect,
  authorizeRoles("admin"),
  deleteTransfer
);


export default router;
