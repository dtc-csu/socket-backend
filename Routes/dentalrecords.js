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
    // Return both legacy and normalized keys so clients can handle either shape
    res.json({ success: true, DentalRecordID: newDentalRecordId, id: newDentalRecordId });
  } catch (err) {
    console.error("Error creating dental record:", err);
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

// ---------------------- GET single dental record by ID ----------------------
router.get('/:dentalRecordId', async (req, res) => {
  const dentalRecordId = req.params.dentalRecordId;
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('dentalRecordId', dentalRecordId)
      .query(`
        SELECT DentalRecordID, PatientID, DentalService, Medication, CreationDate, EndDate
        FROM DentalRecord
        WHERE DentalRecordID = @dentalRecordId
      `);
    if (result.recordset.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.recordset[0]);
  } catch (err) {
    console.error('Error fetching dental record by id:', err);
    res.status(500).json({ error: err.message });
  }
});

// ---------------------- UPDATE dental record by ID ----------------------
router.put('/:dentalRecordId', async (req, res) => {
  const dentalRecordId = req.params.dentalRecordId;
  const { DentalService, Medication, EndDate } = req.body;
  try {
    const pool = await poolPromise;
    await pool.request()
      .input('dentalRecordId', dentalRecordId)
      .input('DentalService', DentalService || null)
      .input('Medication', Medication || null)
      .input('EndDate', EndDate ? new Date(EndDate) : null)
      .query(`
        UPDATE DentalRecord
        SET DentalService = @DentalService,
            Medication = @Medication,
            EndDate = @EndDate
        WHERE DentalRecordID = @dentalRecordId
      `);
    res.json({ success: true });
  } catch (err) {
    console.error('Error updating dental record:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
