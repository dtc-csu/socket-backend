const crypto = require("crypto");
const sgMail = require("@sendgrid/mail");
const twilio = require("twilio");
const redis = require("../redis"); // Redis client
const poolPromise = require("../db");
const generic = require("./genericController")(poolPromise); // Generic controller

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// Initialize Twilio client
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

const forgotController = {
  // -------------------- SEND EMAIL OTP --------------------
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
      await redis.set(`otp:email:${email}`, otp, { EX: 300 });

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

  // -------------------- SEND SMS OTP --------------------
  sendSmsOtp: async (req, res) => {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ success: false, message: "Phone number is required" });

    try {
      const pool = await poolPromise;

      // Check if user exists by phone
      const userResult = await pool.request()
        .input("phone", phone)
        .query("SELECT * FROM Users WHERE phone=@phone");

      if (userResult.recordset.length === 0) {
        return res.status(404).json({ success: false, message: "Phone number not found" });
      }

      // Generate 6-digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();

      // Save OTP in Redis with 5 min expiry
      await redis.set(`otp:sms:${phone}`, otp, { EX: 300 });

      // Send OTP via SMS using Twilio
      await twilioClient.messages.create({
        body: `Your OTP code is ${otp}. This OTP will expire in 5 minutes.`,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: phone
      });

      return res.json({ success: true, message: "OTP sent via SMS" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: "Server error" });
    }
  },

  // -------------------- VERIFY EMAIL OTP --------------------
  verifyOtp: async (req, res) => {
    const { email, otp } = req.body;

    if (!email || !otp)
      return res.status(400).json({ success: false, message: "Email and OTP are required" });

    try {
      const savedOtp = await redis.get(`otp:email:${email}`);

      if (!savedOtp || savedOtp !== otp) {
        return res.status(400).json({ success: false, message: "Invalid or expired OTP" });
      }

      // OTP is valid, delete it
      await redis.del(`otp:email:${email}`);

      return res.json({ success: true, message: "OTP verified" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: "Server error" });
    }
  },

  // -------------------- VERIFY SMS OTP --------------------
  verifySmsOtp: async (req, res) => {
    const { phone, otp } = req.body;

    if (!phone || !otp)
      return res.status(400).json({ success: false, message: "Phone and OTP are required" });

    try {
      const savedOtp = await redis.get(`otp:sms:${phone}`);

      if (!savedOtp || savedOtp !== otp) {
        return res.status(400).json({ success: false, message: "Invalid or expired OTP" });
      }

      // OTP is valid, delete it
      await redis.del(`otp:sms:${phone}`);

      return res.json({ success: true, message: "SMS OTP verified" });
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
