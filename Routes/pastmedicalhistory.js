// routes/pastmedicalhistory.js
const express = require('express');
const router = express.Router();
const poolPromise = require('../db');
const generic = require('../Controllers/genericController')(poolPromise);

// ----------------------------------------------------
// GENERIC CRUD ROUTES FOR PastMedicalHistory
// ----------------------------------------------------
router.get('/', generic.getAll("PastMedicalHistory", "HistoryID"));      // Get all past medical history records
router.post('/', generic.add("PastMedicalHistory", "HistoryID"));        // Add past medical history
router.put('/:id', generic.edit("PastMedicalHistory", "HistoryID"));     // Update past medical history
router.delete('/:id', generic.delete("PastMedicalHistory", "HistoryID"));// Delete past medical history

// ----------------------------------------------------
// GET PAST MEDICAL HISTORY BY MEDICAL RECORD ID
// ----------------------------------------------------
router.get('/medical-record/:medicalRecordId', async (req, res) => {
  const medicalRecordId = req.params.medicalRecordId;

  try {
    const pool = await poolPromise;

    const result = await pool.request()
      .input('medicalRecordId', medicalRecordId)
      .query(`
        SELECT *
        FROM PastMedicalHistory
        WHERE MedicalRecordID = @medicalRecordId
      `);

    if (result.recordset.length > 0) {
      return res.json({ success: true, data: result.recordset[0] });
    } else {
      return res.json({ success: false, message: 'Past medical history not found for this medical record' });
    }

  } catch (err) {
    console.error("Error fetching past medical history:", err);
    return res.status(500).json({ success: false, message: 'Server error: ' + err.message });
  }
});

module.exports = router;
