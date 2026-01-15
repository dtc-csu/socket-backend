const express = require("express");
const router = express.Router();
const admin = require("./firebase");
const redis = require("../redis");


// Save FCM token
router.post("/save-fcm", async (req, res) => {
  const { userId, token } = req.body;

  await redis.set(`fcm:${userId}`, token, { EX: 86400 });

  res.json({ success: true });
});


// Send call push
router.post("/push-call", async (req, res) => {
  const { toUserId, fromName, roomId } = req.body;

  const token = await redis.get(`fcm:${toUserId}`);

  if (!token) {
    return res.status(404).json({ error: "User offline" });
  }

  await admin.messaging().send({
    token,
    data: {
      type: "call",
      from: fromName,
      room: roomId,
    },
    android: {
      priority: "high",
    },
  });

  res.json({ success: true });
});

module.exports = router;
