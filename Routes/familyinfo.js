const express = require("express");
const router = express.Router();
const crud = require("../Controllers/genericController");
const poolPromise = require("../db");
const controller = crud(poolPromise);

// GET family info by UserID
router.get("/Users/:id", async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input("userId", req.params.id)
      .query(`
        SELECT *
        FROM UserFamilyInfo
        WHERE UserID = @userId
        ORDER BY CreationDate DESC
      `);
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ADD family info
router.post("/", controller.add("UserFamilyInfo", "FamilyInfoID"));

// EDIT family info
router.put("/:id", controller.edit("UserFamilyInfo", "FamilyInfoID"));

// DELETE family info
router.delete("/:id", controller.delete("UserFamilyInfo", "FamilyInfoID"));

module.exports = router;
