import express from "express";
import {
  forgotPassword,
  loginUser,
  signupUser,
  getAlUsers,
  getUserById,
  updateUser,
  deleteUser,
  getUserShop,
} from "../controllers/authController.js";

import { protect } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js";

const router = express.Router();


router.get(
  "/test",
  protect,
  authorizeRoles("admin"),
  (req, res) => {
    res.json({
      success: true,
      message: "Protected Route",
    });
  }
);

router.post("/login", loginUser);
router.post("/signup", signupUser);
router.post("/forgot-password", forgotPassword);

router.use(protect);

router.get("/", authorizeRoles("admin"), getAlUsers);
router.get("/user/:id", authorizeRoles("admin"), getUserById);
router.put("/user/:id", authorizeRoles("admin"), updateUser);
router.delete("/user/:id", authorizeRoles("admin"), deleteUser);
router.get("/:userId", authorizeRoles("admin"), getUserShop);

export default router;
