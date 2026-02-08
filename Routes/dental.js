const express = require('express');
const router = express.Router();
const poolPromise = require('../db');

// ---------------------- GET all dental records ----------------------
router.get('/', async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query(`
      SELECT
        DentalRecordID,
        PatientID,
        DentalService,
        Medication,
        CreationDate,
        EndDate
      FROM DentalRecord
      ORDER BY CreationDate DESC
    `);
    res.json(result.recordset);
  } catch (err) {
    console.error("Error fetching dental records:", err);
    res.status(500).json({ error: err.message });
  }
});

// ---------------------- GET dental records by patient ID ----------------------
router.get('/patient/:patientId', async (req, res) => {
  const patientId = req.params.patientId;
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('patientId', patientId)
      .query(`
        SELECT *
        FROM DentalRecord
        WHERE PatientID = @patientId
        ORDER BY CreationDate DESC
      `);
    res.json(result.recordset);
  } catch (err) {
    console.error("Error fetching patient dental records:", err);
    res.status(500).json({ error: err.message });
  }
});

// ---------------------- POST create a new dental record ----------------------
router.post('/', async (req, res) => {
  const {
    PatientID,
    DentalService,
    Medication,
    CreationDate,
    EndDate
  } = req.body;

  if (!PatientID || !CreationDate) {
    return res.status(400).json({ error: "PatientID and CreationDate are required" });
  }

  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input("PatientID", PatientID)
      .input("DentalService", DentalService || null)
      .input("Medication", Medication || null)
      .input("CreationDate", new Date(CreationDate))
      .input("EndDate", EndDate ? new Date(EndDate) : null)
      .query(`
        INSERT INTO DentalRecord (PatientID, DentalService, Medication, CreationDate, EndDate)
        VALUES (@PatientID, @DentalService, @Medication, @CreationDate, @EndDate);
        SELECT SCOPE_IDENTITY() AS DentalRecordID;
      `);

    const newDentalRecordId = result.recordset[0].DentalRecordID;
    res.json({ success: true, DentalRecordID: newDentalRecordId });
  } catch (err) {
    console.error("Error creating dental record:", err);
    res.status(500).json({ error: err.message });
  }
});

// ---------------------- POST create a new dental tooth ----------------------
router.post('/tooth', async (req, res) => {
  const {
    DentalRecordID,
    ToothNumber,
    ProcedureDone,
    CreationDate
  } = req.body;

  if (!DentalRecordID || !ToothNumber || !ProcedureDone || !CreationDate) {
    return res.status(400).json({ error: "DentalRecordID, ToothNumber, ProcedureDone, and CreationDate are required" });
  }

  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input("DentalRecordID", DentalRecordID)
      .input("ToothNumber", ToothNumber)
      .input("ProcedureDone", ProcedureDone)
      .input("CreationDate", new Date(CreationDate))
      .query(`
        INSERT INTO DentalTooth (DentalRecordID, ToothNumber, ProcedureDone, CreationDate)
        VALUES (@DentalRecordID, @ToothNumber, @ProcedureDone, @CreationDate);
        SELECT SCOPE_IDENTITY() AS DentalToothID;
      `);

    const newDentalToothId = result.recordset[0].DentalToothID;
    res.json({ success: true, DentalToothID: newDentalToothId });
  } catch (err) {
    console.error("Error creating dental tooth:", err);
    res.status(500).json({ error: err.message });
  }
});

// ---------------------- DELETE dental record ----------------------
router.delete('/:dentalRecordId', async (req, res) => {
  const dentalRecordId = req.params.dentalRecordId;
  try {
    const pool = await poolPromise;
    // First delete related DentalTooth records
    await pool.request()
      .input('dentalRecordId', dentalRecordId)
      .query('DELETE FROM DentalTooth WHERE DentalRecordID = @dentalRecordId');
    // Then delete the DentalRecord
    await pool.request()
      .input('dentalRecordId', dentalRecordId)
      .query('DELETE FROM DentalRecord WHERE DentalRecordID = @dentalRecordId');
    res.json({ success: true, message: `Dental record ${dentalRecordId} deleted` });
  } catch (err) {
    console.error("Error deleting dental record:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
