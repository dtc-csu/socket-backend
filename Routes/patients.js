// routes/patient.js
const express = require('express');
const router = express.Router();
const poolPromise = require('../db');
const generic = require('../Controllers/genericController')(poolPromise);

// ====================================================
// #region MAPPINGS
// ====================================================
const patientToModel = (patient, user = null) => {
  if (!patient) return null;

  return {
    PatientID: patient.PatientID,
    UserID: patient.UserID,
    BirthDate: patient.BirthDate,
    Age: patient.Age,
    Religion: patient.Religion,
    Nationality: patient.Nationality,
    NickName: patient.NickName,
    CivilStatus: patient.CivilStatus,
    Sex: patient.Sex,
    HomeAddress: patient.HomeAddress,
    HomeNo: patient.HomeNo,
    OfficeNo: patient.OfficeNo,
    Occupation: patient.Occupation,
    CitizenShips: patient.CitizenShips,
    CollegeOffice: patient.CollegeOffice,
    Course: patient.Course,
    YearLevel: patient.YearLevel,
    CreationDate: patient.CreationDate,
    PicFilePath: patient.PicFilePath,
    FirstName: user?.FirstName || '',
    MiddleName: user?.MiddleName || '',
    LastName: user?.LastName || '',
    FullName: user ? `${user.FirstName} ${user.MiddleName || ''} ${user.LastName}`.trim() : '',
    Email: user?.Email || '',
    PhoneNumber: user?.PhoneNumber || ''
  };
};
// #endregion MAPPINGS

// ====================================================
// #region CREATE
// ====================================================
router.post('/', generic.add("Patient", "PatientID"));
// #endregion CREATE

// ====================================================
// #region READ
// ====================================================

// ✅ Get all patients
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
      WHERE p.EndDate IS NULL OR p.EndDate > NOW()
      ORDER BY p.PatientID
    `);
    res.json({ success: true, data: result.recordset });
  } catch (err) {
    console.error('Error fetching all patients:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ✅ Get patient by ID
router.get('/patient/:patientId', async (req, res) => {
  const patientId = req.params.patientId;

  try {
    const pool = await poolPromise;

    // 1️⃣ Get the patient record
    const patientResult = await pool.request()
      .input('patientId', patientId)
      .query('SELECT * FROM Patient WHERE PatientID = @patientId');

    if (patientResult.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Patient with ID ${patientId} not found`
      });
    }

    const patient = patientResult.recordset[0];

    // 2️⃣ Get user info to populate FullName and ContactNo
    let user = null;
    if (patient.UserID) {
      const userResult = await pool.request()
        .input('userId', patient.UserID)
        .query('SELECT * FROM Users WHERE UserID = @userId');

      if (userResult.recordset.length > 0) {
        user = userResult.recordset[0];
      }
    }

    const model = patientToModel(patient, user);
    res.json({ success: true, data: model });

  } catch (err) {
    console.error('Error fetching patient:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ✅ Get patient info by UserID
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
    console.error('Error fetching patient info:', err);
    return res.status(500).json({ success: false, message: 'Server error: ' + err.message });
  }
});

// ✅ Get archived patients
router.get('/archived/list', async (req, res) => {
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
      WHERE p.EndDate IS NOT NULL AND p.EndDate <= NOW()
      ORDER BY p.EndDate DESC
    `);
    res.json({ success: true, data: result.recordset });
  } catch (err) {
    console.error('Error fetching archived patients:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// #endregion READ

// ====================================================
// #region UPDATE
// ====================================================
router.put('/:id', generic.edit("Patient", "PatientID"));

// ✅ Archive patient (soft delete)
router.put('/archive/:patientId', async (req, res) => {
  const patientId = req.params.patientId;
  try {
    const pool = await poolPromise;
    await pool.request()
      .input('patientId', patientId)
      .query(`UPDATE Patient SET EndDate = NOW() WHERE PatientID = @patientId`);
    
    res.json({ success: true, message: `Patient ${patientId} archived successfully` });
  } catch (err) {
    console.error('Error archiving patient:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ✅ Restore patient (unarchive)
router.put('/restore/:patientId', async (req, res) => {
  const patientId = req.params.patientId;
  try {
    const pool = await poolPromise;
    await pool.request()
      .input('patientId', patientId)
      .query(`UPDATE Patient SET EndDate = NULL WHERE PatientID = @patientId`);
    
    res.json({ success: true, message: `Patient ${patientId} restored successfully` });
  } catch (err) {
    console.error('Error restoring patient:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// #endregion UPDATE

// ====================================================
// #region DELETE
// ====================================================
router.delete('/:id', generic.delete("Patient", "PatientID"));
// #endregion DELETE

module.exports = router;
