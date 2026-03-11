
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

/**
 * Create a new channel server-side using admin credentials.
 * Generates a unique channel id to avoid RecreateChannel permission issues.
 * @param {string} type
 * @param {Array<string>} members
 * @param {Object} extraData
 * @returns {string} channelId
 */
async function createChannel(type, members, extraData = {}, createdById = null, channelId = null) {
  if (!Array.isArray(members) || members.length === 0) {
    throw new Error('members array is required');
  }

  // Normalize member ids to strings
  const memberIds = members.map(m => m.toString());

  // Use provided channelId to allow recreating a previously deleted channel.
  // If not provided, generate a stable-ish dm id (no timestamp) to allow predictable DM ids.
  const id = channelId || `dm_${memberIds.join('_')}`;

  // Server-side auth requires either data.created_by or data.created_by_id
  // when creating channels. Prefer explicit createdById, else use the first member.
  const created_by_id = createdById ? createdById.toString() : memberIds[0];

  const ch = streamClient.channel(type || 'messaging', id, {
    members: memberIds,
    created_by_id,
    ...extraData,
  });

  await ch.create();
  return ch.id;
}

// Route: POST /streamService/create-channel
// Body: { type, members: ['10','11'], extraData?, createdById?, channelId? }
router.post('/create-channel', async (req, res) => {
  try {
    const { type, members, extraData, createdById, channelId } = req.body || {};
    if (!Array.isArray(members) || members.length === 0) {
      return res.status(400).json({ success: false, message: 'members array is required' });
    }
    const id = await createChannel(type, members, extraData || {}, createdById || null, channelId || null);
    res.json({ success: true, channelId: id });
  } catch (err) {
    console.error('StreamService create-channel Exception:', err && err.stack ? err.stack : err);
    res.status(500).json({ success: false, message: err.message, error: err });
  }
});

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
  createChannel,
};

/**
 * Try to get-or-create a DM channel for the provided members. Uses a canonical
 * id `dm_a_b` (sorted member ids) so repeated requests map to the same convo.
 * If the server-side creation is blocked by a RecreateChannel permission, a
 * new unique id will be generated and used instead.
 * @param {Array<string>} members
 * @param {string|null} createdById
 * @returns {string} channelId
 */
async function getOrCreateDmChannel(members, createdById = null) {
  if (!Array.isArray(members) || members.length === 0) {
    throw new Error('members array is required');
  }

  const memberIds = members.map(m => m.toString());
  // Canonical ordering so dm_10_11 == dm_11_10
  const sorted = memberIds.slice().sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  const baseId = `dm_${sorted.join('_')}`;

  // Ensure users exist before creating channel
  await upsertUsers(sorted.map(id => ({ id, name: '' })));

  try {
    return await createChannel('messaging', sorted, {}, createdById || sorted[0], baseId);
  } catch (err) {
    const msg = (err && (err.message || (err.response && err.response.data && err.response.data.message))) || '';
    // If recreate is not allowed for this role, fall back to a new id
    if (msg && msg.toString().includes('RecreateChannel')) {
      const fallbackId = `${baseId}_${Date.now()}`;
      return await createChannel('messaging', sorted, {}, createdById || sorted[0], fallbackId);
    }
    throw err;
  }
}

// Route: POST /streamService/get-or-create-dm
// Body: { members: ['10','11'], createdById? }
router.post('/get-or-create-dm', async (req, res) => {
  try {
    const { members, createdById } = req.body || {};
    if (!Array.isArray(members) || members.length === 0) {
      return res.status(400).json({ success: false, message: 'members array is required' });
    }
    const channelId = await getOrCreateDmChannel(members, createdById || null);
    res.json({ success: true, channelId });
  } catch (err) {
    console.error('StreamService get-or-create-dm Exception:', err && err.stack ? err.stack : err);
    res.status(500).json({ success: false, message: err.message, error: err });
  }
});

// export helper for other modules
module.exports.getOrCreateDmChannel = getOrCreateDmChannel;
