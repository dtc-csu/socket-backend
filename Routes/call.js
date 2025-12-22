const express = require("express");
const router = express.Router();
const { generateToken, STREAM_API_KEY } = require("../Routes/streamService");

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

module.exports = router;
