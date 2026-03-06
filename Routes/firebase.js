
require("dotenv").config();
const express = require("express");
const router = express.Router();
const admin = require("firebase-admin");

if (!process.env.FIREBASE_ADMIN_JSON) {
  throw new Error("❌ FIREBASE_ADMIN_JSON not set in environment");
}

const serviceAccount = JSON.parse(process.env.FIREBASE_ADMIN_JSON);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

console.log("✅ Firebase Admin initialized");

// Example endpoint to verify Firebase connection
router.get("/status", (req, res) => {
  res.json({ success: true, message: "Firebase Admin is initialized." });
});

// Attach admin to router for use in other routes
router.admin = admin;

module.exports = router;
