import express from 'express';

const router = express.Router();
import {createShop, getAllShops, getSingleShop, updateShop, deleteShop} from "../controllers/shopController.js";
import { protect } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js";


// create shop
router.post("/create",protect, authorizeRoles("shop_keeper"), createShop);
router.get("/all", getAllShops);
router.get("/single/:id", getSingleShop);
router.put("/update/:id",protect, updateShop);
router.delete("/delete/:id", deleteShop);

export default router;