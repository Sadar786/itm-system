import express from "express";
import { loginUser, signupUser, getAlUsers , getUserById,updateUser, deleteUser, getUserShop} from "../controllers/authController.js";

import { protect } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js";

const router = express.Router();


// ADMIN ONLY
// router.use(
//   protect,
//   authorizeRoles("admin")
// );


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

router.get("/" , getAlUsers);
router.post("/login" , loginUser);
router.post("/signup", signupUser);
router.get("/user/:id", getUserById);
router.put("/user/:id",  updateUser);
router.delete("/user/:id", deleteUser);
router.get("/:userId", getUserShop);
export default router;