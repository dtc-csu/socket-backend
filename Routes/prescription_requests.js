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
    }
    res.json({ success: true, message: "Status updated" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
