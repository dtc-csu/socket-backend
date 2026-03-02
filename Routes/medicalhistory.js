// routes/medicalhistory.js
const express = require('express');
const router = express.Router();
const poolPromise = require('../db');
const generic = require('../Controllers/genericController')(poolPromise);

// ----------------------------------------------------
// GENERIC CRUD ROUTES FOR MedicalHistory
// ----------------------------------------------------
router.get('/', async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query(`SELECT * FROM MedicalHistory ORDER BY CreatedAt DESC`);
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/', generic.add("MedicalHistory", "MedicalHistoryID"));        // Add medical history
router.put('/:id', generic.edit("MedicalHistory", "MedicalHistoryID"));     // Update medical history
router.delete('/:id', generic.delete("MedicalHistory", "MedicalHistoryID"));// Delete medical history

// ----------------------------------------------------
// GET MEDICAL HISTORY BY PATIENT ID
// ----------------------------------------------------
router.get('/patient/:patientId', async (req, res) => {
  const patientId = req.params.patientId;

  try {
    const pool = await poolPromise;

    const result = await pool.request()
      .input('patientId', patientId)
      .query(`
        SELECT *
        FROM MedicalHistory
        WHERE PatientID = @patientId
        ORDER BY CreatedAt DESC
      `);

    return res.json(result.recordset);

  } catch (err) {
    console.error("Error fetching medical history:", err);
    return res.status(500).json({ success: false, message: 'Server error: ' + err.message });
  }
});

// ----------------------------------------------------
// GET MEDICAL HISTORY BY ID
// ----------------------------------------------------
router.get('/:id', async (req, res) => {
  const id = req.params.id;

  try {
    const pool = await poolPromise;

    const result = await pool.request()
      .input('id', id)
      .query(`
        SELECT *
        FROM MedicalHistory
        WHERE MedicalHistoryID = @id
      `);

    if (result.recordset.length > 0) {
      return res.json(result.recordset[0]);
    } else {
      return res.status(404).json({ success: false, message: 'Medical history not found' });
    }

  } catch (err) {
    console.error("Error fetching medical history:", err);
    return res.status(500).json({ success: false, message: 'Server error: ' + err.message });
  }
});

module.exports = router;
