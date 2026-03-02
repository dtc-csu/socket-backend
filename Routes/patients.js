// routes/patient.js
const express = require('express');
const router = express.Router();
const poolPromise = require('../db');
const generic = require('../Controllers/genericController')(poolPromise);

// ----------------------------------------------------
// GET ALL PATIENTS WITH ENRICHED USER DATA (ACTIVE ONLY)
// ----------------------------------------------------
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
    res.json(result.recordset);
  } catch (err) {
    console.error("Error fetching all patients:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ----------------------------------------------------
// GET ARCHIVED PATIENTS (SOFT DELETED)
// ----------------------------------------------------
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
    res.json(result.recordset);
  } catch (err) {
    console.error("Error fetching archived patients:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ----------------------------------------------------
// GET PATIENT BY PATIENTID (STRING KEY)
// ----------------------------------------------------
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
    
    res.json({ success: true, data: result.recordset[0] });
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
router.post('/', generic.add("Patient", "PatientID"));

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
    
    res.json({ success: true, patient: result.recordset[0] });
  } catch (err) {
    console.error("Error updating patient:", err);
    res.status(500).json({ success: false, message: err.message });
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
    
    res.json({ success: true, message: `Patient ${patientId} deleted` });
  } catch (err) {
    console.error("Error deleting patient:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ----------------------------------------------------
// ARCHIVE PATIENT (SOFT DELETE)
// ----------------------------------------------------
router.put('/archive/:patientId', async (req, res) => {
  const patientId = req.params.patientId;
  try {
    const pool = await poolPromise;
    await pool.request()
      .input('patientId', patientId)
      .input('now', new Date())
      .query(`UPDATE Patient SET EndDate = @now WHERE PatientID = @patientId`);
    
    res.json({ success: true, message: `Patient ${patientId} archived` });
  } catch (err) {
    console.error("Error archiving patient:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ----------------------------------------------------
// RESTORE PATIENT (UNARCHIVE)
// ----------------------------------------------------
router.put('/restore/:patientId', async (req, res) => {
  const patientId = req.params.patientId;
  try {
    const pool = await poolPromise;
    await pool.request()
      .input('patientId', patientId)
      .query(`UPDATE Patient SET EndDate = NULL WHERE PatientID = @patientId`);
    
    res.json({ success: true, message: `Patient ${patientId} restored` });
  } catch (err) {
    console.error("Error restoring patient:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ----------------------------------------------------
// LEGACY ROUTES (for backward compatibility)
// ----------------------------------------------------
router.put('/:id', generic.edit("Patient", "PatientID"));     // Update by numeric/string ID
router.delete('/:id', generic.delete("Patient", "PatientID"));// Delete by numeric/string ID

module.exports = router;
