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
        mr.MedicalRecordID,
        mr.VisitDate,
        mr.ChiefComplaint,
        mr.Diagnosis,
        mr.ManagementPlan,
        p.PatientID,
        CONCAT(u.FirstName, ' ', COALESCE(u.MiddleName, ''), ' ', u.LastName) AS PatientFullName
      FROM MedicalRecords mr
      INNER JOIN Patient p ON mr.PatientID = p.PatientID
      INNER JOIN Users u ON p.UserID = u.UserID
      ORDER BY mr.CreationDate DESC
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

    const result = await pool
      .request()
      .input("patientId", req.params.patientId)
      .query(`
        SELECT *
        FROM MedicalRecords
        WHERE PatientID = @patientId
        ORDER BY CreationDate DESC
      `);

    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ✅ Summary for tiles: return key fields suitable for UI preview
router.get('/summary/patient/:patientId', async (req, res) => {
  try {
    const pool = await poolPromise;

    const result = await pool
      .request()
      .input('patientId', req.params.patientId)
      .query(`
        SELECT MedicalRecordID, PatientID, ChiefComplaint, Diagnosis, ManagementPlan, CreationDate
        FROM MedicalRecords
        WHERE PatientID = @patientId
        ORDER BY CreationDate DESC
      `);

    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ✅ Add record
router.post("/", async (req, res) => {
  try {
    const pool = await poolPromise;
    const r = req.body;

    // Validate required fields
    if (!r.PatientID) {
      return res.status(400).json({ success: false, message: "PatientID is required" });
    }

    await pool.request()
      .input("PatientID", r.PatientID)
      .input("VisitDate", r.VisitDate || null)
      .input("BloodPressure", r.BloodPressure || null)
      .input("CardiacRate", r.CardiacRate || null)
      .input("RespiratoryRate", r.RespiratoryRate || null)
      .input("Temperature", r.Temperature || null)
      .input("OxygenSaturation", r.OxygenSaturation || null)
      .input("GeneralAppearance", r.GeneralAppearance || null)
      .input("Skin", r.Skin || null)
      .input("HeadNeck", r.HeadNeck || null)
      .input("ChestCardiovascular", r.ChestCardiovascular || null)
      .input("Abdomen", r.Abdomen || null)
      .input("Genitourinary", r.Genitourinary || null)
      .input("Neurologic", r.Neurologic || null)
      .input("Diagnosis", r.Diagnosis || null)
      .input("ManagementPlan", r.ManagementPlan || null)
      .input("DateInitiallySeen", r.DateInitiallySeen || null)
      .input("ChiefComplaint", r.ChiefComplaint || null)
      .input("HistoryOfPresentIllness", r.HistoryOfPresentIllness || null)
      .query(`
        INSERT INTO MedicalRecords
          (PatientID, VisitDate, BloodPressure, CardiacRate, RespiratoryRate, Temperature, OxygenSaturation, GeneralAppearance, Skin, HeadNeck, ChestCardiovascular, Abdomen, Genitourinary, Neurologic, Diagnosis, ManagementPlan, DateInitiallySeen, ChiefComplaint, HistoryOfPresentIllness, CreationDate)
        VALUES
          (@PatientID, @VisitDate, @BloodPressure, @CardiacRate, @RespiratoryRate, @Temperature, @OxygenSaturation, @GeneralAppearance, @Skin, @HeadNeck, @ChestCardiovascular, @Abdomen, @Genitourinary, @Neurologic, @Diagnosis, @ManagementPlan, @DateInitiallySeen, @ChiefComplaint, @HistoryOfPresentIllness, GETDATE())
      `);

    res.json({ success: true, message: "Medical record created successfully" });
  } catch (err) {
    console.error("AddMedicalRecord Exception:", err);
    res.status(500).json({ success: false, message: `AddMedicalRecord Exception: ${err.message}` });
  }
});

// ✅ Update record
router.put("/:id", async (req, res) => {
  try {
    const pool = await poolPromise;
    const r = req.body;

    await pool.request()
      .input("id", req.params.id)
      .input("VisitDate", r.VisitDate || null)
      .input("BloodPressure", r.BloodPressure || null)
      .input("CardiacRate", r.CardiacRate || null)
      .input("RespiratoryRate", r.RespiratoryRate || null)
      .input("Temperature", r.Temperature || null)
      .input("OxygenSaturation", r.OxygenSaturation || null)
      .input("GeneralAppearance", r.GeneralAppearance || null)
      .input("Skin", r.Skin || null)
      .input("HeadNeck", r.HeadNeck || null)
      .input("ChestCardiovascular", r.ChestCardiovascular || null)
      .input("Abdomen", r.Abdomen || null)
      .input("Genitourinary", r.Genitourinary || null)
      .input("Neurologic", r.Neurologic || null)
      .input("Diagnosis", r.Diagnosis || null)
      .input("ManagementPlan", r.ManagementPlan || null)
      .input("DateInitiallySeen", r.DateInitiallySeen || null)
      .input("ChiefComplaint", r.ChiefComplaint || null)
      .input("HistoryOfPresentIllness", r.HistoryOfPresentIllness || null)
      .query(`
        UPDATE MedicalRecords
        SET
          VisitDate = @VisitDate,
          BloodPressure = @BloodPressure,
          CardiacRate = @CardiacRate,
          RespiratoryRate = @RespiratoryRate,
          Temperature = @Temperature,
          OxygenSaturation = @OxygenSaturation,
          GeneralAppearance = @GeneralAppearance,
          Skin = @Skin,
          HeadNeck = @HeadNeck,
          ChestCardiovascular = @ChestCardiovascular,
          Abdomen = @Abdomen,
          Genitourinary = @Genitourinary,
          Neurologic = @Neurologic,
          Diagnosis = @Diagnosis,
          ManagementPlan = @ManagementPlan,
          DateInitiallySeen = @DateInitiallySeen,
          ChiefComplaint = @ChiefComplaint,
          HistoryOfPresentIllness = @HistoryOfPresentIllness
        WHERE MedicalRecordID = @id
      `);

    res.json({ success: true, message: "Medical record updated successfully" });
  } catch (err) {
    console.error("UpdateMedicalRecord Exception:", err);
    res.status(500).json({ success: false, message: `UpdateMedicalRecord Exception: ${err.message}` });
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
        WHERE MedicalRecordID = @id
      `);

    res.json({ success: true, message: "Medical record deleted successfully" });
  } catch (err) {
    console.error("DeleteMedicalRecord Exception:", err);
    res.status(500).json({ success: false, message: `DeleteMedicalRecord Exception: ${err.message}` });
  }
});

module.exports = router;
