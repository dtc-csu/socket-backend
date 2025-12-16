const redis = require("redis");

if (!process.env.REDIS_URL) {
  throw new Error("❌ REDIS_URL is not defined");
}

const client = redis.createClient({
  url: process.env.REDIS_URL,
  socket: {
    tls: process.env.REDIS_URL.startsWith("rediss://"),
    rejectUnauthorized: false,
  },
});

client.on("connect", () => console.log("✅ Redis connected"));
client.on("error", (err) => console.error("❌ Redis error:", err));

(async () => {
  try {
    await client.connect();
  } catch (err) {
    console.error("🚨 Failed to connect to Redis", err);
  }
})();

module.exports = client;
