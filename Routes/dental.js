const express = require('express');
const router = express.Router();
const poolPromise = require('../db');
const sql = require('mssql');

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
    // Return both legacy and normalized keys so clients can handle either shape
    res.json({ success: true, DentalRecordID: newDentalRecordId, id: newDentalRecordId });
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

// ---------------------- GET dental teeth by DentalRecordID ----------------------
router.get('/tooth/record/:dentalRecordId', async (req, res) => {
  const dentalRecordId = req.params.dentalRecordId;
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('dentalRecordId', dentalRecordId)
      .query(`
        SELECT DentalToothID, DentalRecordID, ToothNumber, ProcedureDone, CreationDate
        FROM DentalTooth
        WHERE DentalRecordID = @dentalRecordId
        ORDER BY CreationDate ASC
      `);
    res.json(result.recordset);
  } catch (err) {
    console.error('Error fetching dental teeth for record:', err);
    res.status(500).json({ error: err.message });
  }
});

// ---------------------- REPLACE dental teeth for a record (bulk) ----------------------
router.post('/tooth/bulk', async (req, res) => {
  // Accept both the server's expected shape and the Flutter client's shape
  // Server expects: { DentalRecordID, teeth }
  // Client may send: { RecordId, Teeth }
  const DentalRecordID = req.body.DentalRecordID || req.body.RecordId || req.body.recordId;
  const teeth = req.body.teeth || req.body.Teeth;

  if (!DentalRecordID || !Array.isArray(teeth)) {
    return res.status(400).json({ error: 'DentalRecordID (or RecordId) and teeth/Teeth array are required' });
  }

  const pool = await poolPromise;
  const transaction = new sql.Transaction(pool);

  try {
    await transaction.begin();

    // Use transaction-scoped requests
    const trxRequest = transaction.request();

    // Delete existing teeth for the record
    await trxRequest
      .input('dentalRecordId', DentalRecordID)
      .query('DELETE FROM DentalTooth WHERE DentalRecordID = @dentalRecordId');

    // Insert new teeth
    for (const t of teeth) {
      const r = transaction.request();
      await r
        .input('DentalRecordID', DentalRecordID)
        .input('ToothNumber', t.ToothNumber)
        .input('ProcedureDone', t.ProcedureDone)
        .input('CreationDate', t.CreationDate ? new Date(t.CreationDate) : new Date())
        .query(`
          INSERT INTO DentalTooth (DentalRecordID, ToothNumber, ProcedureDone, CreationDate)
          VALUES (@DentalRecordID, @ToothNumber, @ProcedureDone, @CreationDate)
        `);
    }

    await transaction.commit();

    res.json({ success: true, inserted: teeth.length });
  } catch (err) {
    try {
      await transaction.rollback();
    } catch (rbErr) {
      console.error('Rollback error:', rbErr);
    }
    console.error('Error replacing dental teeth (transactional):', err);
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
