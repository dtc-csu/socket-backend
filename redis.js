const redis = require("redis");

const client = redis.createClient({
  url: process.env.REDIS_URL,
});

client.on("connect", () => {
  console.log("✅ Redis connected");
});

client.on("error", (err) => {
  console.error("❌ Redis error:", err);
});

(async () => {
  await client.connect();
})();

module.exports = client;
