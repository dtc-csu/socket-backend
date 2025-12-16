const redis = require("redis");
const { URL } = require("url");

const redisUrl = new URL(process.env.REDIS_URL);

const client = redis.createClient({
  url: process.env.REDIS_URL,
  socket: {
    tls: true,
    servername: redisUrl.hostname, // 🔑 THIS IS THE FIX
    rejectUnauthorized: false,
    connectTimeout: 15000,
  },
});

client.on("connect", () => {
  console.log("✅ Redis connected");
});

client.on("error", (err) => {
  console.error("❌ Redis error:", err);
});

(async () => {
  try {
    await client.connect();
  } catch (err) {
    console.error("🚨 Failed to connect to Redis", err);
  }
})();

module.exports = client;
