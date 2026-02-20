// routes/appointments.js
const express = require('express');
const router = express.Router();
const poolPromise = require('../db');

// ---------------------- GET current MaxSlot ----------------------
router.get('/maxslot', async (req, res) => {
  try {
    const pool = await poolPromise;
    // Get the latest appointment with a MaxSlot value
    const result = await pool.request().query(`
      SELECT TOP 1 MaxSlot
      FROM Appointments
      WHERE MaxSlot IS NOT NULL
      ORDER BY AppointmentDate DESC
    `);
    
    if (result.recordset.length > 0 && result.recordset[0].MaxSlot !== null) {
      res.json({ maxSlot: result.recordset[0].MaxSlot });
    } else {
      // Return default value if no MaxSlot found
      res.json({ maxSlot: 50 });
    }
  } catch (err) {
    console.error("Error fetching maxslot:", err);
    res.status(500).json({ error: err.message, maxSlot: 50 });
  }
});

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
        CreatedAt,
        MaxSlot
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

module.exports = router;
