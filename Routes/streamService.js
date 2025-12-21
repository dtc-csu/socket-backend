const { StreamChat } = require("stream-chat");
const jwt = require("jsonwebtoken");

const STREAM_API_KEY = process.env.STREAM_API_KEY;
const STREAM_API_SECRET = process.env.STREAM_API_SECRET;

if (!STREAM_API_KEY || !STREAM_API_SECRET) {
  console.error("❌ STREAM API KEY / SECRET missing");
  process.exit(1);
}

const streamClient = StreamChat.getInstance(STREAM_API_KEY, STREAM_API_SECRET);

/**
 * Create / update Stream user, then generate chat + video tokens
 * @param {Object} user
 * @param {number|string} user.userid
 * @param {string} user.firstname
 * @param {string} user.lastname
 * @param {string} user.role
 * @returns {Object} { chatToken, videoToken }
 */
async function generateTokens(user) {
  if (!user || !user.userid) {
    throw new Error("user.userid is required");
  }

  const userId = user.userid.toString();

  // 🔹 STEP 1: Ensure user exists in Stream
  await streamClient.upsertUsers([
    {
      id: userId,
      name: `${user.firstname} ${user.lastname}`,
      role: user.role || "user",
    },
  ]);

  // 🔹 STEP 2: Generate Chat Token
  const chatToken = streamClient.createToken(userId);

  // 🔹 STEP 3: Generate Video Token (JWT)
  const videoToken = jwt.sign(
    { user_id: userId, name: `${user.firstname} ${user.lastname}` },
    STREAM_API_SECRET,
    { expiresIn: "24h" } // adjust as needed
  );

  return { chatToken, videoToken };
}

module.exports = {
  generateTokens,
  STREAM_API_KEY,
};
