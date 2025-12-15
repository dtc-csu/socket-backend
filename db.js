// api/db.js
const sql = require("mssql");
const path = require("path");
const dotenv = require("dotenv");

// Determine which .env to load
const isLocal = process.env.NODE_ENV === "local";

const envFile = isLocal
  ? path.resolve(__dirname, "./local_db.env")
  : path.resolve(__dirname, "./online_db.env");

console.log("NODE_ENV:", process.env.NODE_ENV);
console.log("Using env file:", envFile);


dotenv.config({ path: envFile });

// Validate required environment variables
const requiredEnv = ["DB_USER", "DB_PASSWORD", "DB_HOST", "DB_NAME", "DB_PORT"];
for (const key of requiredEnv) {
  if (!process.env[key]) {
    console.error(`❌ Missing required environment variable: ${key}`);
    process.exit(1);
  }
}

// Optional: debug log (do not log passwords in production)
// console.log("Using SQL Server config:");
// console.log({
//   user: process.env.DB_USER,
//   server: process.env.DB_HOST,
//   database: process.env.DB_NAME,
//   port: process.env.DB_PORT,
// });

// SQL Server connection config
const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_HOST,
  database: process.env.DB_NAME,
  port: parseInt(process.env.DB_PORT, 10),
  options: {
    encrypt: false,              // local dev: false
    trustServerCertificate: true // self-signed certificates
  },
};

// Create a connection pool
const poolPromise = new sql.ConnectionPool(config)
  .connect()
  .then(pool => {
    console.log("✅ Connected to SQL Server");
    return pool;
  })
  .catch(err => {
    console.error("❌ Database Connection Failed!", err);
    process.exit(1);
  });

module.exports = poolPromise;
