const crypto = require("crypto");
const sgMail = require("@sendgrid/mail");
const redis = require("../redis"); // Redis client
const poolPromise = require("../db");
const generic = require("./genericController")(poolPromise); // Generic controller

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const forgotController = {
  // -------------------- SEND OTP --------------------
  forgotPassword: async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: "Email is required" });

    try {
      const pool = await poolPromise;

      // Check if user exists
      const userResult = await pool.request()
        .input("email", email)
        .query("SELECT * FROM Users WHERE email=@email");

      if (userResult.recordset.length === 0) {
        return res.status(404).json({ success: false, message: "Email not found" });
      }

      // Generate 6-digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();

      // Save OTP in Redis with 5 min expiry
      await redis.set(`otp:${email}`, otp, { EX: 300 });

      // Send OTP email
      const msg = {
        to: email,
        from: "carigcsu0@gmail.com", // must be verified in SendGrid
        subject: "Your OTP Code",
        html: `<p>Your OTP code is <strong>${otp}</strong></p><p>This OTP will expire in 5 minutes.</p>`,
      };

      await sgMail.send(msg);

      return res.json({ success: true, message: "OTP sent to email" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: "Server error" });
    }
  },

  // -------------------- VERIFY OTP --------------------
  verifyOtp: async (req, res) => {
    const { email, otp } = req.body;

    if (!email || !otp)
      return res.status(400).json({ success: false, message: "Email and OTP are required" });

    try {
      const savedOtp = await redis.get(`otp:${email}`);

      if (!savedOtp || savedOtp !== otp) {
        return res.status(400).json({ success: false, message: "Invalid or expired OTP" });
      }

      // OTP is valid, delete it
      await redis.del(`otp:${email}`);

      return res.json({ success: true, message: "OTP verified" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: "Server error" });
    }
  },

  // -------------------- RESET PASSWORD --------------------
  resetPassword: async (req, res) => {
    const { email, newPassword } = req.body;

    if (!email || !newPassword)
      return res.status(400).json({ success: false, message: "Missing fields" });

    try {
      // Use generic controller to update password
      const result = await generic.edit(
        "Users",
        null, // ID not needed
        { password: newPassword },
        { email: email } // filter by email
      );

      if (result.rowsAffected[0] === 0) {
        return res.status(404).json({ success: false, message: "User not found" });
      }

      return res.json({ success: true, message: "Password updated successfully" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: "Server error" });
    }
  },
};

module.exports = forgotController;
