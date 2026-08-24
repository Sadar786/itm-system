import express from 'express';
import {
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  getOneProduct,
  importProducts,
} from "../controllers/productController.js";
import { protect } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js";
import { uploadExcel } from "../middleware/uploadMiddleware.js";

const router = express.Router();

// GET ALL PRODUCTS
router.get('/', protect, getProducts);
router.get('/single/:id', protect, getOneProduct);
// CREATE A NEW PRODUCT
router.post('/create', protect, authorizeRoles("admin"), createProduct);
//upload
router.post(
  "/import",
  protect,
  authorizeRoles("admin"),
  uploadExcel.single("file"),
  importProducts
);
// UPDATE A PRODUCT
router.put('/update/:id', protect, authorizeRoles("admin"), updateProduct);
// DELETE A PRODUCT
router.delete('/delete/:id', protect, authorizeRoles("admin"), deleteProduct);


export default router;
