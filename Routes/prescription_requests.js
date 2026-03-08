const express = require("express");
const router = express.Router();
const poolPromise = require("../db");
const redis = require("../redis");
const firebaseRouter = require("./firebase");
const admin = firebaseRouter.admin;

// Create a new prescription request (Patient)
router.post("/create", async (req, res) => {
  const { PatientID, Reason, Symptoms } = req.body;
  if (!PatientID) {
    return res.status(400).json({ success: false, message: "PatientID is required" });
  }
  try {
    const pool = await poolPromise;
    await pool.request()
      .input("PatientID", PatientID)
      .input("Reason", Reason || null)
      .input("Symptoms", Symptoms || null)
      .query(`INSERT INTO Prescriptionrequests (PatientID, Reason, Symptoms) VALUES (@PatientID, @Reason, @Symptoms)`);

    res.json({ success: true, message: "Prescription request created" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// NOTE: Doctor-specific listing removed because `DoctorID` was removed from prescription requests

// Get all prescription requests for a patient
router.get("/patient/:PatientID", async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input("PatientID", req.params.PatientID)
      .query(`SELECT * FROM Prescriptionrequests WHERE PatientID = @PatientID ORDER BY Requestedat DESC`);
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Get all prescription requests (for doctor/admin listing)
router.get("/all", async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .query(`SELECT * FROM Prescriptionrequests ORDER BY Requestedat DESC`);
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});


// Update status (approve/deny) and set Completedat (Doctor)
router.put("/update-status/:RequestID", async (req, res) => {
  const { Status } = req.body;
  if (!Status) return res.status(400).json({ success: false, message: "Status is required" });
  try {
    const pool = await poolPromise;
    // Get the request and patient info
    const requestResult = await pool.request()
      .input("RequestID", req.params.RequestID)
      .query(`SELECT * FROM Prescriptionrequests WHERE RequestID = @RequestID`);
    const request = requestResult.recordset[0];
    await pool.request()
      .input("RequestID", req.params.RequestID)
      .input("Status", Status)
      .query(`UPDATE Prescriptionrequests SET Status = @Status, Completedat = CASE WHEN @Status = 'Approved' THEN GETDATE() ELSE NULL END WHERE RequestID = @RequestID`);

    // Notify patient if approved
    if (Status === 'Approved' && request) {
      // Get patient userId
      const patientId = request.PatientID;
      // Get patient info (to get UserID)
      const patientInfoResult = await pool.request()
        .input('patientId', patientId)
        .query(`SELECT * FROM Patient WHERE PatientID = @patientId`);
      const patientInfo = patientInfoResult.recordset[0];
      if (patientInfo && patientInfo.UserID) {
        try {
          const token = await redis.get(`fcm:${patientInfo.UserID}`);
          if (token) {
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
          console.error('Failed to send FCM for prescription approval:', e && e.message ? e.message : e);
        }
      }
      // Backend no longer auto-creates a Prescription; UI should call the prescription create endpoint.
    }
    res.json({ success: true, message: "Status updated" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ============================================================
// REPORT: Get approved prescription request details + patient + prescription + drugs
// ============================================================
router.get('/report/by-id/:requestId', async (req, res) => {
  const requestId = req.params.requestId;
  try {
    const pool = await poolPromise;

    // 1) Get the prescription request and ensure it's Approved
    const reqRes = await pool.request()
      .input('requestId', requestId)
      .query(`SELECT * FROM Prescriptionrequests WHERE RequestID = @requestId AND Status = 'Approved'`);

    if (!reqRes.recordset || reqRes.recordset.length === 0) {
      return res.status(404).json({ success: false, message: 'Approved prescription request not found' });
    }
    const presRequest = reqRes.recordset[0];

    // 2) Get patient + user info
    const patientRes = await pool.request()
      .input('patientId', presRequest.PatientID)
      .query(`
        SELECT p.PatientID, p.UserID AS PatientUserID, u.FirstName, u.MiddleName, u.LastName, p.Age, p.Sex, p.HomeAddress
        FROM Patient p
        LEFT JOIN Users u ON p.UserID = u.UserID
        WHERE p.PatientID = @patientId
      `);
    const patient = patientRes.recordset && patientRes.recordset.length ? patientRes.recordset[0] : null;

    // 3) Find the Prescription row linked to this request
    const presRes = await pool.request()
      .input('requestId', requestId)
      .query(`SELECT TOP 1 * FROM Prescription WHERE RequestID = @requestId ORDER BY CreationDate DESC`);
    const prescription = presRes.recordset && presRes.recordset.length ? presRes.recordset[0] : null;

    // 4) If a prescription exists, get its drugs
    let drugs = [];
    if (prescription) {
      const drugsRes = await pool.request()
        .input('prescriptionId', prescription.PrescriptionID)
        .query(`SELECT MedicineID, Description, Quantity, CreationDate FROM DrugAndMedicine WHERE PrescriptionID = @prescriptionId ORDER BY MedicineID`);
      drugs = drugsRes.recordset || [];
    }

    return res.json({
      success: true,
      request: presRequest,
      patient,
      prescription,
      drugs,
    });
  } catch (err) {
    console.error('Error fetching prescription-request report:', err && err.message ? err.message : err);
    return res.status(500).json({ success: false, message: err.message || String(err) });
  }
});

// ============================================================
// REPORT: All approved prescription requests that have a linked Prescription (RequestID not null)
// Returns combined rows with patient, prescription and drug items
// ============================================================
router.get('/report/approved', async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query(`
      SELECT
        rq.RequestID AS RequestID,
          rq.PatientID,
          rq.Reason,
          rq.Status,

          pres.PrescriptionID,
          pres.CreationDate AS PrescriptionCreationDate,

          p.PatientID,
          u.FirstName + ' ' + COALESCE(u.MiddleName + ' ', '') + u.LastName AS PatientFullName,

        dm.MedicineID,
        dm.Description AS MedicineDescription,
        dm.Quantity,
        dm.CreationDate AS MedicineDate

      FROM Prescriptionrequests rq
      INNER JOIN Prescription pres ON pres.RequestID = rq.RequestID
      LEFT JOIN Patient p ON rq.PatientID = p.PatientID
      LEFT JOIN Users u ON p.UserID = u.UserID
      LEFT JOIN DrugAndMedicine dm ON pres.PrescriptionID = dm.PrescriptionID
      WHERE rq.Status = 'Approved'
      ORDER BY pres.CreationDate DESC, rq.RequestID DESC, dm.MedicineID
    `);

    return res.json(result.recordset);
  } catch (err) {
    console.error('Error fetching approved prescription-requests report:', err && err.message ? err.message : err);
    return res.status(500).json({ success: false, message: err.message || String(err) });
  }
});

module.exports = router;

