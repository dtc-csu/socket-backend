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
    res.json({ success: true, data: result.recordset });
  } catch (err) {
    console.error("Error fetching dental records:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ---------------------- GRID: dental records with patient name/college ----------------------
// Equivalent to C# GetAllGrid
router.get('/grid', async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query(`
      SELECT
        dr.DentalRecordID,
        dr.PatientID,
        dr.CreationDate,
        dr.DentalService,
        dr.Medication,

        p.CollegeOffice,
        u.FirstName + ' ' + u.MiddleName + ' ' + u.LastName AS PatientFullName

      FROM DentalRecord dr
      LEFT JOIN Patient p ON dr.PatientID = p.PatientID
      LEFT JOIN Users u ON p.UserID = u.UserID

      ORDER BY dr.CreationDate DESC
    `);

    return res.json({ success: true, data: result.recordset });
  } catch (err) {
    console.error('Error fetching dental record grid:', err);
    return res.status(500).json({ success: false, message: err.message });
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
    res.status(500).json({ success: false, message: err.message });
  }
});

// ---------------------- REPORT TEETH: all teeth for this patient ----------------------
router.get('/report/:patientId/teeth', async (req, res) => {
  const patientId = req.params.patientId;

  try {
    const pool = await poolPromise;

    const teethResult = await pool.request()
      .input('patientId', patientId)
      .query(`
        SELECT
          dt.DentalToothID,
          dt.DentalRecordID,
          dt.ToothNumber,
          dt.ProcedureDone,
          dt.CreationDate,
          dr.CreationDate AS RecordCreationDate
        FROM DentalRecord dr
        INNER JOIN DentalTooth dt ON dt.DentalRecordID = dr.DentalRecordID
        WHERE dr.PatientID = @patientId
        ORDER BY dr.CreationDate DESC, dt.CreationDate DESC
      `);

    return res.json(teethResult.recordset);
  } catch (err) {
    console.error('Error fetching dental record teeth:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ---------------------- REPORT: latest dental record with patient/tooth info ----------------------
// Rough equivalent of C# GetDentalRecordReport(string patientId)
router.get('/report/:patientId', async (req, res) => {
  const patientId = req.params.patientId;

  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('patientId', patientId)
      .query(`
        SELECT TOP 1
          dr.DentalRecordID,
          dr.PatientID,
          dr.DentalService,
          dr.Medication,
          dr.CreationDate,

          u.FirstName + ' ' + u.MiddleName + ' ' + u.LastName AS PatientFullName,
          p.HomeAddress AS PatientAddress,
          p.Sex,
          p.Age,
          p.Course,
          p.YearLevel,
          p.CollegeOffice AS College,

          ISNULL(dt.DentalToothID, 0) AS DentalToothID,
          dt.ToothNumber,
          dt.ProcedureDone,
          dt.CreationDate AS ToothCreationDate

        FROM DentalRecord dr
        LEFT JOIN Patient p ON dr.PatientID = p.PatientID
        LEFT JOIN Users u ON p.UserID = u.UserID
        OUTER APPLY (
          SELECT *
          FROM DentalTooth dt
          WHERE dt.DentalRecordID = dr.DentalRecordID
          ORDER BY dt.CreationDate DESC
        ) dt
        WHERE dr.PatientID = @patientId
        ORDER BY dr.CreationDate DESC
      `);

    if (!result.recordset || result.recordset.length === 0) {
      return res.json(null); // or 404 depending on client expectations
    }

    // Avoid sending ToothCreationDate: null, which breaks .NET DateTime
    const row = result.recordset[0];
    const model = { ...row };
    if (model.ToothCreationDate == null) {
      delete model.ToothCreationDate;
    }

    return res.json(model);
  } catch (err) {
    console.error('Error fetching dental record report:', err);
    return res.status(500).json({ success: false, message: err.message });
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
    return res.status(400).json({ success: false, message: "PatientID and CreationDate are required" });
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
    res.json({ success: true, message: 'Dental record created successfully', DentalRecordID: newDentalRecordId, id: newDentalRecordId });
  } catch (err) {
    console.error("Error creating dental record:", err);
    res.status(500).json({ success: false, message: err.message });
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
    res.status(500).json({ success: false, message: err.message });
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
    if (result.recordset.length === 0) return res.status(404).json({ success: false, message: 'Dental record not found' });
    res.json({ success: true, data: result.recordset[0] });
  } catch (err) {
    console.error('Error fetching dental record by id:', err);
    res.status(500).json({ success: false, message: err.message });
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
    res.json({ success: true, message: 'Dental record updated successfully' });
  } catch (err) {
    console.error('Error updating dental record:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
