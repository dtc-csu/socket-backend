const sql = require("mssql");
require("dotenv").config();

const requiredEnv = ["DB_USER", "DB_PASSWORD", "DB_HOST", "DB_NAME", "DB_PORT"];
for (const key of requiredEnv) {
  if (!process.env[key]) {
    console.error(`❌ Missing env var: ${key}`);
    process.exit(1);
  }
}

const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_HOST,
  database: process.env.DB_NAME,
  port: Number(process.env.DB_PORT),
  options: {
    encrypt: true,                // REQUIRED for AWS RDS
    trustServerCertificate: true // REQUIRED for AWS RDS
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
};

const poolPromise = new sql.ConnectionPool(config)
  .connect()
  .then(pool => {
    console.log("✅ Connected to SQL Server");
    return pool;
  })
  .catch(err => {
    console.error("❌ Database Connection Failed", err);
    process.exit(1);
  });

module.exports = poolPromise;
