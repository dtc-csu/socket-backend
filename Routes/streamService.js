
const express = require("express");
const router = express.Router();
const { StreamChat } = require("stream-chat");

const STREAM_API_KEY = process.env.STREAM_API_KEY;
const STREAM_API_SECRET = process.env.STREAM_API_SECRET;

if (!STREAM_API_KEY || !STREAM_API_SECRET) {
  console.error("❌ STREAM API KEY / SECRET missing");
  process.exit(1);
}

const streamClient = StreamChat.getInstance(
  STREAM_API_KEY,
  STREAM_API_SECRET
);

/**
 * Create / update Stream user, then generate token
 * @param {Object} user
 * @param {number|string} user.userid
 * @param {string} user.firstname
 * @param {string} user.lastname
 * @returns {string} token
 */
async function generateToken(user) {
  if (!user || !user.userid) {
    throw new Error("user.userid is required");
  }

  const userId = user.userid.toString();

  // 🔑 STEP 1: Ensure user exists in Stream
  await streamClient.upsertUsers([
    {
      id: userId, // ← FROM YOUR USERS TABLE
      name: `${user.firstname} ${user.lastname}`,
    },
  ]);

  // 🔑 STEP 2: Generate token
  return streamClient.createToken(userId);
}

// Route: POST /streamService/token
router.post("/token", async (req, res) => {
  try {
    const user = req.body;
    const token = await generateToken(user);
    res.json({ token });
  } catch (err) {
    console.error("StreamService Token Exception:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
