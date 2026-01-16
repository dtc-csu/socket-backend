const express = require('express');
const router = express.Router();
const sql = require('mssql');
const db = require('../db');

// Save dental chart
router.post('/save-dental-chart', async (req, res) => {
  try {
    const { userId, toothProcedures } = req.body;

    // Get PatientIDNoAuto from UserId
    const pool = await require('../db')();
    const patientResult = await pool.request()
      .input('userId', userId)
      .query('SELECT PatientIDNoAuto FROM Patient WHERE UserID = @userId');

    if (patientResult.recordset.length === 0) {
      return res.status(404).json({ success: false, message: 'Patient not found' });
    }

    const patientIDNoAuto = patientResult.recordset[0].PatientIDNoAuto;

    // Insert tooth procedures
    for (const procedure of toothProcedures) {
      await pool.request()
        .input('patientIDNoAuto', patientIDNoAuto)
        .input('toothNumber', procedure.ToothNumber)
        .input('procedureDone', procedure.ProcedureDone)
        .query(`
          INSERT INTO DentalTooth (PatientIDNoAuto, ToothNumber, ProcedureDone, CreationDate)
          VALUES (@patientIDNoAuto, @toothNumber, @procedureDone, GETDATE())
        `);
    }

    res.json({ success: true, message: 'Dental chart saved successfully', patientIDNoAuto: patientIDNoAuto });
  } catch (error) {
    console.error('Error saving dental chart:', error);
    res.status(500).json({ success: false, message: 'Failed to save dental chart' });
  }
});

module.exports = router;
