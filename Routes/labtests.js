// routes/labtests.js
const express = require('express');
const router = express.Router();
const poolPromise = require('../db');
const generic = require('../Controllers/genericController')(poolPromise);

// ----------------------------------------------------
// GENERIC CRUD ROUTES FOR LabTestRequests
// ----------------------------------------------------
router.get('/', generic.getAll("LabTestRequests", "LabTestRequestID"));      // Get all lab test requests
router.post('/', generic.add("LabTestRequests", "LabTestRequestID"));        // Add lab test request
router.put('/:id', generic.edit("LabTestRequests", "LabTestRequestID"));     // Update lab test request
router.delete('/:id', generic.delete("LabTestRequests", "LabTestRequestID"));// Delete lab test request

// ----------------------------------------------------
// GET LAB TEST REQUESTS BY PATIENT ID
// ----------------------------------------------------
router.get('/patient/:patientId', async (req, res) => {
  const patientId = req.params.patientId;

  try {
    const pool = await poolPromise;

    const result = await pool.request()
      .input('patientId', patientId)
      .query(`
        SELECT *
        FROM LabTestRequests
        WHERE PatientID = @patientId
        ORDER BY RequestDate DESC
      `);

    return res.json(result.recordset);

  } catch (err) {
    console.error("Error fetching lab test requests:", err);
    return res.status(500).json({ success: false, message: 'Server error: ' + err.message });
  }
});

module.exports = router;
