const express = require("express");
const router = express.Router();
const crud = require("../Controllers/genericController");
const poolPromise = require("../db");
const controller = crud(poolPromise);

// -----------------------------
// GET grid of prescriptions (for listing)
// Equivalent to C# GetAllGrid
// -----------------------------
router.get("/", async (req, res) => {
  try {
    const pool = await poolPromise;

    const result = await pool.request().query(`
      SELECT
        pr.PrescriptionID,
        pr.CreationDate,
        pr.ServiceType,
        pr.RequestID,
        pr.PrintStatus,

        p.PatientID,
        u.FirstName + ' ' + u.MiddleName + ' ' + u.LastName AS PatientFullName,

        du.FirstName + ' ' + du.MiddleName + ' ' + du.LastName AS DoctorFullName,

        latest.Description AS Description,
        latest.Quantity AS Quantity,
        latest.MedicineID AS MedicineID

      FROM Prescription pr
      INNER JOIN Patient p ON pr.PatientID = p.PatientID
      INNER JOIN Users u ON p.UserID = u.UserID
      LEFT JOIN Doctors d ON pr.DoctorID = d.DoctorID
      LEFT JOIN Users du ON d.UserID = du.UserID

      OUTER APPLY (
        SELECT TOP 1 dm.Description, dm.Quantity, dm.MedicineID
        FROM DrugAndMedicine dm
        WHERE dm.PrescriptionID = pr.PrescriptionID
        ORDER BY dm.MedicineID DESC
      ) latest

      ORDER BY pr.CreationDate DESC
    `);

    res.json(result.recordset);
  } catch (err) {
    console.error("Error fetching prescriptions grid:", err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

// -----------------------------
// REPORT: latest (TOP 1) prescription for a patient + all its items
// One prescription header, many DrugAndMedicine rows
// -----------------------------
router.get("/report/:patientID", async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input("patientID", req.params.patientID)
      .query(`
        ;WITH LatestPrescription AS (
          SELECT TOP 1 *
          FROM Prescription
          WHERE PatientID = @patientID
          ORDER BY CreationDate DESC
        )
        SELECT 
          pr.PrescriptionID,
          pr.CreationDate,
          pr.EndDate,
          pr.ServiceType,
          pr.RequestID,
          pr.PrintStatus,

          -- Patient Info
          p.PatientID,
          u.FirstName + ' ' + u.MiddleName + ' ' + u.LastName AS PatientFullName,
          p.HomeAddress AS PatientAddress,
          p.Sex,
          p.Age,

          -- Doctor Info
          d.DoctorID,
          du.FirstName + ' ' + du.MiddleName + ' ' + du.LastName AS DoctorFullName,
          d.LicenseNumber AS DoctorLicenseNumber,

          -- RX Item Info
          dm.MedicineID,
          dm.Description AS MedicineDescription,
          dm.Quantity,
          dm.CreationDate AS MedicineDate

        FROM LatestPrescription pr
        INNER JOIN Patient p ON pr.PatientID = p.PatientID
        INNER JOIN Users u ON p.UserID = u.UserID
        INNER JOIN Doctors d ON pr.DoctorID = d.DoctorID
        INNER JOIN Users du ON d.UserID = du.UserID
        INNER JOIN DrugAndMedicine dm 
          ON pr.PrescriptionID = dm.PrescriptionID

        ORDER BY dm.MedicineID
      `);

    return res.json(result.recordset);
  } catch (err) {
    console.error("Error fetching prescription report:", err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Backwards-compatible: GET /patient/:patientID used by older clients
router.get('/patient/:patientID', async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('patientID', req.params.patientID)
      .query(`
        ;WITH LatestPrescription AS (
          SELECT TOP 1 *
          FROM Prescription
          WHERE PatientID = @patientID
          ORDER BY CreationDate DESC
        )
        SELECT 
          pr.PrescriptionID,
          pr.CreationDate,
          pr.EndDate,
          pr.ServiceType,
          pr.RequestID,
          pr.PrintStatus,

          -- Patient Info
          p.PatientID,
          u.FirstName + ' ' + u.MiddleName + ' ' + u.LastName AS PatientFullName,
          p.HomeAddress AS PatientAddress,
          p.Sex,
          p.Age,

          -- Doctor Info
          d.DoctorID,
          du.FirstName + ' ' + du.MiddleName + ' ' + du.LastName AS DoctorFullName,
          d.LicenseNumber AS DoctorLicenseNumber,

          -- RX Item Info
          dm.MedicineID,
          dm.Description AS Description,
          dm.Quantity AS Quantity,
          dm.CreationDate AS CreationDate

        FROM LatestPrescription pr
        INNER JOIN Patient p ON pr.PatientID = p.PatientID
        INNER JOIN Users u ON p.UserID = u.UserID
        INNER JOIN Doctors d ON pr.DoctorID = d.DoctorID
        INNER JOIN Users du ON d.UserID = du.UserID
        INNER JOIN DrugAndMedicine dm 
          ON pr.PrescriptionID = dm.PrescriptionID

        ORDER BY dm.MedicineID
      `);

    return res.json(result.recordset);
  } catch (err) {
    console.error('Error fetching prescription (patient) report:', err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// -----------------------------
// REPORT: one prescription + all its drugs by PrescriptionID
// (single header, many DrugAndMedicine rows)
// -----------------------------
router.get("/report/by-id/:prescriptionID", async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input("prescriptionID", req.params.prescriptionID)
      .query(`
        SELECT 
          pr.PrescriptionID,
          pr.CreationDate,
          pr.EndDate,
          pr.ServiceType,
          pr.RequestID,
          pr.PrintStatus,

          -- Patient Info
          p.PatientID,
          u.FirstName + ' ' + u.MiddleName + ' ' + u.LastName AS PatientFullName,
          p.HomeAddress AS PatientAddress,
          p.Sex,
          p.Age,

          -- Doctor Info
          d.DoctorID,
          du.FirstName + ' ' + du.MiddleName + ' ' + du.LastName AS DoctorFullName,
          d.LicenseNumber AS DoctorLicenseNumber,

          -- RX Item Info
          dm.MedicineID,
          dm.Description AS MedicineDescription,
          dm.Quantity,
          dm.CreationDate AS MedicineDate

        FROM Prescription pr
        INNER JOIN Patient p ON pr.PatientID = p.PatientID
        INNER JOIN Users u ON p.UserID = u.UserID
        INNER JOIN Doctors d ON pr.DoctorID = d.DoctorID
        INNER JOIN Users du ON d.UserID = du.UserID
        INNER JOIN DrugAndMedicine dm 
          ON pr.PrescriptionID = dm.PrescriptionID

        WHERE pr.PrescriptionID = @prescriptionID

        ORDER BY dm.MedicineID
      `);

    return res.json(result.recordset);
  } catch (err) {
    console.error("Error fetching prescription-by-id report:", err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// -----------------------------
// CREATE a new prescription (header)
// -----------------------------
router.post("/create", async (req, res) => {
  const {
    PatientID,
    DoctorID,
    ServiceType,
    EndDate,
    RequestID,
    PrintStatus
  } = req.body;

  if (!PatientID || !DoctorID || !ServiceType) {
    return res.status(400).json({ 
      success: false, message: "PatientID, DoctorID, and ServiceType are required" 
    });
  }

  try {
    const pool = await poolPromise;

    const result = await pool.request()
      .input("PatientID", PatientID)
      .input("DoctorID", DoctorID)
      .input("ServiceType", ServiceType)
      .input("EndDate", EndDate || null)
      .input("RequestID", RequestID !== undefined ? RequestID : null)
      .input("PrintStatus", PrintStatus !== undefined ? PrintStatus : null)
      .input("CreationDate", new Date())
      .query(`
        INSERT INTO Prescription (PatientID, DoctorID, ServiceType, EndDate, RequestID, PrintStatus, CreationDate)
        VALUES (@PatientID, @DoctorID, @ServiceType, @EndDate, @RequestID, @PrintStatus, @CreationDate);
        SELECT SCOPE_IDENTITY() AS PrescriptionID;
      `);

    const prescriptionID = result.recordset[0].PrescriptionID;
    // If this prescription was created from a prescription request, mark that request Approved
    try {
      if (RequestID) {
        // Update the request status and Completedat
        await pool.request()
          .input('RequestID', RequestID)
          .query(`UPDATE Prescriptionrequests SET Status='Approved', Completedat = GETDATE() WHERE RequestID = @RequestID`);

        // Notify patient via FCM (if token exists)
        const patientInfoResult = await pool.request()
          .input('requestId', RequestID)
          .query(`SELECT PatientID FROM Prescriptionrequests WHERE RequestID = @requestId`);
        const presReq = patientInfoResult.recordset[0];
        if (presReq && presReq.PatientID) {
          const patientInfo = await pool.request()
            .input('patientId', presReq.PatientID)
            .query(`SELECT * FROM Patient WHERE PatientID = @patientId`);
          const patient = patientInfo.recordset[0];
          if (patient && patient.UserID) {
            try {
              const token = await redis.get(`fcm:${patient.UserID}`);
              if (token && admin && admin.messaging) {
                await admin.messaging().send({
                  token,
                  notification: {
                    title: 'Prescription Approved',
                    body: 'Your prescription request has been approved. Please check the app for details.',
                  },
                  android: { priority: 'high' },
                });
              }
            } catch (e) {
              console.error('Failed to send FCM after prescription create:', e && e.message ? e.message : e);
            }
          }
        }
      }
    } catch (e) {
      console.error('Error while auto-updating prescription request status:', e && e.message ? e.message : e);
    }

    res.json({ 
      success: true,
      message: "Prescription created successfully",
      PrescriptionID: prescriptionID
    });
  } catch (err) {
    console.error("Error creating prescription:", err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

// -----------------------------
// CREATE a new prescription with multiple drugs (bulk, transactional)
// -----------------------------
router.post('/bulk', async (req, res) => {
  const { PatientID, DoctorID, ServiceType, EndDate, RequestID, PrintStatus, drugs } = req.body;
  // drugs = [{ Quantity, Description, CreationDate }, ...]

  if (!PatientID || !DoctorID || !ServiceType || !Array.isArray(drugs)) {
    return res.status(400).json({ success: false, message: 'PatientID, DoctorID, ServiceType and drugs[] are required' });
  }

  try {
    let prescriptionID = null;

    await poolPromise.transaction(async (createRequest) => {
      const headerReq = createRequest();
      const headerResult = await headerReq
        .input('PatientID', PatientID)
        .input('DoctorID', DoctorID)
        .input('ServiceType', ServiceType)
        .input('EndDate', EndDate || null)
        .input('RequestID', RequestID !== undefined ? RequestID : null)
        .input('PrintStatus', PrintStatus !== undefined ? PrintStatus : null)
        .input('CreationDate', new Date())
        .query(`
          INSERT INTO Prescription (PatientID, DoctorID, ServiceType, EndDate, RequestID, PrintStatus, CreationDate)
          VALUES (@PatientID, @DoctorID, @ServiceType, @EndDate, @RequestID, @PrintStatus, @CreationDate);
          SELECT SCOPE_IDENTITY() AS PrescriptionID;
        `);

      prescriptionID = headerResult.recordset[0].PrescriptionID;

      for (const d of drugs) {
        const r = createRequest();
        await r
          .input('PrescriptionID', prescriptionID)
          .input('Quantity', d.Quantity)
          .input('Description', d.Description)
          .input('CreationDate', d.CreationDate ? new Date(d.CreationDate) : new Date())
          .query(`
            INSERT INTO DrugAndMedicine (PrescriptionID, Quantity, Description, CreationDate)
            VALUES (@PrescriptionID, @Quantity, @Description, @CreationDate)
          `);
      }
    });

    res.json({ success: true, message: 'Prescription created with drugs', PrescriptionID: prescriptionID, inserted: drugs.length });
  } catch (err) {
    console.error('Error creating prescription bulk:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

// -----------------------------
// ADD a drug/medicine to an existing prescription
// -----------------------------
router.post("/", async (req, res) => {
  const {
    PrescriptionID,
    Quantity,
    Description,
    CreationDate
  } = req.body;

  if (!PrescriptionID) {
    return res.status(400).json({ 
      success: false, message: "PrescriptionID is required. Create a prescription first using /prescription/create" 
    });
  }

  try {
    const pool = await poolPromise;

    // Insert drug/medicine
    await pool.request()
      .input("PrescriptionID", PrescriptionID)
      .input("Quantity", Quantity)
      .input("Description", Description)
      .input("CreationDate", CreationDate || new Date())
      .query(`
        INSERT INTO DrugAndMedicine
        (PrescriptionID, Quantity, Description, CreationDate)
        VALUES (@PrescriptionID, @Quantity, @Description, @CreationDate)
      `);

    res.json({ success: true, message: "Drug/Medicine added successfully" });
  } catch (err) {
    console.error("Error adding drug/medicine:", err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

// -----------------------------
// DELETE a drug/medicine by its MedicineID and remove parent Prescription if empty
// -----------------------------
router.delete('/by-medicine/:medicineId', async (req, res) => {
  const medicineId = req.params.medicineId;
  try {
    const pool = await poolPromise;

    // Find the parent prescription
    const medRes = await pool.request()
      .input('medicineId', medicineId)
      .query('SELECT PrescriptionID FROM DrugAndMedicine WHERE MedicineID = @medicineId');

    if (!medRes.recordset || medRes.recordset.length === 0) {
      return res.status(404).json({ success: false, message: 'Medicine not found' });
    }

    const prescriptionId = medRes.recordset[0].PrescriptionID;

    // Delete all medicines for this prescription and then delete the prescription header
    await pool.request()
      .input('prescriptionId', prescriptionId)
      .query('DELETE FROM DrugAndMedicine WHERE PrescriptionID = @prescriptionId');

    await pool.request()
      .input('prescriptionId', prescriptionId)
      .query('DELETE FROM Prescription WHERE PrescriptionID = @prescriptionId');

    return res.json({ success: true, message: 'Deleted medicine and cleaned up prescription' });
  } catch (err) {
    console.error('Error deleting medicine by id:', err && err.message ? err.message : err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// -----------------------------
// DELETE a prescription by PrescriptionID (deletes all drugs and header)
// -----------------------------
router.delete('/header/:prescriptionId', async (req, res) => {
  const prescriptionId = req.params.prescriptionId;
  try {
    const pool = await poolPromise;

    await pool.request()
      .input('prescriptionId', prescriptionId)
      .query('DELETE FROM DrugAndMedicine WHERE PrescriptionID = @prescriptionId');

    await pool.request()
      .input('prescriptionId', prescriptionId)
      .query('DELETE FROM Prescription WHERE PrescriptionID = @prescriptionId');

    return res.json({ success: true, message: 'Deleted prescription and its medicines' });
  } catch (err) {
    console.error('Error deleting prescription header:', err && err.message ? err.message : err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// -----------------------------
// EDIT a prescription
// -----------------------------
router.put("/:id", async (req, res) => {
  const { Quantity, Description } = req.body;

  try {
    const pool = await poolPromise;

    // Update DrugAndMedicine
    await pool.request()
      .input("MedicineID", req.params.id)
      .input("Quantity", Quantity)
      .input("Description", Description)
      .query(`
        UPDATE DrugAndMedicine
        SET Quantity = @Quantity,
            Description = @Description
        WHERE MedicineID = @MedicineID
      `);

    res.json({ success: true, message: "Prescription updated successfully" });

  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// -----------------------------
// DELETE a prescription
// -----------------------------
router.delete("/:id", controller.delete("DrugAndMedicine", "MedicineID"));

// -----------------------------
// UPDATE PrintStatus for a prescription (only)
// -----------------------------
router.patch('/:id/printstatus', async (req, res) => {
  const { PrintStatus } = req.body;

  if (PrintStatus === undefined) {
    return res.status(400).json({ success: false, message: 'PrintStatus is required in body' });
  }

  try {
    const pool = await poolPromise;
    await pool.request()
      .input('PrescriptionID', req.params.id)
      .input('PrintStatus', PrintStatus)
      .query(`
        UPDATE Prescription
        SET PrintStatus = @PrintStatus
        WHERE PrescriptionID = @PrescriptionID
      `);

    return res.json({ success: true, message: 'PrintStatus updated' });
  } catch (err) {
    console.error('Error updating PrintStatus:', err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
