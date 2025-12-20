const { StreamChat } = require("stream-chat");

const STREAM_API_KEY = process.env.STREAM_API_KEY;
const STREAM_API_SECRET = process.env.STREAM_API_SECRET;

if (!STREAM_API_KEY || !STREAM_API_SECRET) {
  console.error("❌ STREAM API KEY / SECRET missing");
  process.exit(1);
}

const streamClient = StreamChat.getInstance(STREAM_API_KEY, STREAM_API_SECRET);

/**
 * Generates a GetStream token for a given user
 * @param {string|number} userId
 * @returns {string} token
 */
function generateToken(userId) {
  if (!userId) {
    throw new Error("userId is required to generate token");
  }
  return streamClient.createToken(userId.toString());
}

module.exports = {
  generateToken,
  STREAM_API_KEY,
};
