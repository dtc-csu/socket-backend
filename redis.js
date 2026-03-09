const redis = require("redis");
const { URL } = require("url");

// If REDIS_URL is not configured (e.g., local/dev or partial deployments),
// provide a lightweight in-memory fallback that implements the minimal
// async methods used by the codebase (`get`, `set`, `del`, `connect`, `on`).
if (!process.env.REDIS_URL) {
  console.warn("⚠️ REDIS_URL not set — using in-memory Redis fallback");
  const store = new Map();
  const client = {
    connect: async () => {},
    on: () => {},
    get: async (key) => {
      return store.has(key) ? store.get(key) : null;
    },
    set: async (key, value, opts = {}) => {
      // handle optional EX (seconds) parameter silently
      store.set(key, value);
      return 'OK';
    },
    del: async (key) => {
      const existed = store.delete(key);
      return existed ? 1 : 0;
    }
  };
  module.exports = client;
} else {
  const redisUrl = new URL(process.env.REDIS_URL);

  const client = redis.createClient({
    url: process.env.REDIS_URL,
    socket: {
      tls: true,
      servername: redisUrl.hostname,
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
}
// Export completed above depending on environment
