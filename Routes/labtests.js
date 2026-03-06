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

// Lab test grid endpoint (with joins)
router.get('/grid-joined', async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query(`
      SELECT
        lt.LabTestRequestID,
        -- return ISO date string or empty to avoid null deserialization issues
        ISNULL(CONVERT(varchar(33), lt.RequestDate, 126), '') AS RequestDate,
        ISNULL(CONVERT(varchar(33), lt.CreatedAt, 126), '') AS CreatedAt,

        p.PatientID,
        ISNULL(CONCAT(ISNULL(u.FirstName,''), ' ', ISNULL(u.MiddleName,''), ' ', ISNULL(u.LastName,'')), '') AS PatientFullName,
        p.Course,
        lt.RequestingPhysician,
        lt.Impression

      FROM LabTestRequests lt
      INNER JOIN Patient p ON lt.PatientID = p.PatientID
      LEFT JOIN Users u ON p.UserID = u.UserID

      ORDER BY lt.RequestDate DESC
    `);
    res.json(result.recordset);
  } catch (err) {
    console.error('LabTests Grid Exception:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
