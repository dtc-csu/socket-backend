const express = require("express");
const router = express.Router();
const crud = require("../Controllers/genericController");
const poolPromise = require("../db");
const controller = crud(poolPromise);

// GET family info by PatientID
router.get("/patient/:id", async (req, res) => {
  try {
    const pool = await poolPromise;

    // Get family info using PatientID directly
    const result = await pool
      .request()
      .input("patientId", req.params.id)
      .query(`
        SELECT *
        FROM FamilyInfo
        WHERE PatientID = @patientId
        ORDER BY CreationDate DESC
      `);

    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ADD family info
router.post("/patient/:id", async (req, res) => {
  try {
    const pool = await poolPromise;

    // Set PatientID directly
    req.body.PatientID = req.params.id;

    await controller.add("FamilyInfo", "FamilyInfoID")(req, res);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// EDIT family info
router.put("/patient/:id", async (req, res) => {
  try {
    const pool = await poolPromise;

    // Set PatientID directly
    req.body.PatientID = req.params.id;

    // Use the generic controller to edit
    await controller.edit("FamilyInfo", "FamilyInfoID")(req, res);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE family info
router.delete("/:id", controller.delete("FamilyInfo", "FamilyInfoID"));

module.exports = router;
