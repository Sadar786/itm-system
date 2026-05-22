import express from 'express';
import { getProducts, createProduct, updateProduct, deleteProduct, getOneProduct } from '../controllers/productController.js';

const router = express.Router();

// GET ALL PRODUCTS
router.get('/', getProducts);
router.get('/single/:id', getOneProduct);
// CREATE A NEW PRODUCT
router.post('/create', createProduct);    
// UPDATE A PRODUCT
router.put('/update/:id', updateProduct);
// DELETE A PRODUCT
router.delete('/delete/:id', deleteProduct);

export default router;