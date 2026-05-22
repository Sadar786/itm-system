import express from "express";
import { resetAndSeedDatabase } from "../controllers/devController.js";

const router = express.Router();

router.post("/reset-seed", resetAndSeedDatabase);

export default router;
