require("dotenv").config();
const admin = require("firebase-admin");

if (!process.env.FIREBASE_ADMIN_JSON) {
  throw new Error("❌ FIREBASE_ADMIN_JSON not set in environment");
}

const serviceAccount = JSON.parse(process.env.FIREBASE_ADMIN_JSON);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

console.log("✅ Firebase Admin initialized");

module.exports = admin;
