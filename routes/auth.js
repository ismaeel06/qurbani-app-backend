const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const {
  register,
  login,
  getMe,
  updateProfile,
  changePassword,
  verifyOTP,
} = require("../controllers/authController");

router.post("/register", register);
router.post("/login", login);
router.get("/me", auth, getMe);
router.put("/update-profile", auth, updateProfile);
router.put("/change-password", auth, changePassword);
router.post("/verify-otp", verifyOTP);

module.exports = router;