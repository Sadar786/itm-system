import express from "express";
import { getCategories, getUnits } from "../controllers/metaController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);
router.get("/categories", getCategories);
router.get("/units", getUnits);

export default router;
