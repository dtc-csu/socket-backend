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
  };
};
