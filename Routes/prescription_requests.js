const express = require("express");
const router = express.Router();
const poolPromise = require("../db");

// Create a new prescription request (Patient)
router.post("/create", async (req, res) => {
  const { Patient_id, Doctor_id, Reason, Symptoms } = req.body;
  if (!Patient_id || !Doctor_id) {
    return res.status(400).json({ success: false, message: "Patient_id and Doctor_id are required" });
  }
  try {
    const pool = await poolPromise;
    await pool.request()
      .input("Patient_id", Patient_id)
      .input("Doctor_id", Doctor_id)
      .input("Reason", Reason || null)
      .input("Symptoms", Symptoms || null)
      .query(`INSERT INTO Prescription_requests (Patient_id, Doctor_id, Reason, Symptoms) VALUES (@Patient_id, @Doctor_id, @Reason, @Symptoms)`);
    res.json({ success: true, message: "Prescription request created" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Get all prescription requests for a doctor
router.get("/doctor/:Doctor_id", async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input("Doctor_id", req.params.Doctor_id)
      .query(`SELECT * FROM Prescription_requests WHERE Doctor_id = @Doctor_id ORDER BY Requested_at DESC`);
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Get all prescription requests for a patient
router.get("/patient/:Patient_id", async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input("Patient_id", req.params.Patient_id)
      .query(`SELECT * FROM Prescription_requests WHERE Patient_id = @Patient_id ORDER BY Requested_at DESC`);
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});


// Update status (approve/deny) and set Completed_at (Doctor)
router.put("/update-status/:Id", async (req, res) => {
  const { Status } = req.body;
  if (!Status) return res.status(400).json({ success: false, message: "Status is required" });
  try {
    const pool = await poolPromise;
    // Get the request and patient info
    const requestResult = await pool.request()
      .input("Id", req.params.Id)
      .query(`SELECT * FROM Prescription_requests WHERE Id = @Id`);
    const request = requestResult.recordset[0];
    await pool.request()
      .input("Id", req.params.Id)
      .input("Status", Status)
      .query(`UPDATE Prescription_requests SET Status = @Status, Completed_at = CASE WHEN @Status = 'Approved' THEN GETDATE() ELSE NULL END WHERE Id = @Id`);

    // Notify patient if approved
    if (Status === 'Approved' && request) {
      // Get patient userId
      const patientId = request.Patient_id;
      // Get patient info (to get UserID)
      const patientInfoResult = await pool.request()
        .input('patientId', patientId)
        .query(`SELECT * FROM Patient WHERE PatientID = @patientId`);
      const patientInfo = patientInfoResult.recordset[0];
      if (patientInfo && patientInfo.UserID) {
        // Send FCM notification
        const axios = require('axios');
        await axios.post('http://localhost:3000/Users/send-fcm', {
          userId: patientInfo.UserID,
          title: 'Prescription Approved',
          body: 'Your prescription request has been approved. Please visit the clinic to get your prescription.'
        }).catch(() => {});
      }
      // Backend no longer auto-creates a Prescription; UI should call the prescription create endpoint.
    }
    res.json({ success: true, message: "Status updated" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;

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
      .query(`SELECT * FROM Prescription_requests WHERE Id = @requestId AND Status = 'Approved'`);

    if (!reqRes.recordset || reqRes.recordset.length === 0) {
      return res.status(404).json({ success: false, message: 'Approved prescription request not found' });
    }
    const presRequest = reqRes.recordset[0];

    // 2) Get patient + user info
    const patientRes = await pool.request()
      .input('patientId', presRequest.Patient_id)
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
        rq.Id AS RequestID,
        rq.Patient_id AS PatientID,
        rq.Doctor_id AS DoctorID,
        rq.Reason,
        rq.Status,

        pres.PrescriptionID,
        pres.CreationDate AS PrescriptionCreationDate,

        p.PatientID,
        u.FirstName + ' ' + COALESCE(u.MiddleName + ' ', '') + u.LastName AS PatientFullName,

        d.DoctorID,
        du.FirstName + ' ' + COALESCE(du.MiddleName + ' ', '') + du.LastName AS DoctorFullName,

        dm.MedicineID,
        dm.Description AS MedicineDescription,
        dm.Quantity,
        dm.CreationDate AS MedicineDate

      FROM Prescription_requests rq
      INNER JOIN Prescription pres ON pres.RequestID = rq.Id
      LEFT JOIN Patient p ON rq.Patient_id = p.PatientID
      LEFT JOIN Users u ON p.UserID = u.UserID
      LEFT JOIN Doctors d ON pres.DoctorID = d.DoctorID
      LEFT JOIN Users du ON d.UserID = du.UserID
      LEFT JOIN DrugAndMedicine dm ON pres.PrescriptionID = dm.PrescriptionID
      WHERE rq.Status = 'Approved'
      ORDER BY pres.CreationDate DESC, rq.Id DESC, dm.MedicineID
    `);

    return res.json(result.recordset);
  } catch (err) {
    console.error('Error fetching approved prescription-requests report:', err && err.message ? err.message : err);
    return res.status(500).json({ success: false, message: err.message || String(err) });
  }
});
