// routes/patients.js
const express = require('express');
const router = express.Router();
const poolPromise = require('../db');
const generic = require('../Controllers/genericController')(poolPromise);

// ----------------------------------------------------
// GET ALL PATIENTS WITH ENRICHED USER DATA
// ----------------------------------------------------
// Medical record grid endpoint
router.get('/medical-records/grid', async (req, res) => {
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
        u.FirstName + ' ' + u.MiddleName + ' ' + u.LastName AS PatientFullName
      FROM MedicalRecords mr
      INNER JOIN Patient p ON mr.PatientID = p.PatientID
      INNER JOIN Users u ON p.UserID = u.UserID
      ORDER BY mr.VisitDate DESC
    `);
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Medical record report endpoint
router.get('/medical-records/report/:patientId', async (req, res) => {
  const patientId = req.params.patientId;
  try {
    const pool = await poolPromise;
    // Get latest medical record for patient
    const recordResult = await pool.request()
      .input('patientId', patientId)
      .query(`SELECT TOP 1 * FROM MedicalRecords WHERE PatientID = @patientId ORDER BY VisitDate DESC`);
    const record = recordResult.recordset[0];
    if (!record) return res.json(null);
    const medicalRecordID = record.MedicalRecordID;

    // Related medical tables
    const ob = await pool.request().input('medicalRecordID', medicalRecordID).query(`SELECT TOP 1 * FROM OBHistory WHERE MedicalRecordID = @medicalRecordID`);
    const past = await pool.request().input('medicalRecordID', medicalRecordID).query(`SELECT TOP 1 * FROM PastMedicalHistory WHERE MedicalRecordID = @medicalRecordID`);
    const family = await pool.request().input('medicalRecordID', medicalRecordID).query(`SELECT TOP 1 * FROM FamilyHistory WHERE MedicalRecordID = @medicalRecordID`);
    const review = await pool.request().input('medicalRecordID', medicalRecordID).query(`SELECT TOP 1 * FROM ReviewOfSystem WHERE MedicalRecordID = @medicalRecordID`);

    // Patient Table
    const patientResult = await pool.request().input('patientId', patientId).query(`SELECT * FROM Patient WHERE PatientID = @patientId`);
    const patient = patientResult.recordset[0];

    // Patient User (Name Source)
    let patientUser = null;
    if (patient && patient.UserID) {
      const userResult = await pool.request().input('userId', patient.UserID).query(`SELECT * FROM Users WHERE UserID = @userId`);
      patientUser = userResult.recordset[0];
    }
    let patientcontact = null;
    if (patient && patient.UserID) {
      const contactResult = await pool.request().input('userId', patient.UserID).query(`SELECT TOP 1 * FROM ContactPerson WHERE UserID = @userId`);
      patientcontact = contactResult.recordset[0];
    }

    // Build report model
    const report = {
      MedicalRecordID: record.MedicalRecordID,
      PatientID: record.PatientID,
      PatientFullName: patientUser ? `${patientUser.FirstName} ${patientUser.MiddleName} ${patientUser.LastName}` : '',
      BirthDate: patient?.BirthDate,
      PatientAddress: patient?.HomeAddress,
      Sex: patient?.Sex,
      Age: patient?.Age ?? 0,
      College: patient?.CollegeOffice,
      ContactNumber: patientUser?.PhoneNumber,
      EmContactPerson: patientcontact?.ContactPersonName,
      EmContactNumber: patientcontact?.ContactPersonContactNo,
      VisitDate: record.VisitDate,
      BloodPressure: record.BloodPressure,
      CardiacRate: record.CardiacRate,
      RespiratoryRate: record.RespiratoryRate,
      Temperature: record.Temperature,
      OxygenSaturation: record.OxygenSaturation,
      ChiefComplaint: record.ChiefComplaint,
      HistoryOfPresentIllness: record.HistoryOfPresentIllness,
      DateInitiallySeen: record.DateInitiallySeen,
      GeneralAppearance: record.GeneralAppearance,
      Skin: record.Skin,
      HeadNeck: record.HeadNeck,
      ChestCardiovascular: record.ChestCardiovascular,
      Abdomen: record.Abdomen,
      Genitourinary: record.Genitourinary,
      Neurologic: record.Neurologic,
      Diagnosis: record.Diagnosis,
      ManagementPlan: record.ManagementPlan,
      CreationDate: record.CreationDate,
      MenarcheAge: ob.recordset[0]?.MenarcheAge,
      MenstrualInterval: ob.recordset[0]?.MenstrualInterval,
      MenstrualDuration: ob.recordset[0]?.MenstrualDuration,
      MenstrualAmount: ob.recordset[0]?.MenstrualAmount,
      MenstrualSymptoms: ob.recordset[0]?.MenstrualSymptoms,
      LastMenstrualPeriod: ob.recordset[0]?.LastMenstrualPeriod,
      HasAsthma: past.recordset[0]?.HasAsthma,
      HasDiabetes: past.recordset[0]?.HasDiabetes,
      HasHypertension: past.recordset[0]?.HasHypertension,
      HasHeartDisease: past.recordset[0]?.HasHeartDisease,
      HasKidneyDisease: past.recordset[0]?.HasKidneyDisease,
      FamilyAsthma: family.recordset[0]?.FamilyAsthma,
      FamilyDiabetes: family.recordset[0]?.FamilyDiabetes,
      FamilyHypertension: family.recordset[0]?.FamilyHypertension,
      FamilyHeartDisease: family.recordset[0]?.FamilyHeartDisease,
      FamilyKidneyDisease: family.recordset[0]?.FamilyKidneyDisease,
      Fever: review.recordset[0]?.Fever,
      Headache: review.recordset[0]?.Headache,
      Dizziness: review.recordset[0]?.Dizziness,
      BlurredVision: review.recordset[0]?.BlurredVision,
      ChestPain: review.recordset[0]?.ChestPain,
      ShortnessOfBreath: review.recordset[0]?.ShortnessOfBreath,
      Cough: review.recordset[0]?.Cough,
      Colds: review.recordset[0]?.Colds,
      AbdominalPain: review.recordset[0]?.AbdominalPain,
      Diarrhea: review.recordset[0]?.Diarrhea,
      Dysuria: review.recordset[0]?.Dysuria,
      Rashes: review.recordset[0]?.Rashes,
      Seizures: review.recordset[0]?.Seizures,
      Depression: review.recordset[0]?.Depression,
      EasyFatigue: review.recordset[0]?.EasyFatigue,
      AllergyNotes: review.recordset[0]?.AllergyNotes,
      BadHabit: review.recordset[0]?.BadHabit
    };
    res.json(report);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
router.get('/', async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query(`
      SELECT 
        p.*,
        u.FirstName,
        u.MiddleName,
        u.LastName,
        u.Email,
        u.PhoneNumber,
        u.Role,
        CONCAT(u.FirstName, ' ', COALESCE(CONCAT(u.MiddleName, ' '), ''), u.LastName) AS FullName
      FROM Patient p
      LEFT JOIN Users u ON p.UserID = u.UserID
      ORDER BY p.PatientID
    `);
    res.json(result.recordset);
  } catch (err) {
    console.error("Error fetching all patients:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ----------------------------------------------------
// GET PATIENT BY PATIENTID (STRING KEY)
// ----------------------------------------------------
// GET PATIENT BY PATIENTID (STRING KEY)
router.get('/patient/:patientId', async (req, res) => {
  const patientId = req.params.patientId;
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('patientId', patientId)
      .query(`
        SELECT 
          p.*,
          u.FirstName,
          u.MiddleName,
          u.LastName,
          u.Email,
          u.PhoneNumber,
          u.Role,
          CONCAT(u.FirstName, ' ', COALESCE(CONCAT(u.MiddleName, ' '), ''), u.LastName) AS FullName
        FROM Patient p
        LEFT JOIN Users u ON p.UserID = u.UserID
        WHERE p.PatientID = @patientId
      `);
    
    if (result.recordset.length === 0) {
      return res.status(404).json({ success: false, message: "Patient not found" });
    }

    // IMPORTANT: return plain patient object for C#
    res.json(result.recordset[0]);
  } catch (err) {
    console.error("Error fetching patient:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ----------------------------------------------------
// GET PATIENT INFO BY USERID
// ----------------------------------------------------
router.get('/by-user/:userId', async (req, res) => {
  const userId = req.params.userId;

  try {
    const pool = await poolPromise;

    const result = await pool.request()
      .input('userId', userId)
      .query(`
        SELECT 
          p.*,
          u.FirstName,
          u.MiddleName,
          u.LastName,
          u.Email,
          u.PhoneNumber,
          u.Role,
          CONCAT(u.FirstName, ' ', COALESCE(CONCAT(u.MiddleName, ' '), ''), u.LastName) AS FullName
        FROM Patient p
        LEFT JOIN Users u ON p.UserID = u.UserID
        WHERE p.UserID = @userId
      `);

    if (result.recordset.length > 0) {
      return res.json({ success: true, patient: result.recordset[0] });
    } else {
      return res.json({ success: false, message: 'Patient not found for this user' });
    }

  } catch (err) {
    console.error("Error fetching patient info:", err);
    return res.status(500).json({ success: false, message: 'Server error: ' + err.message });
  }
});

// ----------------------------------------------------
// CREATE NEW PATIENT
// ----------------------------------------------------
router.post('/', async (req, res) => {
  const model = req.body;

  // Validation
  if (!model || !model.UserID) {
    return res.status(400).json({
      success: false,
      message: 'AddPatient failed: model or UserID is null'
    });
  }

  try {
    const pool = await poolPromise;

    // Check if user exists
    const userResult = await pool.request()
      .input('userId', model.UserID)
      .query('SELECT * FROM Users WHERE UserID = @userId');

    if (userResult.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: `User with ID ${model.UserID} not found`
      });
    }

    // Check if patient already exists
    if (model.PatientID) {
      const existingPatient = await pool.request()
        .input('patientId', model.PatientID)
        .query('SELECT PatientID FROM Patient WHERE PatientID = @patientId');

      if (existingPatient.recordset.length > 0) {
        return res.status(409).json({
          success: false,
          message: `Patient with ID ${model.PatientID} already exists`
        });
      }
    }

    // Insert patient record
    await pool.request()
      .input('PatientID', model.PatientID || null)
      .input('UserID', model.UserID)
      .input('BirthDate', model.BirthDate || null)
      .input('Age', model.Age || null)
      .input('Religion', model.Religion?.trim() || null)
      .input('Nationality', model.Nationality?.trim() || null)
      .input('NickName', model.NickName?.trim() || null)
      .input('CivilStatus', model.CivilStatus?.trim() || null)
      .input('Sex', model.Sex?.trim() || null)
      .input('HomeAddress', model.HomeAddress?.trim() || null)
      .input('HomeNo', model.HomeNo || null)
      .input('OfficeNo', model.OfficeNo || null)
      .input('Occupation', model.Occupation?.trim() || null)
      .input('CitizenShips', model.CitizenShips?.trim() || null)
      .input('CollegeOffice', model.CollegeOffice?.trim() || null)
      .input('Course', model.Course?.trim() || null)
      .input('YearLevel', model.YearLevel?.trim() || null)
      .input('PicFilePath', model.PicFilePath || null)
      .query(`
        INSERT INTO Patient 
        (PatientID, UserID, BirthDate, Age, Religion, Nationality, NickName, CivilStatus, Sex, HomeAddress, HomeNo, OfficeNo, Occupation, CitizenShips, CollegeOffice, Course, YearLevel, PicFilePath, CreationDate)
        VALUES 
        (@PatientID, @UserID, @BirthDate, @Age, @Religion, @Nationality, @NickName, @CivilStatus, @Sex, @HomeAddress, @HomeNo, @OfficeNo, @Occupation, @CitizenShips, @CollegeOffice, @Course, @YearLevel, @PicFilePath, GETDATE())
      `);

    res.json({
      success: true,
      message: `Patient record created successfully with PatientID=${model.PatientID}`
    });

  } catch (err) {
    console.error('AddPatient Exception:', err);
    res.status(500).json({
      success: false,
      message: `AddPatient Exception: ${err.message}`
    });
  }
});

// ----------------------------------------------------
// UPDATE PATIENT BY PATIENTID (STRING KEY)
// ----------------------------------------------------
router.put('/patient/:patientId', async (req, res) => {
  const patientId = req.params.patientId;
  const patientData = req.body;

  try {
    const pool = await poolPromise;
    
    // Start a transaction to update both Patient and Users tables
    await poolPromise.transaction(async (createRequest) => {
      // 1. Update Patient table
      const patientFields = { ...patientData };
      delete patientFields.Email;
      delete patientFields.PhoneNumber;
      delete patientFields.FirstName;
      delete patientFields.MiddleName;
      delete patientFields.LastName;
      delete patientFields.Role;
      delete patientFields.FullName;
      
      const patientKeys = Object.keys(patientFields).filter(k => k !== 'PatientID');
      
      if (patientKeys.length > 0) {
        const setClause = patientKeys.map((k, i) => `${k}=@param${i}`).join(',');
        const request = createRequest();
        patientKeys.forEach((k, i) => request.input(`param${i}`, patientFields[k]));
        request.input('patientId', patientId);
        
        await request.query(`UPDATE Patient SET ${setClause} WHERE PatientID=@patientId`);
      }
      
      // 2. Optionally update Users table (email, phone, names)
      if (patientData.Email || patientData.PhoneNumber || patientData.FirstName || 
          patientData.MiddleName || patientData.LastName) {
        
        // Get UserID first
        const getUserRequest = createRequest();
        getUserRequest.input('patientId', patientId);
        const userIdResult = await getUserRequest.query(
          `SELECT UserID FROM Patient WHERE PatientID=@patientId`
        );
        
        if (userIdResult.recordset.length > 0 && userIdResult.recordset[0].UserID) {
          const userId = userIdResult.recordset[0].UserID;
          const userFields = [];
          const userRequest = createRequest();
          
          if (patientData.Email) {
            userFields.push('Email=@email');
            userRequest.input('email', patientData.Email);
          }
          if (patientData.PhoneNumber) {
            userFields.push('PhoneNumber=@phone');
            userRequest.input('phone', patientData.PhoneNumber);
          }
          if (patientData.FirstName) {
            userFields.push('FirstName=@firstName');
            userRequest.input('firstName', patientData.FirstName);
          }
          if (patientData.MiddleName !== undefined) {
            userFields.push('MiddleName=@middleName');
            userRequest.input('middleName', patientData.MiddleName);
          }
          if (patientData.LastName) {
            userFields.push('LastName=@lastName');
            userRequest.input('lastName', patientData.LastName);
          }
          
          if (userFields.length > 0) {
            userRequest.input('userId', userId);
            await userRequest.query(`UPDATE Users SET ${userFields.join(',')} WHERE UserID=@userId`);
          }
        }
      }
    });
    
    // Return updated patient data
    const result = await pool.request()
      .input('patientId', patientId)
      .query(`
        SELECT 
          p.*,
          u.FirstName,
          u.MiddleName,
          u.LastName,
          u.Email,
          u.PhoneNumber,
          CONCAT(u.FirstName, ' ', COALESCE(CONCAT(u.MiddleName, ' '), ''), u.LastName) AS FullName
        FROM Patient p
        LEFT JOIN Users u ON p.UserID = u.UserID
        WHERE p.PatientID = @patientId
      `);
    
    res.json({ success: true, message: `Patient ${patientId} updated successfully`, patient: result.recordset[0] });
  } catch (err) {
    console.error("Error updating patient:", err);
    res.status(500).json({ success: false, message: `UpdatePatient Exception: ${err.message}` });
  }
});

// ----------------------------------------------------
// DELETE PATIENT BY PATIENTID (STRING KEY)
// ----------------------------------------------------
router.delete('/patient/:patientId', async (req, res) => {
  const patientId = req.params.patientId;
  try {
    const pool = await poolPromise;
    await pool.request()
      .input('patientId', patientId)
      .query(`DELETE FROM Patient WHERE PatientID = @patientId`);
    
    res.json({ success: true, message: `Patient ${patientId} deleted successfully` });
  } catch (err) {
    console.error("Error deleting patient:", err);
    res.status(500).json({ success: false, message: `DeletePatient Exception: ${err.message}` });
  }
});

// ----------------------------------------------------
// LEGACY ROUTES (for backward compatibility)
// ----------------------------------------------------
router.put('/:id', generic.edit("Patient", "PatientID"));     // Update by numeric/string ID
router.delete('/:id', generic.delete("Patient", "PatientID"));// Delete by numeric/string ID

module.exports = router;
