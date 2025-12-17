const express = require("express");
const router = express.Router();
const crud = require("../controllers/crud.controller");
const poolPromise = require("../config/db");

const controller = crud(poolPromise);

// GET all contact persons by UserID
router.get("/Users/:id", async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input("userId", req.params.id)
      .query(`
        SELECT *
        FROM UserContactPerson
        WHERE UserID = @userId
        ORDER BY CreationDate DESC
      `);
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ADD
router.post("/", controller.add("UserContactPerson", "PatientContactsID"));

// EDIT
router.put("/:id", controller.edit("UserContactPerson", "PatientContactsID"));

// DELETE
router.delete("/:id", controller.delete("UserContactPerson", "PatientContactsID"));

module.exports = router;
