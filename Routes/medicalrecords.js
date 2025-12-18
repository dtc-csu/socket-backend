const express = require("express");
const router = express.Router();
const poolPromise = require("../db");

// ✅ Get records by patient
router.get("/patient/:patientId", async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool
      .request()
      .input("patientId", req.params.patientId)
      .query(
        "SELECT * FROM MedicalRecords WHERE PatientIDNoAuto = @patientId ORDER BY CreationDate DESC"
      );

    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ✅ Add record
router.post("/", async (req, res) => {
  try {
    const pool = await poolPromise;
    const r = req.body;

    await pool.request()
      .input("PatientIDNoAuto", r.PatientIDNoAuto)
      .input("ChiefComplaint", r.ChiefComplaint)
      .input("DiagnosisAssessment", r.DiagnosisAssessment)
      .input("PlanManagement", r.PlanManagement)
      .query(`
        INSERT INTO MedicalRecords
        (PatientIDNoAuto, ChiefComplaint, DiagnosisAssessment, PlanManagement)
        VALUES (@PatientIDNoAuto, @ChiefComplaint, @DiagnosisAssessment, @PlanManagement)
      `);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ✅ Update record
router.put("/:id", async (req, res) => {
  try {
    const pool = await poolPromise;
    const r = req.body;

    await pool.request()
      .input("id", req.params.id)
      .input("ChiefComplaint", r.ChiefComplaint)
      .input("DiagnosisAssessment", r.DiagnosisAssessment)
      .input("PlanManagement", r.PlanManagement)
      .query(`
        UPDATE MedicalRecords
        SET ChiefComplaint=@ChiefComplaint,
            DiagnosisAssessment=@DiagnosisAssessment,
            PlanManagement=@PlanManagement
        WHERE MedicalRecordsId=@id
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
      .query("DELETE FROM MedicalRecords WHERE MedicalRecordsId=@id");

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
