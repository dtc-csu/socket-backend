const express = require("express");
const router = express.Router();
const crud = require("../Controllers/genericController");
const poolPromise = require("../db");
const controller = crud(poolPromise);

// GET family info by UserID (find PatientID first)
router.get("/user/:userId", async (req, res) => {
  try {
    const pool = await poolPromise;

    // First get PatientID from UserID
    const patientResult = await pool
      .request()
      .input("userId", req.params.userId)
      .query(`
        SELECT PatientID
        FROM Patient
        WHERE UserID = @userId
      `);

    if (patientResult.recordset.length === 0) {
      return res.status(404).json({ message: "Patient not found for this user" });
    }

    const patientId = patientResult.recordset[0].PatientID;

    // Get family info using PatientID
    const result = await pool
      .request()
      .input("patientId", patientId)
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
router.post("/user/:userId", async (req, res) => {
  try {
    const pool = await poolPromise;

    // First get PatientID from UserID
    const patientResult = await pool
      .request()
      .input("userId", req.params.userId)
      .query(`
        SELECT PatientID
        FROM Patient
        WHERE UserID = @userId
      `);

    if (patientResult.recordset.length === 0) {
      return res.status(404).json({ message: "Patient not found for this user" });
    }

    const patientId = patientResult.recordset[0].PatientID;

    // Set PatientID
    req.body.PatientID = patientId;

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
