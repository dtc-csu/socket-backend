// routes/appointments.js
const express = require('express');
const router = express.Router();
const poolPromise = require('../db');

// ---------------------- GET all appointments ----------------------
router.get('/', async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query(`
      SELECT 
        AppointmentID,
        PatientID,
        AppointmentDate,
        Status,
        ChiefComplaint,
        CreatedAt
      FROM Appointments
      ORDER BY AppointmentDate DESC
    `);
    res.json(result.recordset);
  } catch (err) {
    console.error("Error fetching appointments:", err);
    res.status(500).json({ error: err.message });
  }
});

// ---------------------- GET appointments by patient ID ----------------------
router.get('/patient/:patientId', async (req, res) => {
  const patientId = req.params.patientId;
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('patientId', patientId)
      .query(`
        SELECT *
        FROM Appointments
        WHERE PatientID = @patientId
        ORDER BY AppointmentDate DESC
      `);
    res.json(result.recordset);
  } catch (err) {
    console.error("Error fetching patient appointments:", err);
    res.status(500).json({ error: err.message });
  }
});

// ---------------------- POST create a new appointment ----------------------
router.post('/', async (req, res) => {
  const { patientId, appointmentDate, status = 'Pending', chiefComplaint } = req.body;

  if (!patientId || !appointmentDate) {
    return res.status(400).json({ error: "patientId and appointmentDate are required" });
  }

  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input("patientId", patientId)
      .input("appointmentDate", new Date(appointmentDate))
      .input("status", status)
      .input("chiefComplaint", chiefComplaint || null)
      .query(`
        INSERT INTO Appointments (PatientID, AppointmentDate, Status, ChiefComplaint, CreatedAt)
        VALUES (@patientId, @appointmentDate, @status, @chiefComplaint, GETDATE());
        SELECT SCOPE_IDENTITY() AS AppointmentID;
      `);

    const newAppointmentId = result.recordset[0].AppointmentID;
    res.json({ success: true, appointmentId: newAppointmentId });
  } catch (err) {
    console.error("Error creating appointment:", err);
    res.status(500).json({ error: err.message });
  }
});

// ---------------------- PUT update appointment status ----------------------
router.put('/:appointmentId', async (req, res) => {
  const appointmentId = req.params.appointmentId;
  const { status, AppointmentDate } = req.body;

  console.log("PUT request body:", req.body);
  console.log("AppointmentDate received:", AppointmentDate);

  if (!status) {
    return res.status(400).json({ error: "Status is required" });
  }

  try {
    const pool = await poolPromise;
    let query = `
      UPDATE Appointments
      SET Status = @status
      WHERE AppointmentID = @appointmentId
    `;
    let request = pool.request()
      .input("appointmentId", appointmentId)
      .input("status", status);

    if (AppointmentDate) {
      console.log("AppointmentDate received:", AppointmentDate);
      query = `
        UPDATE Appointments
        SET Status = @status, AppointmentDate = @appointmentDate
        WHERE AppointmentID = @appointmentId
      `;
      request = request.input("appointmentDate", AppointmentDate);
      console.log("Input added for appointmentDate:", AppointmentDate);
    }

    console.log("Executing query:", query);
    const result = await request.query(query);
    console.log("Query result:", result);

    res.json({ success: true, message: `Appointment ${appointmentId} updated to ${status}` });
  } catch (err) {
    console.error("Error updating appointment:", err);
    res.status(500).json({ error: err.message });
  }
});

// ---------------------- GET all appointment follow-ups ----------------------
router.get('/followups', async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query(`
      SELECT
        followUpId,
        appointmentId,
        patientId,
        followUpDate,
        remarks,
        nextFollowUpDate,
        createdAt
      FROM AppointmentFollowUps
      ORDER BY followUpDate DESC
    `);
    res.json(result.recordset);
  } catch (err) {
    console.error("Error fetching follow-ups:", err);
    res.status(500).json({ error: err.message });
  }
});

// ---------------------- GET follow-ups by appointment ID ----------------------
router.get('/followups/appointment/:appointmentId', async (req, res) => {
  const appointmentId = req.params.appointmentId;
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('appointmentId', appointmentId)
      .query(`
        SELECT *
        FROM AppointmentFollowUps
        WHERE appointmentId = @appointmentId
        ORDER BY followUpDate DESC
      `);
    res.json(result.recordset);
  } catch (err) {
    console.error("Error fetching appointment follow-ups:", err);
    res.status(500).json({ error: err.message });
  }
});

// ---------------------- POST create a new follow-up ----------------------
router.post('/followups', async (req, res) => {
  const { appointmentId, patientId, followUpDate, remarks, nextFollowUpDate } = req.body;

  if (!appointmentId || !patientId || !followUpDate || !remarks) {
    return res.status(400).json({ error: "appointmentId, patientId, followUpDate, and remarks are required" });
  }

  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input("appointmentId", appointmentId)
      .input("patientId", patientId)
      .input("followUpDate", new Date(followUpDate))
      .input("remarks", remarks)
      .input("nextFollowUpDate", nextFollowUpDate ? new Date(nextFollowUpDate) : null)
      .query(`
        INSERT INTO AppointmentFollowUps (appointmentId, patientId, followUpDate, remarks, nextFollowUpDate, createdAt)
        VALUES (@appointmentId, @patientId, @followUpDate, @remarks, @nextFollowUpDate, GETDATE());
        SELECT SCOPE_IDENTITY() AS followUpId;
      `);

    const newFollowUpId = result.recordset[0].followUpId;
    res.json({ success: true, followUpId: newFollowUpId });
  } catch (err) {
    console.error("Error creating follow-up:", err);
    res.status(500).json({ error: err.message });
  }
});

// ---------------------- PUT update follow-up ----------------------
router.put('/followups/:followUpId', async (req, res) => {
  const followUpId = req.params.followUpId;
  const { remarks, nextFollowUpDate } = req.body;

  try {
    const pool = await poolPromise;
    let query = `
      UPDATE AppointmentFollowUps
      SET remarks = @remarks
      WHERE followUpId = @followUpId
    `;
    let request = pool.request()
      .input("followUpId", followUpId)
      .input("remarks", remarks);

    if (nextFollowUpDate) {
      query = `
        UPDATE AppointmentFollowUps
        SET remarks = @remarks, nextFollowUpDate = @nextFollowUpDate
        WHERE followUpId = @followUpId
      `;
      request = request.input("nextFollowUpDate", new Date(nextFollowUpDate));
    }

    const result = await request.query(query);
    res.json({ success: true, message: `Follow-up ${followUpId} updated` });
  } catch (err) {
    console.error("Error updating follow-up:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
