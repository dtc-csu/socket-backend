console.log("🔥 THIS REDIS FILE IS LOADED 🔥");

const redis = require("redis");

if (!process.env.REDIS_URL) {
  throw new Error("❌ REDIS_URL is not defined");
}
console.log("REDIS_URL:", process.env.REDIS_URL);

const client = redis.createClient({
  url: process.env.REDIS_URL,
  socket: {
    tls: true,
    rejectUnauthorized: false,
  },
});

client.on("connect", () => {
  console.log("✅ Redis connected");
});

client.on("error", (err) => {
  console.error("❌ Redis error:", err);
  throw new Error("STOP HERE");

});
console.log("REDIS_URL:", process.env.REDIS_URL);

(async () => {
  await client.connect();
})();

module.exports = client;
