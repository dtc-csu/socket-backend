const express = require("express");
const router = express.Router();
const { generateToken, STREAM_API_KEY } = require("../Routes/streamService");
const admin = require("./firebase");
const redis = require("../redis");

/**
 * POST /api/call/token
 * Generates Stream token for voice/video calls
 */
router.post("/token", async (req, res) => {
  try {
    const { userid, firstname, lastname } = req.body;

    if (!userid) {
      return res.status(400).json({
        success: false,
        message: "userid is required",
      });
    }

    const token = await generateToken({
      userid,
      firstname: firstname || "User",
      lastname: lastname || "",
    });

    return res.json({
      success: true,
      apiKey: STREAM_API_KEY,
      token,
      userId: userid.toString(),
    });
  } catch (error) {
    console.error("❌ Call token error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to generate call token",
    });
  }
});

/**
 * POST /api/call/start
 * Initiates a call by sending FCM push notification to callee
 */
router.post("/start", async (req, res) => {
  try {
    const { callerId, calleeId, callerName, callId, callType } = req.body;

    if (!callerId || !calleeId || !callId) {
      return res.status(400).json({
        success: false,
        message: "callerId, calleeId, and callId are required",
      });
    }

    // Get FCM token from Redis
    const fcmToken = await redis.get(`fcm:${calleeId}`);
    if (!fcmToken) {
      return res.status(404).json({
        success: false,
        message: "Callee FCM token not found",
      });
    }

    // Send FCM high-priority data message
    const message = {
      token: fcmToken,
      data: {
        type: "incoming_call",
        callerId: callerId.toString(),
        calleeId: calleeId.toString(),
        callerName: callerName || "Unknown",
        callId: callId,
        callType: callType || "video", // video or audio
        timestamp: Date.now().toString(),
      },
      android: {
        priority: "high",
        ttl: 0, // Don't expire
        data: {
          // Additional data for Android
          click_action: "FLUTTER_NOTIFICATION_CLICK",
        },
      },
      apns: {
        headers: {
          "apns-priority": "10", // High priority
          "apns-push-type": "alert",
        },
        payload: {
          aps: {
            alert: {
              title: "Incoming Call",
              body: `Call from ${callerName}`,
            },
            sound: "default",
            badge: 1,
          },
        },
      },
    };

    const response = await admin.messaging().send(message);
    console.log("✅ FCM call notification sent:", response);

    res.json({
      success: true,
      messageId: response,
    });
  } catch (error) {
    console.error("❌ Call start error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to start call",
      error: error.message,
    });
  }
});

module.exports = router;
