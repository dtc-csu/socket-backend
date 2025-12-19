const express = require("express");
const router = express.Router();
const poolPromise = require("../db");

// ✅ Get cases by patient
router.get("/patient/:patientId", async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool
      .request()
      .input("patientId", req.params.patientId)
      .query(`
        SELECT 
          PatientMedicalCaseID,
          PatientIDNoAuto,
          Description,
          Notes,
          CreationDate,
          HasAdded
        FROM PatientMedicalCases
        WHERE PatientIDNoAuto = @patientId
        ORDER BY CreationDate DESC
      `);

    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ✅ Add case
router.post("/", async (req, res) => {
  try {
    const pool = await poolPromise;
    const r = req.body;

    await pool.request()
      .input("PatientIDNoAuto", r.PatientIDNoAuto)
      .input("Description", r.Description)
      .input("Notes", r.Notes)
      .input("HasAdded", r.HasAdded ?? 1)
      .query(`
        INSERT INTO PatientMedicalCases
          (PatientIDNoAuto, Description, Notes, HasAdded)
        VALUES
          (@PatientIDNoAuto, @Description, @Notes, @HasAdded)
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

// ✅ Delete case
router.delete("/:id", async (req, res) => {
  try {
    const pool = await poolPromise;
    await pool.request()
      .input("id", req.params.id)
      .query(`
        DELETE FROM PatientMedicalCases
        WHERE PatientMedicalCaseID = @id
      `);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
