const express = require("express");
const router = express.Router();
const crud = require("../Controllers/genericController");
const poolPromise = require("../db");
const controller = crud(poolPromise);

// GET all contact persons by UserID
router.get("/Users/:id", async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input("userId", req.params.id)
      .query(`
        SELECT *
        FROM ContactPerson
        WHERE UserID = @userId
        ORDER BY CreationDate DESC
      `);
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ADD
router.post("/", controller.add("ContactPerson", "ContactsID"));

// EDIT
router.put("/:id", controller.edit("ContactPerson", "ContactsID"));

// DELETE
router.delete("/:id", controller.delete("ContactPerson", "ContactsID"));

module.exports = router;
