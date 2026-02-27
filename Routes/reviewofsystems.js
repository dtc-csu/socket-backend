// routes/reviewofsystems.js
const express = require('express');
const router = express.Router();
const poolPromise = require('../db');
const generic = require('../Controllers/genericController')(poolPromise);

// ----------------------------------------------------
// GENERIC CRUD ROUTES FOR ReviewOfSystems
// ----------------------------------------------------
router.get('/', generic.getAll("ReviewOfSystems", "ReviewID"));      // Get all review of systems records
router.post('/', generic.add("ReviewOfSystems", "ReviewID"));        // Add review of systems
router.put('/:id', generic.edit("ReviewOfSystems", "ReviewID"));     // Update review of systems
router.delete('/:id', generic.delete("ReviewOfSystems", "ReviewID"));// Delete review of systems

// ----------------------------------------------------
// GET REVIEW OF SYSTEMS BY MEDICAL RECORD ID
// ----------------------------------------------------
router.get('/medical-record/:medicalRecordId', async (req, res) => {
  const medicalRecordId = req.params.medicalRecordId;

  try {
    const pool = await poolPromise;

    const result = await pool.request()
      .input('medicalRecordId', medicalRecordId)
      .query(`
        SELECT *
        FROM ReviewOfSystems
        WHERE MedicalRecordID = @medicalRecordId
      `);

    if (result.recordset.length > 0) {
      return res.json({ success: true, data: result.recordset[0] });
    } else {
      return res.json({ success: false, message: 'Review of systems not found for this medical record' });
    }

  } catch (err) {
    console.error("Error fetching review of systems:", err);
    return res.status(500).json({ success: false, message: 'Server error: ' + err.message });
  }
});

module.exports = router;
