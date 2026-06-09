import express from 'express';

const router = express.Router();
import {createShop, getAllShops, getSingleShop, updateShop, deleteShop, getTransferDestinationShops} from "../controllers/shopController.js";
import { protect } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js";


// create shop
router.use(protect);

router.post("/create", authorizeRoles("admin", "shop_keeper"), createShop);
router.get("/all", authorizeRoles("admin", "shop_keeper"), getAllShops);
router.get("/transfer-destinations", protect, getTransferDestinationShops);
router.get("/single/:id", authorizeRoles("admin", "shop_keeper"), getSingleShop);
router.put("/update/:id", authorizeRoles("admin", "shop_keeper"), updateShop);
router.delete("/delete/:id", authorizeRoles("admin"), deleteShop);

export default router;
