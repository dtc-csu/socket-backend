
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

// Admin secret used to protect server-only operations. Prefer a dedicated
// STREAM_ADMIN_SECRET in env; fall back to the API secret if not provided.
const ADMIN_SECRET = process.env.STREAM_ADMIN_SECRET || STREAM_API_SECRET;

/**
 * Create / update Stream user, then generate token
 * @param {Object} user
 * @param {number|string} user.userid
 * @param {string} user.firstname
 * @param {string} user.lastname
 * @returns {string} token
 */
async function generateToken(user) {
  // Accept several possible id property names for robustness
  const rawId = (user && (user.userid || user.userId || user.id || user.uid));
  if (!user || !rawId) {
    throw new Error("user.userid is required");
  }

  const userId = rawId.toString();
  const firstName = (user.firstname || '').trim();
  const lastName = (user.lastname || '').trim();
  const username = (user.username || '').trim();
  // Build display name: prefer first+last, then username, then userId
  let displayName = `${firstName} ${lastName}`.trim();
  if (!displayName || displayName === '') {
    displayName = username || userId;
  }
  const fullName = displayName;

  // 🔑 STEP 1: Ensure user exists in Stream, with extraData for robust frontend extraction
  await streamClient.upsertUsers([
    {
      id: userId,
      name: displayName,
      // Add extraData fields for frontend
      ...((firstName || lastName || fullName) && {
        extraData: {
          firstName,
          lastName,
          fullName,
        },
      }),
    },
  ]);

  // 🔑 STEP 2: Generate token
  return streamClient.createToken(userId);
}

/**
 * Upsert multiple users to Stream in one call.
 * @param {Array<Object>} users - [{ id: '123', name: 'First Last' }, ...]
 */
async function upsertUsers(users) {
  if (!Array.isArray(users) || users.length === 0) return;
  // Ensure id is string and name exists
  const mapped = users.map(u => ({ id: u.id.toString(), name: u.name || '' }));
  return streamClient.upsertUsers(mapped);
}

/**
 * Permanently delete a channel (server-side). Requires admin secret.
 * @param {string} type - channel type, e.g. 'messaging'
 * @param {string} channelId
 */
async function deleteChannel(type, channelId) {
  if (!channelId) throw new Error('channelId is required');
  const ch = streamClient.channel(type || 'messaging', channelId);
  return ch.delete();
}

// Route: POST /streamService/token
router.post("/token", async (req, res) => {
  try {
    const user = req.body || {};
    // Validate common id fields
    const rawId = user.userid || user.userId || user.id || user.uid;
    if (!rawId) {
      console.warn('StreamService /token called without userid. Body:', user);
      return res.status(400).json({ success: false, message: 'userid is required' });
    }
    const token = await generateToken(user);
    res.json({ token });
  } catch (err) {
    console.error("StreamService Token Exception:", err && err.stack ? err.stack : err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Export router for mounting, and helper functions/constants for direct use
module.exports = {
  router,
  generateToken,
  STREAM_API_KEY,
  upsertUsers,
  deleteChannel,
};
