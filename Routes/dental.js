const express = require('express');
const router = express.Router();
const sql = require('mssql');
const db = require('../db');

// Save dental chart
router.post('/save-dental-chart', async (req, res) => {
  try {
    const { dentalRecordId, markedTeeth } = req.body;

    // Delete existing entries for this record
    await sql.connect(db.config);
    await sql.query`DELETE FROM DentalTooth WHERE DentalRecordId = ${dentalRecordId}`;

    // Insert new marked teeth
    for (const toothNumber of markedTeeth) {
      await sql.query`
        INSERT INTO DentalTooth (DentalRecordId, ToothNumber, ProcedureDone, CreationDate)
        VALUES (${dentalRecordId}, ${toothNumber}, 'Marked', GETDATE())
      `;
    }

    res.json({ success: true, message: 'Dental chart saved successfully' });
  } catch (error) {
    console.error('Error saving dental chart:', error);
    res.status(500).json({ success: false, message: 'Failed to save dental chart' });
  }
});

module.exports = router;
