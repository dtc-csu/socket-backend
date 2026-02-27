// routes/obhistory.js
const express = require('express');
const router = express.Router();
const poolPromise = require('../db');
const generic = require('../Controllers/genericController')(poolPromise);

// ----------------------------------------------------
// GENERIC CRUD ROUTES FOR OBHistory
// ----------------------------------------------------
router.get('/', generic.getAll("OBHistory", "OBHistoryID"));      // Get all OB history records
router.post('/', generic.add("OBHistory", "OBHistoryID"));        // Add OB history
router.put('/:id', generic.edit("OBHistory", "OBHistoryID"));     // Update OB history
router.delete('/:id', generic.delete("OBHistory", "OBHistoryID"));// Delete OB history

// ----------------------------------------------------
// GET OB HISTORY BY MEDICAL RECORD ID
// ----------------------------------------------------
router.get('/medical-record/:medicalRecordId', async (req, res) => {
  const medicalRecordId = req.params.medicalRecordId;

  try {
    const pool = await poolPromise;

    const result = await pool.request()
      .input('medicalRecordId', medicalRecordId)
      .query(`
        SELECT *
        FROM OBHistory
        WHERE MedicalRecordID = @medicalRecordId
      `);

    if (result.recordset.length > 0) {
      return res.json({ success: true, data: result.recordset[0] });
    } else {
      return res.json({ success: false, message: 'OB history not found for this medical record' });
    }

  } catch (err) {
    console.error("Error fetching OB history:", err);
    return res.status(500).json({ success: false, message: 'Server error: ' + err.message });
  }
});

module.exports = router;
