import express from "express";

import {
  loginUser,
  signupUser,
  requestSignupOtp,
  verifySignupOtp,
  requestForgotPasswordOtp,
  verifyForgotPasswordOtp,
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
router.post("/signup/request-otp", requestSignupOtp);
router.post("/signup/verify-otp", verifySignupOtp);
router.post(
  "/forgot-password/request-otp",
  requestForgotPasswordOtp
);
router.post(
  "/forgot-password/verify-otp",
  verifyForgotPasswordOtp
);

router.use(protect);
router.get("/", authorizeRoles("admin"), getAlUsers);
router.get("/user/:id", authorizeRoles("admin"), getUserById);
router.put("/user/:id", authorizeRoles("admin"), updateUser);
router.delete("/user/:id", authorizeRoles("admin"), deleteUser);
router.get("/:userId", authorizeRoles("admin"), getUserShop);

export default router;