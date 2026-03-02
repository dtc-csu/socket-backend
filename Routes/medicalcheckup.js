// routes/medicalcheckup.js
const express = require('express');
const router = express.Router();
const poolPromise = require('../db');
const generic = require('../Controllers/genericController')(poolPromise);

// ----------------------------------------------------
// GENERIC CRUD ROUTES FOR MedicalCheckup
// ----------------------------------------------------
router.get('/', generic.getAll("MedicalCheckup", "MedicalCheckupID"));      // Get all medical checkups
router.post('/', generic.add("MedicalCheckup", "MedicalCheckupID"));        // Add medical checkup
router.put('/:id', generic.edit("MedicalCheckup", "MedicalCheckupID"));     // Update medical checkup
router.delete('/:id', generic.delete("MedicalCheckup", "MedicalCheckupID"));// Delete medical checkup

// ----------------------------------------------------
// GET MEDICAL CHECKUPS BY PATIENT ID
// ----------------------------------------------------
router.get('/patient/:patientId', async (req, res) => {
  const patientId = req.params.patientId;

  try {
    const pool = await poolPromise;

    const result = await pool.request()
      .input('patientId', patientId)
      .query(`
        SELECT *
        FROM MedicalCheckup
        WHERE PatientID = @patientId
        ORDER BY CheckupDate DESC
      `);

    return res.json(result.recordset);

  } catch (err) {
    console.error("Error fetching medical checkups:", err);
    return res.status(500).json({ success: false, message: 'Server error: ' + err.message });
  }
});

// ----------------------------------------------------
// GET MEDICAL CHECKUPS BY DOCTOR ID
// ----------------------------------------------------
router.get('/doctor/:doctorId', async (req, res) => {
  const doctorId = req.params.doctorId;

  try {
    const pool = await poolPromise;

    const result = await pool.request()
      .input('doctorId', doctorId)
      .query(`
        SELECT *
        FROM MedicalCheckup
        WHERE DoctorID = @doctorId
        ORDER BY CheckupDate DESC
      `);

    return res.json(result.recordset);

  } catch (err) {
    console.error("Error fetching medical checkups by doctor:", err);
    return res.status(500).json({ success: false, message: 'Server error: ' + err.message });
  }
});

module.exports = router;
