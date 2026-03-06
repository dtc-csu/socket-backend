const express = require("express");
const router = express.Router();
const poolPromise = require("../db");

// Helper: convert input to JS Date or null (prevents SQL conversion errors)
function parseDateOrNull(value) {
  if (value === undefined || value === null || value === "") return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

// ✅ Get all records
router.get("/", async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query('SELECT * FROM MedicalRecords ORDER BY CreationDate DESC');
    res.json(result.recordset);
  } catch (err) {
    console.error("GetAllMedicalRecords Exception:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Medical record grid endpoint (with joins)
router.get('/grid', async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query(`
      SELECT
        mr.MedicalRecordID,
        mr.VisitDate,
        mr.BloodPressure,
        mr.GeneralAppearance,
        mr.Diagnosis,
        mr.ChiefComplaint,

        p.PatientID,
        p.CollegeOffice,

        CONCAT(u.FirstName, ' ', u.MiddleName, ' ', u.LastName) AS PatientFullName

      FROM MedicalRecords mr
      INNER JOIN Patient p ON mr.PatientID = p.PatientID
      INNER JOIN Users u ON p.UserID = u.UserID

      ORDER BY mr.VisitDate DESC
    `);
    res.json(result.recordset);
  } catch (err) {
    console.error('GridJoined Exception:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});
  

// Add record (MedicalRecords only)
router.post("/", async (req, res) => {
  try {
    const pool = await poolPromise;
    const r = req.body;
    if (!r.PatientID) {
      return res.status(400).json({ success: false, message: "PatientID is required" });
    }
    await pool.request()
      .input("PatientID", r.PatientID)
      .input("VisitDate", parseDateOrNull(r.VisitDate))
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
      .input("DateInitiallySeen", parseDateOrNull(r.DateInitiallySeen))
      .input("ChiefComplaint", r.ChiefComplaint || null)
      .input("HistoryOfPresentIllness", r.HistoryOfPresentIllness || null)
      .query('INSERT INTO MedicalRecords (PatientID, VisitDate, BloodPressure, CardiacRate, RespiratoryRate, Temperature, OxygenSaturation, GeneralAppearance, Skin, HeadNeck, ChestCardiovascular, Abdomen, Genitourinary, Neurologic, Diagnosis, ManagementPlan, DateInitiallySeen, ChiefComplaint, HistoryOfPresentIllness, CreationDate) VALUES (@PatientID, @VisitDate, @BloodPressure, @CardiacRate, @RespiratoryRate, @Temperature, @OxygenSaturation, @GeneralAppearance, @Skin, @HeadNeck, @ChestCardiovascular, @Abdomen, @Genitourinary, @Neurologic, @Diagnosis, @ManagementPlan, @DateInitiallySeen, @ChiefComplaint, @HistoryOfPresentIllness, GETDATE())');
    res.json({ success: true, message: "Medical record created successfully" });
  } catch (err) {
    console.error("AddMedicalRecord Exception:", err);
    res.status(500).json({ success: false, message: 'AddMedicalRecord Exception: ' + err.message });
  }
});

// Add record and all sub-entities
router.post("/full", async (req, res) => {
  try {
    const pool = await poolPromise;
    const r = req.body;
    try { console.log('[medicalrecords/full] POST body:', JSON.stringify(r)); } catch (e) { console.log('[medicalrecords/full] POST body (stringify failed)'); }
    const insertResult = await pool.request()
      .input("PatientID", r.PatientID)
      .input("VisitDate", parseDateOrNull(r.VisitDate))
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
      .query('INSERT INTO MedicalRecords (PatientID, VisitDate, BloodPressure, CardiacRate, RespiratoryRate, Temperature, OxygenSaturation, GeneralAppearance, Skin, HeadNeck, ChestCardiovascular, Abdomen, Genitourinary, Neurologic, Diagnosis, ManagementPlan, DateInitiallySeen, ChiefComplaint, HistoryOfPresentIllness, CreationDate) OUTPUT INSERTED.MedicalRecordID VALUES (@PatientID, @VisitDate, @BloodPressure, @CardiacRate, @RespiratoryRate, @Temperature, @OxygenSaturation, @GeneralAppearance, @Skin, @HeadNeck, @ChestCardiovascular, @Abdomen, @Genitourinary, @Neurologic, @Diagnosis, @ManagementPlan, @DateInitiallySeen, @ChiefComplaint, @HistoryOfPresentIllness, GETDATE())');
    const newId = insertResult.recordset && insertResult.recordset[0] ? insertResult.recordset[0].MedicalRecordID : null;
    const insertLog = { ob: false, past: false, family: false, review: false };
    if (newId) {
      // OB History
      const ob = r.obHistory || r.OBHistory || r.obstetricAndGynecologicHistory || r.ObstetricandGynecologicHistory;
      const obData = (ob && typeof ob === 'object') ? ob : {};
      await pool.request()
        .input('MedicalRecordID', newId)
        .input('MenarcheAge', obData.MenarcheAge || null)
        .input('MenstrualInterval', obData.MenstrualInterval || null)
        .input('MenstrualDuration', obData.MenstrualDuration || null)
        .input('MenstrualAmount', obData.MenstrualAmount || null)
        .input('MenstrualSymptoms', obData.MenstrualSymptoms || null)
          .input('LastMenstrualPeriod', parseDateOrNull(obData.LastMenstrualPeriod))
        .query('INSERT INTO OBHistory (MedicalRecordID, MenarcheAge, MenstrualInterval, MenstrualDuration, MenstrualAmount, MenstrualSymptoms, LastMenstrualPeriod) VALUES (@MedicalRecordID, @MenarcheAge, @MenstrualInterval, @MenstrualDuration, @MenstrualAmount, @MenstrualSymptoms, @LastMenstrualPeriod)');
      insertLog.ob = true;
      // Past Medical History
      const past = r.pastHistory || r.PastHistory || r.PastMedicalandMedicationHistory || r.pastMedical;
      const pastData = (past && typeof past === 'object') ? past : {};
      await pool.request()
        .input('MedicalRecordID', newId)
        .input('HasAsthma', pastData.HasAsthma ? 1 : 0)
        .input('HasDiabetes', pastData.HasDiabetes ? 1 : 0)
        .input('HasHypertension', pastData.HasHypertension ? 1 : 0)
        .input('HasHeartDisease', pastData.HasHeartDisease ? 1 : 0)
        .input('HasKidneyDisease', pastData.HasKidneyDisease ? 1 : 0)
        .query('INSERT INTO PastMedicalHistory (MedicalRecordID, HasAsthma, HasDiabetes, HasHypertension, HasHeartDisease, HasKidneyDisease) VALUES (@MedicalRecordID, @HasAsthma, @HasDiabetes, @HasHypertension, @HasHeartDisease, @HasKidneyDisease)');
      insertLog.past = true;
      // Family History
      const fam = r.familyHistory || r.FamilyHistory || r.family;
      const famData = (fam && typeof fam === 'object') ? fam : {};
      await pool.request()
        .input('MedicalRecordID', newId)
        .input('FamilyAsthma', famData.FamilyAsthma ? 1 : 0)
        .input('FamilyDiabetes', famData.FamilyDiabetes ? 1 : 0)
        .input('FamilyHypertension', famData.FamilyHypertension ? 1 : 0)
        .input('FamilyHeartDisease', famData.FamilyHeartDisease ? 1 : 0)
        .input('FamilyKidneyDisease', famData.FamilyKidneyDisease ? 1 : 0)
        .query('INSERT INTO FamilyHistory (MedicalRecordID, FamilyAsthma, FamilyDiabetes, FamilyHypertension, FamilyHeartDisease, FamilyKidneyDisease) VALUES (@MedicalRecordID, @FamilyAsthma, @FamilyDiabetes, @FamilyHypertension, @FamilyHeartDisease, @FamilyKidneyDisease)');
      insertLog.family = true;
      // Review Of Systems
      const review = r.review || r.Review || r.reviewOfSystems || r.ReviewOfSystems;
      const reviewData = (review && typeof review === 'object') ? review : {};
      await pool.request()
        .input('MedicalRecordID', newId)
        .input('Fever', reviewData.Fever ? 1 : 0)
        .input('Headache', reviewData.Headache ? 1 : 0)
        .input('Dizziness', reviewData.Dizziness ? 1 : 0)
        .input('BlurredVision', reviewData.BlurredVision ? 1 : 0)
        .input('ChestPain', reviewData.ChestPain ? 1 : 0)
        .input('ShortnessOfBreath', reviewData.ShortnessOfBreath ? 1 : 0)
        .input('Cough', reviewData.Cough ? 1 : 0)
        .input('Colds', reviewData.Colds ? 1 : 0)
        .input('AbdominalPain', reviewData.AbdominalPain ? 1 : 0)
        .input('Diarrhea', reviewData.Diarrhea ? 1 : 0)
        .input('Dysuria', reviewData.Dysuria ? 1 : 0)
        .input('Rashes', reviewData.Rashes ? 1 : 0)
        .input('Seizures', reviewData.Seizures ? 1 : 0)
        .input('Depression', reviewData.Depression ? 1 : 0)
        .input('EasyFatigue', reviewData.EasyFatigue ? 1 : 0)
        .input('AllergyNotes', reviewData.AllergyNotes || null)
        .input('BadHabit', reviewData.BadHabit || null)
        .query('INSERT INTO ReviewOfSystems (MedicalRecordID, Fever, Headache, Dizziness, BlurredVision, ChestPain, ShortnessOfBreath, Cough, Colds, AbdominalPain, Diarrhea, Dysuria, Rashes, Seizures, Depression, EasyFatigue, AllergyNotes, BadHabit) VALUES (@MedicalRecordID, @Fever, @Headache, @Dizziness, @BlurredVision, @ChestPain, @ShortnessOfBreath, @Cough, @Colds, @AbdominalPain, @Diarrhea, @Dysuria, @Rashes, @Seizures, @Depression, @EasyFatigue, @AllergyNotes, @BadHabit)');
      insertLog.review = true;
    }
    res.json({ success: true, medicalRecordId: newId, inserts: insertLog });
  } catch (err) {
    console.error('AddMedicalRecord Exception:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Medical record report endpoint (with joins)
router.get('/report/:patientID', async (req, res) => {
  const { patientID } = req.params;
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('patientID', patientID)
      .query(`
        SELECT TOP 1
          mr.MedicalRecordID AS MedicalRecordID,
          mr.PatientID AS PatientID,
          CONCAT(u.FirstName, ' ', u.MiddleName, ' ', u.LastName) AS PatientFullName,
          p.BirthDate AS BirthDate,
          p.HomeAddress AS PatientAddress,
          p.Sex AS Sex,
          p.Age AS Age,
          p.CollegeOffice AS College,
          u.PhoneNumber AS ContactNumber,
          cp.ContactPersonName AS EmContactPerson,
          cp.ContactPersonContactNo AS EmContactNumber,
          mr.VisitDate AS VisitDate,
          mr.BloodPressure AS BloodPressure,
          mr.CardiacRate AS CardiacRate,
          mr.RespiratoryRate AS RespiratoryRate,
          mr.Temperature AS Temperature,
          mr.OxygenSaturation AS OxygenSaturation,
          mr.ChiefComplaint AS ChiefComplaint,
          mr.HistoryOfPresentIllness AS HistoryOfPresentIllness,
          mr.DateInitiallySeen AS DateInitiallySeen,
          mr.GeneralAppearance AS GeneralAppearance,
          mr.Skin AS Skin,
          mr.HeadNeck AS HeadNeck,
          mr.ChestCardiovascular AS ChestCardiovascular,
          mr.Abdomen AS Abdomen,
          mr.Genitourinary AS Genitourinary,
          mr.Neurologic AS Neurologic,
          mr.Diagnosis AS Diagnosis,
          mr.ManagementPlan AS ManagementPlan,
          mr.CreationDate AS CreationDate,
          ob.MenarcheAge AS MenarcheAge,
          ob.MenstrualInterval AS MenstrualInterval,
          ob.MenstrualDuration AS MenstrualDuration,
          ob.MenstrualAmount AS MenstrualAmount,
          ob.MenstrualSymptoms AS MenstrualSymptoms,
          ob.LastMenstrualPeriod AS LastMenstrualPeriod,
          past.HasAsthma AS HasAsthma,
          past.HasDiabetes AS HasDiabetes,
          past.HasHypertension AS HasHypertension,
          past.HasHeartDisease AS HasHeartDisease,
          past.HasKidneyDisease AS HasKidneyDisease,
          family.FamilyAsthma AS FamilyAsthma,
          family.FamilyDiabetes AS FamilyDiabetes,
          family.FamilyHypertension AS FamilyHypertension,
          family.FamilyHeartDisease AS FamilyHeartDisease,
          family.FamilyKidneyDisease AS FamilyKidneyDisease,
          review.Fever AS Fever,
          review.Headache AS Headache,
          review.Dizziness AS Dizziness,
          review.BlurredVision AS BlurredVision,
          review.ChestPain AS ChestPain,
          review.ShortnessOfBreath AS ShortnessOfBreath,
          review.Cough AS Cough,
          review.Colds AS Colds,
          review.AbdominalPain AS AbdominalPain,
          review.Diarrhea AS Diarrhea,
          review.Dysuria AS Dysuria,
          review.Rashes AS Rashes,
          review.Seizures AS Seizures,
          review.Depression AS Depression,
          review.EasyFatigue AS EasyFatigue,
          review.AllergyNotes AS AllergyNotes,
          review.BadHabit AS BadHabit
        FROM MedicalRecords mr
        LEFT JOIN OBHistory ob ON mr.MedicalRecordID = ob.MedicalRecordID
        LEFT JOIN PastMedicalHistory past ON mr.MedicalRecordID = past.MedicalRecordID
        LEFT JOIN FamilyHistory family ON mr.MedicalRecordID = family.MedicalRecordID
        LEFT JOIN ReviewOfSystems review ON mr.MedicalRecordID = review.MedicalRecordID
        LEFT JOIN Patient p ON mr.PatientID = p.PatientID
        LEFT JOIN Users u ON p.UserID = u.UserID
        LEFT JOIN ContactPerson cp ON p.UserID = cp.UserID
        WHERE mr.PatientID = @patientID
        ORDER BY mr.VisitDate DESC
      `);
    if (result.recordset.length === 0) {
      return res.status(404).json({ message: 'No medical record found.' });
    }
    res.json(result.recordset[0]);
  } catch (err) {
    console.error('MedicalRecordReport Exception:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Final export
module.exports = router;
