const redis = require("redis");

const client = redis.createClient({
  url: "redis://127.0.0.1:6379" // change if using cloud redis
});

client.connect().catch(console.error);

client.on("connect", () => console.log("Redis connected"));
client.on("error", (err) => console.error("Redis error:", err));

module.exports = client;
