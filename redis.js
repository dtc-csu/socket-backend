require('dotenv').config();
const redis = require('redis');

console.log("🔥 THIS REDIS FILE IS LOADED 🔥");

if (!process.env.REDIS_URL) {
  throw new Error("❌ REDIS_URL is not defined");
}

let redisUrl = process.env.REDIS_URL;
if (redisUrl.startsWith('redis://')) {
  redisUrl = redisUrl.replace('redis://', 'rediss://'); // enforce TLS
}

console.log("REDIS_URL:", redisUrl);

const client = redis.createClient({
  url: redisUrl,
  socket: { tls: true, rejectUnauthorized: false },
});

client.on('connect', () => console.log('✅ Redis connected'));
client.on('error', (err) => console.error('❌ Redis error:', err));

(async () => {
  try {
    await client.connect();
  } catch (err) {
    console.error('Failed to connect Redis:', err);
  }
})();

module.exports = client;
