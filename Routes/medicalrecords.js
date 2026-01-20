const express = require("express");
const router = express.Router();
const poolPromise = require("../db");

// ✅ Get records by patient
router.get("/patient/:patientId", async (req, res) => {
  try {
    const pool = await poolPromise;

    // First, get PatientIDNoAuto from Patient table using UserID
    const patientResult = await pool
      .request()
      .input("patientId", req.params.patientId)
      .query("SELECT PatientIDNoAuto FROM Patient WHERE PatientID = @patientId");

    if (patientResult.recordset.length === 0) {
      return res.status(404).json({ message: "Patient not found" });
    }

    const patientIdNoAuto = patientResult.recordset[0].PatientIDNoAuto;

    // Then, get medical records using PatientIDNoAuto
    const result = await pool
      .request()
      .input("patientIdNoAuto", patientIdNoAuto)
      .query(`
        SELECT TOP (1000)
          PatientMedicalCaseID as MedicalRecordsId,
          PatientIDNoAuto,
          Description as ChiefComplaint,
          Notes as HistoryofPresentIllness,
          '' as Constitutional,
          '' as HEENT,
          '' as Cardiovascular,
          '' as Respiratory,
          '' as Gastrointestinal,
          '' as Genitourinary,
          '' as Musculoskeletal,
          '' as Skin,
          '' as Psychiatric,
          '' as EndocrineHematologic,
          '' as AllergicImmunologic,
          '' as DiagnosisAssessment,
          '' as PlanManagement,
          '' as PastMedicalandMedicationHistory,
          '' as ObstetricandGynecologicHistory,
          '' as FamilyHistory,
          CreationDate,
          '' as EndDate
        FROM PatientMedicalCases
        WHERE PatientIDNoAuto = @patientIdNoAuto
        ORDER BY CreationDate DESC
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
      .input("PatientIDNoAuto", r.PatientIDNoAuto)
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
          (PatientIDNoAuto, ChiefComplaint, HistoryofPresentIllness, Constitutional, HEENT, Cardiovascular, Respiratory, Gastrointestinal, Genitourinary, Musculoskeletal, Skin, Psychiatric, EndocrineHematologic, AllergicImmunologic, DiagnosisAssessment, PlanManagement, PastMedicalandMedicationHistory, ObstetricandGynecologicHistory, FamilyHistory)
        VALUES
          (@PatientIDNoAuto, @ChiefComplaint, @HistoryofPresentIllness, @Constitutional, @HEENT, @Cardiovascular, @Respiratory, @Gastrointestinal, @Genitourinary, @Musculoskeletal, @Skin, @Psychiatric, @EndocrineHematologic, @AllergicImmunologic, @DiagnosisAssessment, @PlanManagement, @PastMedicalandMedicationHistory, @ObstetricandGynecologicHistory, @FamilyHistory)
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
