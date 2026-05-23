import express from "express";
import {
  exportCurrentStock,
  exportMovements,
  exportTransferMatrix,
  getCurrentStock,
  getMovements,
} from "../controllers/reportController.js";
import { protect } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js";

const router = express.Router();

router.use(protect);
router.use(authorizeRoles("admin", "shop_keeper"));

router.get("/current-stock", getCurrentStock);
router.get("/current-stock/export", exportCurrentStock);
router.get("/movements", getMovements);
router.get("/movements/export", exportMovements);
router.get("/transfers/export", exportTransferMatrix);

export default router;
