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
 * @param {string} user.role
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
      role: user.role || "user",
    },
  ]);

  // 🔑 STEP 2: Generate token
 const token = streamClient.createToken(userId);

  return {token};
}

module.exports = {
  generateToken,
  STREAM_API_KEY,
};
