const express = require("express");
const router = express.Router();
const poolPromise = require("../db");

// ✅ Get by patient
router.get("/patient/:patientId", async (req, res) => {
  try {
    const pool = await poolPromise;

    // First, get PatientIDNoAuto from Patient table using PatientID
    const patientResult = await pool
      .request()
      .input("patientId", req.params.patientId)
      .query("SELECT PatientIDNoAuto FROM Patient WHERE PatientID = @patientId");

    if (patientResult.recordset.length === 0) {
      return res.status(404).json({ message: "Patient not found" });
    }

    const patientIdNoAuto = patientResult.recordset[0].PatientIDNoAuto;

    // Then, get dental records using PatientIDNoAuto
    const result = await pool
      .request()
      .input("patientIdNoAuto", patientIdNoAuto)
      .query(
        "SELECT TOP (1000) [DentalRecordId], [PatientIDNoAuto], [DentalService], [Medication], [CreationDate], [EndDate] FROM DentalRecords WHERE PatientIDNoAuto = @patientIdNoAuto ORDER BY CreationDate DESC"
      );

    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ✅ Add
router.post("/", async (req, res) => {
  try {
    const pool = await poolPromise;
    const r = req.body;

    await pool.request()
      .input("PatientIDNoAuto", r.PatientIDNoAuto)
      .input("DentalService", r.DentalService)
      .input("Medication", r.Medication)
      .query(`
        INSERT INTO DentalRecords
        (PatientIDNoAuto, DentalService, Medication)
        VALUES (@PatientIDNoAuto, @DentalService, @Medication)
      `);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ✅ Update
router.put("/:id", async (req, res) => {
  try {
    const pool = await poolPromise;

    await pool.request()
      .input("id", req.params.id)
      .input("DentalService", req.body.DentalService)
      .input("Medication", req.body.Medication)
      .query(`
        UPDATE DentalRecords
        SET DentalService=@DentalService,
            Medication=@Medication
        WHERE DentalRecordId=@id
      `);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ✅ Delete
router.delete("/:id", async (req, res) => {
  try {
    const pool = await poolPromise;
    await pool.request()
      .input("id", req.params.id)
      .query("DELETE FROM DentalRecords WHERE DentalRecordId=@id");

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
