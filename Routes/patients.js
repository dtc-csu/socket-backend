// routes/patient.js
const express = require('express');
const router = express.Router();
const poolPromise = require('../db');
const generic = require('../Controllers/genericController')(poolPromise);

// ----------------------------------------------------
// GENERIC CRUD ROUTES FOR PATIENT
// ----------------------------------------------------
router.get('/', generic.getAll("Patient", "PatientIDNoAuto"));      // Get all patients
router.post('/', generic.add("Patient", "PatientIDNoAuto"));        // Add patient
router.put('/:id', generic.edit("Patient", "PatientIDNoAuto"));     // Update patient
router.delete('/:id', generic.delete("Patient", "PatientIDNoAuto"));// Delete patient

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
        SELECT *
        FROM Patient
        WHERE UserID = @userId
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

module.exports = router;
