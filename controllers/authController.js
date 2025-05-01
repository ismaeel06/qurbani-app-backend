const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// Register
exports.register = async (req, res) => {
  try {
    const { name, email, password, phone, role } = req.body;

    if (!name || !email || !password) return res.status(400).json({ message: "Missing fields" });

    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: "Email already in use" });

    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Save user with OTP
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ name, email, password: hashedPassword, phone, role, otp, otpExpires, isVerified: false });
    await user.save();

    // Send OTP via SMS
    try {
      if (process.env.NODE_ENV === "development") {
        console.log(`OTP for ${phone}: ${otp}`);
      } else {
        await sendSMS(phone, `Your QurbaniApp verification code is: ${otp}`);
      }
    } catch (smsErr) {
      await User.deleteOne({ _id: user._id }); // Optional: rollback user creation
      return res.status(500).json({ message: "Failed to send OTP. Please try again." });
    }
    res.status(201).json({ message: "User registered. OTP sent to your phone." });
} catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
}


exports.verifyOTP = async (req, res) => {
  try {
    const { phone, otp } = req.body;
    console.log(phone + " " + otp)
    const user = await User.findOne({ phone,   otpExpires: { $gt: new Date() }  , otp });
  // Check if OTP is expired add this above laterotp,
    if (!user) return res.status(400).json({ message: "Invalid or expired OTP" });

    user.isVerified = true;
    user.otp = undefined;
    user.otpExpires = undefined;
    await user.save();

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" });
    const { password, ...userData } = user.toObject();
    res.json({ token, user: userData });
  } catch (err) {
    res.status(500).json({ message: "OTP verification failed" });
  }
};

// Login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "Invalid credentials" });

    if (!user.isVerified) return res.status(400).json({ message: "Account not verified. Please verify OTP." });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" });
    const { password: _, ...userData } = user.toObject();
    res.json({ token, user: userData });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// Get current user
exports.getMe = async (req, res) => {
  res.json(req.user);
};

// Update profile
exports.updateProfile = async (req, res) => {
  try {
    const updates = req.body;
    if (updates.password) delete updates.password; // Don't allow password change here
    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true }).select("-password");
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: "Profile update failed" });
  }
};

// Change password
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id);
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) return res.status(400).json({ message: "Current password is incorrect" });

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();
    res.json({ message: "Password changed successfully" });
  } catch (err) {
    res.status(500).json({ message: "Password change failed" });
  }
};