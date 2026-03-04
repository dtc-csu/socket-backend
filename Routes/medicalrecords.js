const express = require("express");
const router = express.Router();
const poolPromise = require("../db");

// ✅ Get all records
router.get("/", async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query(`
      SELECT *
      FROM MedicalRecords
      ORDER BY CreationDate DESC
      LIMIT 1000
    `);
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ✅ Get all records for grid view with patient info
router.get("/grid", async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query(`
      SELECT
        mr.MedicalRecordsId AS MedicalRecordID,
        mr.CreationDate AS VisitDate,
        mr.ChiefComplaint,
        mr.DiagnosisAssessment AS Diagnosis,
        mr.Constitutional,
        mr.HEENT,
        mr.Cardiovascular,
        mr.Respiratory,
        mr.Gastrointestinal,
        p.PatientID,
        CONCAT(u.FirstName, ' ', COALESCE(u.MiddleName, ''), ' ', u.LastName) AS PatientFullName
      FROM MedicalRecords mr
      INNER JOIN Patient p ON mr.PatientID = p.PatientID
      INNER JOIN Users u ON p.UserID = u.UserID
      ORDER BY mr.CreationDate DESC
      LIMIT 1000
    `);
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ✅ Get records by patient
router.get("/patient/:patientId", async (req, res) => {
  try {
    const pool = await poolPromise;

    // Get medical records using PatientID directly
    const result = await pool
      .request()
      .input("patientId", req.params.patientId)
      .query(`
        SELECT *
        FROM MedicalRecords
        WHERE PatientID = @patientId
        ORDER BY CreationDate DESC
        LIMIT 1000
      `);

    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ✅ Summary for tiles: return only NVARCHAR/text fields suitable for UI preview
router.get('/summary/patient/:patientId', async (req, res) => {
  try {
    const pool = await poolPromise;

    // Select only textual/NVARCHAR fields and CreationDate for preview
    const result = await pool
      .request()
      .input('patientId', req.params.patientId)
      .query(`
        SELECT MedicalRecordsId AS MedicalRecordID, PatientID, ChiefComplaint, DiagnosisAssessment, PlanManagement, CreationDate
        FROM MedicalRecords
        WHERE PatientID = @patientId
        ORDER BY CreationDate DESC
        LIMIT 100
      `);

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
      .input("PatientID", r.PatientID)
      .input("ChiefComplaint", r.ChiefComplaint)
      .input("HistoryofPresentIllness", r.HistoryofPresentIllness)
      .input("Constitutional", r.Constitutional)
      .input("HEENT", r.HEENT)
      .input("Cardiovascular", r.Cardiovascular)
      .input("Respiratory", r.Respiratory)
      .input("Gastrointestinal", r.Gastrointestinal)
      .input("Genitourinary", r.Genitourinary)
      .input("Musculoskeletal", r.Musculoskeletal)
      .input("Skin", r.Skin)
      .input("Psychiatric", r.Psychiatric)
      .input("EndocrineHematologic", r.EndocrineHematologic)
      .input("AllergicImmunologic", r.AllergicImmunologic)
      .input("DiagnosisAssessment", r.DiagnosisAssessment)
      .input("PlanManagement", r.PlanManagement)
      .input("PastMedicalandMedicationHistory", r.PastMedicalandMedicationHistory)
      .input("ObstetricandGynecologicHistory", r.ObstetricandGynecologicHistory)
      .input("FamilyHistory", r.FamilyHistory)
      .query(`
        INSERT INTO MedicalRecords
          (PatientID, ChiefComplaint, HistoryofPresentIllness, Constitutional, HEENT, Cardiovascular, Respiratory, Gastrointestinal, Genitourinary, Musculoskeletal, Skin, Psychiatric, EndocrineHematologic, AllergicImmunologic, DiagnosisAssessment, PlanManagement, PastMedicalandMedicationHistory, ObstetricandGynecologicHistory, FamilyHistory)
        VALUES
          (@PatientID, @ChiefComplaint, @HistoryofPresentIllness, @Constitutional, @HEENT, @Cardiovascular, @Respiratory, @Gastrointestinal, @Genitourinary, @Musculoskeletal, @Skin, @Psychiatric, @EndocrineHematologic, @AllergicImmunologic, @DiagnosisAssessment, @PlanManagement, @PastMedicalandMedicationHistory, @ObstetricandGynecologicHistory, @FamilyHistory)
      `);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ✅ Update case
router.put("/:id", async (req, res) => {
  try {
    const pool = await poolPromise;
    const r = req.body;

    await pool.request()
      .input("id", req.params.id)
      .input("Description", r.Description)
      .input("Notes", r.Notes)
      .query(`
        UPDATE PatientMedicalCases
        SET
          Description = @Description,
          Notes = @Notes
        WHERE PatientMedicalCaseID = @id
      `);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ✅ Delete record
router.delete("/:id", async (req, res) => {
  try {
    const pool = await poolPromise;
    await pool.request()
      .input("id", req.params.id)
      .query(`
        DELETE FROM MedicalRecords
        WHERE MedicalRecordsId = @id
      `);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
