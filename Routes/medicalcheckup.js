// routes/medicalcheckup.js
const express = require('express');
const router = express.Router();
const poolPromise = require('../db');
const generic = require('../Controllers/genericController')(poolPromise);

// ----------------------------------------------------
// GENERIC CRUD ROUTES FOR MedicalCheckup
// ----------------------------------------------------
router.get('/', generic.getAll("MedicalCheckup", "MedicalCheckupID"));      // Get all medical checkups

// Custom POST to handle date conversion / empty values safely
router.post('/', async (req, res) => {
  try {
    const cleanedBody = { ...req.body };

    Object.keys(cleanedBody).forEach((key) => {
      const value = cleanedBody[key];

      // Treat empty strings as NULL so SQL Server doesn't try to convert '' to DATETIME
      if (value === "") {
        cleanedBody[key] = null;
        return;
      }

      // Auto-convert any *Date-like* fields from string to JS Date
      if (typeof value === 'string' && /date/i.test(key)) {
        const parsed = new Date(value);
        if (!isNaN(parsed.getTime())) {
          cleanedBody[key] = parsed;
        }
      }
    });

    // Replace body and delegate to generic add
    req.body = cleanedBody;
    return generic.add("MedicalCheckup", "MedicalCheckupID")(req, res);
  } catch (err) {
    console.error("[MedicalCheckup ADD ERROR]", err);
    return res.status(500).json({
      success: false,
      message: 'AddMedicalCheckup Exception: ' + (err?.message || 'Unexpected error')
    });
  }
});

router.put('/:id', generic.edit("MedicalCheckup", "MedicalCheckupID"));     // Update medical checkup
router.delete('/:id', generic.delete("MedicalCheckup", "MedicalCheckupID"));// Delete medical checkup

// ----------------------------------------------------
// GET FULL MEDICAL CHECKUP GRID (JOINED DATA)
// Equivalent to C# GetAllGrid
// ----------------------------------------------------
router.get('/grid', async (req, res) => {
  try {
    const pool = await poolPromise;

    const result = await pool.request().query(`
      SELECT
        mc.MedicalCheckupID,
        mc.CheckupDate,
        mc.Diagnosis,
        mc.HealthRecommendations,
        mc.Status,
        mc.DoctorID,

        p.PatientID,
        p.Age,
        p.Sex,
        p.CollegeOffice,

        u.FirstName + ' ' + u.MiddleName + ' ' + u.LastName AS PatientFullName,

        du.FirstName + ' ' + du.MiddleName + ' ' + du.LastName AS DoctorName

      FROM MedicalCheckup mc
      INNER JOIN Patient p ON mc.PatientID = p.PatientID
      INNER JOIN Users u ON p.UserID = u.UserID
      INNER JOIN Doctors d ON mc.DoctorID = d.DoctorID
      INNER JOIN Users du ON d.UserID = du.UserID

      ORDER BY mc.CheckupDate DESC
    `);

    return res.json(result.recordset);
  } catch (err) {
    console.error('Error fetching medical checkup grid:', err);
    return res.status(500).json({ success: false, message: 'Server error: ' + err.message });
  }
});

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
        SELECT 
          mc.MedicalCheckupID,
          mc.PatientID,
          mc.CheckupDate,
          mc.Diagnosis,
          mc.HealthRecommendations,
          mc.BP,
          mc.CR,
          mc.RR,
          mc.Temp,
          mc.O2Sat,
          mc.Weight,
          mc.Height,
          mc.BMI,
          mc.CreatedAt,
          mc.Status,

          mc.DoctorID,
          d.LicenseNumber,

          u.FirstName + ' ' + u.LastName AS PatientFullName,
          u.PhoneNumber AS PhoneNumber,

          p.Sex AS Gender,
          p.Age,
          p.HomeAddress AS address,
          p.CollegeOffice AS college

        FROM MedicalCheckup mc
        INNER JOIN Patient p ON mc.PatientID = p.PatientID
        INNER JOIN Users u ON p.UserID = u.UserID
        LEFT JOIN Doctors d ON mc.DoctorID = d.DoctorID

        WHERE mc.PatientID = @patientId
        ORDER BY mc.CheckupDate DESC
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
