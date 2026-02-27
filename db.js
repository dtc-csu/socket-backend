const sql = require("mssql");
const mysql = require("mysql2/promise");
require("dotenv").config();

const dbEngine = (process.env.DB_ENGINE || "sqlserver").toLowerCase();
const isMySql = dbEngine === "mysql";

// For SQL Server: MSSQL_* or fallback to DB_*
// For MySQL: MYSQL_* or fallback to DB_*
const getConfig = (prefix) => {
  const fallback = (key) => process.env[`${prefix}_${key}`] || process.env[`DB_${key}`];
  
  return {
    user: fallback("USER"),
    password: fallback("PASSWORD"),
    host: fallback("HOST"),
    database: fallback("NAME"),
    port: Number(fallback("PORT") || (prefix === "MYSQL" ? 3306 : 1433)),
  };
};

const createSqlServerPool = async () => {
  const cfg = getConfig("MSSQL");
  
  if (!cfg.user || !cfg.password || !cfg.host || !cfg.database) {
    console.error("❌ Missing SQL Server credentials (MSSQL_* or DB_*)");
    process.exit(1);
  }

  const config = {
    user: cfg.user,
    password: cfg.password,
    server: cfg.host,
    database: cfg.database,
    port: cfg.port,
    options: {
      encrypt: true,
      trustServerCertificate: true,
    },
    pool: {
      max: 10,
      min: 0,
      idleTimeoutMillis: 30000,
    },
  };

  const pool = await new sql.ConnectionPool(config).connect();
  console.log("✅ Connected to SQL Server");
  return pool;
};

const rewriteSqlServerToMySql = (query, params) => {
  let rewritten = query;
  
  // Convert [Table] to `Table`
  rewritten = rewritten.replace(/\[([^\]]+)\]/g, "`$1`");
  
  // Convert GETDATE() to NOW()
  rewritten = rewritten.replace(/\bGETDATE\(\)/gi, "NOW()");
  
  // Convert SCOPE_IDENTITY() to LAST_INSERT_ID()
  rewritten = rewritten.replace(/\bSCOPE_IDENTITY\(\)/gi, "LAST_INSERT_ID()");
  
  // Convert SELECT TOP (n) to LIMIT n
  const topMatch = rewritten.match(/select\s+top\s*\(?\s*(\d+)\s*\)?\s+/i);
  if (topMatch) {
    const limit = topMatch[1];
    rewritten = rewritten.replace(topMatch[0], "SELECT ");
    if (!/\blimit\b/i.test(rewritten)) {
      const semiIndex = rewritten.lastIndexOf(";");
      if (semiIndex !== -1) {
        rewritten = rewritten.slice(0, semiIndex) + ` LIMIT ${limit}` + rewritten.slice(semiIndex);
      } else {
        rewritten = rewritten + ` LIMIT ${limit}`;
      }
    }
  }

  // Convert @param to ? and build values array
  const values = [];
  rewritten = rewritten.replace(/@([A-Za-z0-9_]+)/g, (match, name) => {
    values.push(params.has(name) ? params.get(name) : null);
    return "?";
  });

  return { sql: rewritten, values };
};

const normalizeResults = (results) => {
  // Handle multi-statement queries
  if (Array.isArray(results) && results.length > 0) {
    const lastResult = results[results.length - 1];
    const recordset = Array.isArray(lastResult) ? lastResult : [];
    const firstPacket = results.find((r) => r && typeof r.affectedRows === "number");
    
    return {
      recordset,
      rowsAffected: [firstPacket ? firstPacket.affectedRows : 0],
    };
  }

  return {
    recordset: Array.isArray(results) ? results : [],
    rowsAffected: [results && typeof results.affectedRows === "number" ? results.affectedRows : 0],
  };
};

class Request {
  constructor(pool) {
    this.pool = pool;
    this.params = new Map();
  }

  input(name, value) {
    this.params.set(name, value);
    return this;
  }

  async query(query) {
    const { sql: rewritten, values } = rewriteSqlServerToMySql(query, this.params);
    const [results] = await this.pool.query(rewritten, values);
    return normalizeResults(results);
  }
}

const createMySqlAdapter = async () => {
  const cfg = getConfig("MYSQL");
  
  if (!cfg.user || !cfg.password || !cfg.host || !cfg.database) {
    console.error("❌ Missing MySQL credentials (MYSQL_* or DB_*)");
    process.exit(1);
  }

  const pool = mysql.createPool({
    host: cfg.host,
    user: cfg.user,
    password: cfg.password,
    database: cfg.database,
    port: cfg.port,
    waitForConnections: true,
    connectionLimit: 10,
    multipleStatements: true,
  });

  const connection = await pool.getConnection();
  connection.release();
  console.log("✅ Connected to MySQL");

  return {
    request: () => new Request(pool),
    _pool: pool,
  };
};

const poolPromise = (async () => {
  if (isMySql) {
    return await createMySqlAdapter();
  }

  return await createSqlServerPool();
})().catch((err) => {
  console.error("❌ Database Connection Failed", err);
  process.exit(1);
});

const runTransaction = async (handler) => {
  if (isMySql) {
    const adapter = await poolPromise;
    const connection = await adapter._pool.getConnection();

    try {
      await connection.beginTransaction();
      const createRequest = () => new Request(connection);
      const result = await handler(createRequest);
      await connection.commit();
      return result;
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  }

  const pool = await poolPromise;
  const transaction = new sql.Transaction(pool);

  try {
    await transaction.begin();
    const createRequest = () => transaction.request();
    const result = await handler(createRequest);
    await transaction.commit();
    return result;
  } catch (err) {
    try {
      await transaction.rollback();
    } catch (rbErr) {
      console.error("Rollback error:", rbErr);
    }
    throw err;
  }
};

poolPromise.transaction = runTransaction;
poolPromise.isMySql = isMySql;
poolPromise.engine = dbEngine;

module.exports = poolPromise;
