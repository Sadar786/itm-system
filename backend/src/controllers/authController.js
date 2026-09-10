import User from "../models/User.js";
import Shop from "../models/Shop.js";
import generateToken from "../utils/generateToken.js";
import EmailVerification from "../models/EmailVerification.js";
import PasswordResetVerification from "../models/PasswordResetVerification.js";
import sendEmail from "../utils/sendEmail.js";


// REQUEST SIGNUP OTP
const requestSignupOtp = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, email and password are required.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check if user already exists
    const existingUser = await User.findOne({
      email: normalizedEmail,
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User already exists.",
      });
    }

    // Generate 4 digit OTP
    const otp = Math.floor(
      1000 + Math.random() * 9000
    ).toString();

    // OTP expires after 10 minutes
    const expiresAt = new Date(
      Date.now() + 10 * 60 * 1000
    );

    // Remove previous OTP
    await EmailVerification.deleteMany({
      email: normalizedEmail,
    });

    // Save temporary signup data
    await EmailVerification.create({
      name: name.trim(),
      email: normalizedEmail,
      password,
      otp,
      expiresAt,
    });

    // Send email
    await sendEmail({
      to: normalizedEmail,
      subject: "Your Prime Gourmet Inventory System verification code",
      text: `Your verification code is ${otp}. This code expires in 10 minutes.`,
      html: `
        <div style="font-family: Arial, sans-serif;">
          <h2>Email Verification</h2>

          <p>Your verification code is:</p>

          <h1 style="letter-spacing: 8px;">
            ${otp}
          </h1>

          <p>This code will <strong>expire in 10 minutes</strong>.</p>

          <p>If you did not request this code, you can ignore this email.</p>
        </div>
      `,
    });

    return res.status(200).json({
      success: true,
      message: "Verification code sent to your email.",
    });

  } catch (error) {
    console.error("Signup OTP error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to send verification email.",
    });
  }
};

// VERIFY SIGNUP OTP
const verifySignupOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: "Email and verification code are required.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const verification = await EmailVerification.findOne({
      email: normalizedEmail,
    });

    if (!verification) {
      return res.status(400).json({
        success: false,
        message: "Verification request not found. Please request a new code.",
      });
    }

    // Check expiry
    if (verification.expiresAt < new Date()) {
      await EmailVerification.deleteOne({
        _id: verification._id,
      });

      return res.status(400).json({
        success: false,
        message: "Verification code has expired.",
      });
    }

    // Check OTP
    if (verification.otp !== otp.toString()) {
      return res.status(400).json({
        success: false,
        message: "Invalid verification code.",
      });
    }

    // Check again that user doesn't exist
    const existingUser = await User.findOne({
      email: normalizedEmail,
    });

    if (existingUser) {
      await EmailVerification.deleteOne({
        _id: verification._id,
      });

      return res.status(400).json({
        success: false,
        message: "User already exists.",
      });
    }

    // Create user ONLY after successful verification
    const user = await User.create({
      name: verification.name,
      email: verification.email,
      password: verification.password,
      role: "shop_keeper",
    });

    // Delete used OTP
    await EmailVerification.deleteOne({
      _id: verification._id,
    });

    return res.status(201).json({
      success: true,

      token: generateToken(user._id),

      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        shopId: user.shopId,
      },

      message: "Email verified and account created successfully.",
    });

  } catch (error) {
    console.error("Verify signup OTP error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// SIGNUP
const signupUser = async (req, res) => {
  try {
    const { name, email, password, shopId } = req.body;
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User already exists",
      });
    }

    // Create new user
    const user = await User.create({
      name,
      email,
      password,
      role: "shop_keeper",
      shopId,
    });

    // Response
    res.status(201).json({
      success: true,
      token: generateToken(user._id),
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        shopId: user.shopId,
      },
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


// LOGIN
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check user

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "user not found",
      });
    }
 
    //check if user is active
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: "User is inactive",
      });
    }

    // Check password
    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // Update last login
    user.lastLoginAt = new Date();
    await user.save();

    // Response
    res.status(200).json({
      success: true,
      token: generateToken(user._id),
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        shopId: user.shopId,
      },
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// FORGOT PASSWORD
// ============================================================
// FORGOT PASSWORD - REQUEST OTP
// ============================================================

const requestForgotPasswordOtp = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check whether the account exists
    const user = await User.findOne({
      email: normalizedEmail,
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "No account found with this email.",
      });
    }

    // Generate 4-digit OTP
    const otp = Math.floor(
      1000 + Math.random() * 9000
    ).toString();

    // OTP expires after 10 minutes
    const expiresAt = new Date(
      Date.now() + 10 * 60 * 1000
    );

    // Remove previous reset OTP
    await PasswordResetVerification.deleteMany({
      email: normalizedEmail,
    });

    // Save OTP
    await PasswordResetVerification.create({
      email: normalizedEmail,
      otp,
      expiresAt,
    });

    // Send email
    await sendEmail({
      to: normalizedEmail,
      subject: "Your Inventory System password reset code",
      text: `Your password reset code is ${otp}. This code expires in 10 minutes.`,
      html: `
        <div style="font-family: Arial, sans-serif;">
          <h2>Password Reset</h2>

          <p>Your password reset verification code is:</p>

          <h1 style="letter-spacing: 8px;">
            ${otp}
          </h1>

          <p>This code will expire in 10 minutes.</p>

          <p>
            If you did not request a password reset,
            you can ignore this email.
          </p>
        </div>
      `,
    });

    return res.status(200).json({
      success: true,
      message: "Password reset code sent to your email.",
    });
  } catch (error) {
    console.error(
      "Forgot password OTP error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Unable to send password reset email.",
    });
  }
};

// ============================================================
// FORGOT PASSWORD - VERIFY OTP
// ============================================================

const verifyForgotPasswordOtp = async (req, res) => {
  try {
    const { email, otp, password } = req.body;

    if (!email || !otp || !password) {
      return res.status(400).json({
        success: false,
        message:
          "Email, verification code and new password are required.",
      });
    }

    if (!/^\d{4}$/.test(otp.toString())) {
      return res.status(400).json({
        success: false,
        message: "Verification code must contain 4 digits.",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message:
          "Password must be at least 6 characters long.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Find reset verification
    const verification =
      await PasswordResetVerification.findOne({
        email: normalizedEmail,
      });

    if (!verification) {
      return res.status(400).json({
        success: false,
        message:
          "Verification request not found. Please request a new code.",
      });
    }

    // Check expiry
    if (verification.expiresAt < new Date()) {
      await PasswordResetVerification.deleteOne({
        _id: verification._id,
      });

      return res.status(400).json({
        success: false,
        message: "Verification code has expired.",
      });
    }

    // Check OTP
    if (verification.otp !== otp.toString()) {
      return res.status(400).json({
        success: false,
        message: "Invalid verification code.",
      });
    }

    // Find user
    const user = await User.findOne({
      email: normalizedEmail,
    });

    if (!user) {
      await PasswordResetVerification.deleteOne({
        _id: verification._id,
      });

      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    // Change password
    user.password = password;

    await user.save();

    // Delete used OTP
    await PasswordResetVerification.deleteOne({
      _id: verification._id,
    });

    return res.status(200).json({
      success: true,
      message:
        "Password updated successfully. You can now log in.",
    });
  } catch (error) {
    console.error(
      "Verify forgot password OTP error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

//GET /api/users
const getAlUsers = async (req, res) => {
  try {
    const users = await User.find().select("-password");
    res.status(200).json({
      success: true,
      users,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

//GET /api/users/:id\
const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }
    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


//PUT /api/users/:id
const updateUser = async (req, res) => {
  try {
    const { name, email, role, shopId } = req.body;
    const user = await User.findByIdAndUpdate(req.params.id, { name, email, role, shopId },
      { returnDocument: "after" }
    ).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Delete /api/user/:id
const deleteUser = async (req, res) => {

  try {

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    user.isActive = false;

    await user.save();

    res.status(200).json({
      success: true,
      message: "User deactivated",
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// getUserShop /api/user/shopid
const getUserShop = async (req, res) => {
  try {

    const { userId } = req.params;

    const user = await User.findById(userId).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const shopId = user.shopId;
    const shop = await Shop.findById(shopId);
    if (!shop) {
      return res.status(404).json({
        success: false,
        message: "Shop not found",
      });
    }

    res.status(200).json({
      success: true,
      shop,
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export {
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
  getUserShop
};