module.exports = (poolPromise) => {
  return {
    // ---------------------- GET ALL ----------------------
    getAll: (tableName, pkName = "id") => async (req, res) => {
      try {
        const pool = await poolPromise;
        const result = await pool.request().query(`SELECT * FROM ${tableName} ORDER BY ${pkName}`);
        res.json(result.recordset);
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    },

    // ---------------------- GET BY ID ----------------------
    getById: (tableName, pkName = "id") => async (req, res) => {
      try {
        const pool = await poolPromise;
        const id = req.params.id;
        const result = await pool.request()
          .input("idParam", id)
          .query(`SELECT * FROM ${tableName} WHERE ${pkName}=@idParam`);
        
        if (result.recordset.length === 0) {
          return res.status(404).json({ error: "Record not found" });
        }
        res.json(result.recordset[0]);
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    },

    // ---------------------- ADD ----------------------
    add: (tableName, pkName = "id") => async (req, res) => {
    try {
      const pool = await poolPromise;
      const keys = Object.keys(req.body);
      const values = Object.values(req.body);

      const request = pool.request();
      keys.forEach((k, i) => request.input(`param${i}`, values[i]));

      const params = keys.map((_, i) => `@param${i}`).join(",");

      const query = `
        INSERT INTO ${tableName} (${keys.join(",")})
        VALUES (${params});
        SELECT * FROM ${tableName} WHERE ${pkName} = SCOPE_IDENTITY();
      `;

      const result = await request.query(query);

      res.json(result.recordset[0]);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },


    // ---------------------- EDIT ----------------------
    edit: (tableName, pkName = "id") => async (req, res) => {
      try {
        const pool = await poolPromise;
        const id = req.params.id;
        const keys = Object.keys(req.body);
        const values = Object.values(req.body);

        const setQuery = keys.map((k, i) => `${k}=@param${i}`).join(",");
        const request = pool.request();
        keys.forEach((k, i) => request.input(`param${i}`, values[i]));
        request.input("idParam", id);

        const query = `UPDATE ${tableName} SET ${setQuery} WHERE ${pkName}=@idParam; SELECT * FROM ${tableName} WHERE ${pkName}=@idParam`;
        const result = await request.query(query);

        res.json(result.recordset[0]);
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    },

    // ---------------------- DELETE ----------------------
    delete: (tableName, pkName = "id") => async (req, res) => {
      try {
        const pool = await poolPromise;
        const id = req.params.id;
        await pool.request().input("idParam", id).query(`DELETE FROM ${tableName} WHERE ${pkName}=@idParam`);
        res.json({ message: `Deleted from ${tableName}` });
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    },

    // ---------------------- SEARCH/FILTER ----------------------
    search: (tableName, pkName = "id") => async (req, res) => {
      try {
        const pool = await poolPromise;
        const filters = req.query; // e.g., ?status=Active&role=Doctor
        
        if (Object.keys(filters).length === 0) {
          const result = await pool.request().query(`SELECT * FROM ${tableName} ORDER BY ${pkName}`);
          return res.json(result.recordset);
        }

        const request = pool.request();
        const whereClauses = [];
        
        Object.keys(filters).forEach((key, i) => {
          whereClauses.push(`${key}=@param${i}`);
          request.input(`param${i}`, filters[key]);
        });

        const query = `SELECT * FROM ${tableName} WHERE ${whereClauses.join(" AND ")} ORDER BY ${pkName}`;
        const result = await request.query(query);
        res.json(result.recordset);
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    },

    // ---------------------- BULK ADD ----------------------
    bulkAdd: (tableName, pkName = "id") => async (req, res) => {
      try {
        const pool = await poolPromise;
        const records = req.body.records || req.body; // Accept array of records
        
        if (!Array.isArray(records) || records.length === 0) {
          return res.status(400).json({ error: "Expected array of records" });
        }

        const insertedIds = [];
        
        // Use transaction for bulk insert
        await poolPromise.transaction(async (createRequest) => {
          for (const record of records) {
            const keys = Object.keys(record);
            const values = Object.values(record);
            
            const request = createRequest();
            keys.forEach((k, i) => request.input(`param${i}`, values[i]));
            
            const params = keys.map((_, i) => `@param${i}`).join(",");
            const query = `
              INSERT INTO ${tableName} (${keys.join(",")})
              VALUES (${params});
              SELECT SCOPE_IDENTITY() AS insertedId;
            `;
            
            const result = await request.query(query);
            insertedIds.push(result.recordset[0].insertedId);
          }
        });

        res.json({ 
          message: `${records.length} records inserted into ${tableName}`,
          insertedIds 
        });
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    },

    // ---------------------- BULK DELETE ----------------------
    bulkDelete: (tableName, pkName = "id") => async (req, res) => {
      try {
        const pool = await poolPromise;
        const ids = req.body.ids; // Expect { ids: [1, 2, 3, ...] }
        
        if (!Array.isArray(ids) || ids.length === 0) {
          return res.status(400).json({ error: "Expected array of IDs" });
        }

        const request = pool.request();
        const placeholders = ids.map((id, i) => {
          request.input(`id${i}`, id);
          return `@id${i}`;
        }).join(",");
        
        const query = `DELETE FROM ${tableName} WHERE ${pkName} IN (${placeholders})`;
        await request.query(query);
        
        res.json({ 
          message: `Deleted ${ids.length} records from ${tableName}`,
          deletedIds: ids 
        });
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    },

    // ---------------------- COUNT ----------------------
    count: (tableName) => async (req, res) => {
      try {
        const pool = await poolPromise;
        const filters = req.query;
        
        let query = `SELECT COUNT(*) as total FROM ${tableName}`;
        const request = pool.request();
        
        if (Object.keys(filters).length > 0) {
          const whereClauses = [];
          Object.keys(filters).forEach((key, i) => {
            whereClauses.push(`${key}=@param${i}`);
            request.input(`param${i}`, filters[key]);
          });
          query += ` WHERE ${whereClauses.join(" AND ")}`;
        }
        
        const result = await request.query(query);
        res.json({ total: result.recordset[0].total });
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    },

    // ---------------------- PAGINATE ----------------------
    paginate: (tableName, pkName = "id") => async (req, res) => {
      try {
        const pool = await poolPromise;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;
        
        // Get total count
        const countResult = await pool.request()
          .query(`SELECT COUNT(*) as total FROM ${tableName}`);
        const total = countResult.recordset[0].total;
        
        // Get paginated data
        const request = pool.request()
          .input("limit", limit)
          .input("offset", offset);
        
        const query = `
          SELECT * FROM ${tableName} 
          ORDER BY ${pkName} 
          OFFSET @offset ROWS 
          FETCH NEXT @limit ROWS ONLY
        `;
        
        const result = await request.query(query);
        
        res.json({
          data: result.recordset,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit)
          }
        });
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    },
  };
};
