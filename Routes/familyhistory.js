// routes/familyhistory.js
const express = require('express');
const router = express.Router();
const poolPromise = require('../db');
const generic = require('../Controllers/genericController')(poolPromise);

// ----------------------------------------------------
// GENERIC CRUD ROUTES FOR FamilyHistory
// ----------------------------------------------------
router.get('/', generic.getAll("FamilyHistory", "FamilyHistoryID"));      // Get all family history records
router.post('/', generic.add("FamilyHistory", "FamilyHistoryID"));        // Add family history
router.put('/:id', generic.edit("FamilyHistory", "FamilyHistoryID"));     // Update family history
router.delete('/:id', generic.delete("FamilyHistory", "FamilyHistoryID"));// Delete family history

// ----------------------------------------------------
// GET FAMILY HISTORY BY MEDICAL RECORD ID
// ----------------------------------------------------
router.get('/medical-record/:medicalRecordId', async (req, res) => {
  const medicalRecordId = req.params.medicalRecordId;

  try {
    const pool = await poolPromise;

    const result = await pool.request()
      .input('medicalRecordId', medicalRecordId)
      .query(`
        SELECT *
        FROM FamilyHistory
        WHERE MedicalRecordID = @medicalRecordId
      `);

    if (result.recordset.length > 0) {
      return res.json({ success: true, data: result.recordset[0] });
    } else {
      return res.json({ success: false, message: 'Family history not found for this medical record' });
    }

  } catch (err) {
    console.error("Error fetching family history:", err);
    return res.status(500).json({ success: false, message: 'Server error: ' + err.message });
  }
});

module.exports = router;
