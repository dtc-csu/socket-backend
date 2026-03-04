// routes/appointments.js
const express = require('express');
const router = express.Router();
const poolPromise = require('../db');
const generic = require('../Controllers/genericController')(poolPromise);

// ---------------------- GET current MaxSlot ----------------------
router.get('/maxslot', async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query(`
      SELECT TOP (1) SettingValue
      FROM SystemSettings
      WHERE SettingName = 'DefaultMaxSlot'
    `);

    if (
      result.recordset.length > 0 &&
      result.recordset[0].SettingValue !== null
    ) {
      res.json({ maxSlot: result.recordset[0].SettingValue });
    } else {
      res.json({ maxSlot: 50 });
    }
  } catch (err) {
    console.error("Error fetching maxslot:", err);
    res.status(500).json({ success: false, message: err.message, maxSlot: 50 });
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
        CreatedAt
      FROM Appointments
      ORDER BY AppointmentDate DESC
    `);
    res.json(result.recordset);
  } catch (err) {
    console.error("Error fetching appointments:", err);
    res.status(500).json({ success: false, message: err.message });
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
    res.status(500).json({ success: false, message: err.message });
  }
});

// ---------------------- POST create a new appointment ----------------------
router.post('/', async (req, res) => {
  const { patientId, appointmentDate, status = 'Pending', chiefComplaint } = req.body;

  if (!patientId || !appointmentDate) {
    return res.status(400).json({ success: false, message: "patientId and appointmentDate are required" });
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
    res.json({ success: true, message: 'Appointment created successfully', appointmentId: newAppointmentId });
  } catch (err) {
    console.error("Error creating appointment:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ---------------------- PUT update appointment status ----------------------
router.put('/:appointmentId', async (req, res) => {
  const appointmentId = req.params.appointmentId;
  const { status, AppointmentDate } = req.body;

  console.log("PUT request body:", req.body);
  console.log("AppointmentDate received:", AppointmentDate);

  if (!status) {
    return res.status(400).json({ success: false, message: "Status is required" });
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
    res.status(500).json({ success: false, message: err.message });
  }
});

// ---------------------- GET appointments by specific date ----------------------
router.get('/date/:date', async (req, res) => {
  const date = req.params.date;
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('date', date)
      .query(`
        SELECT *
        FROM Appointments
        WHERE DATE(AppointmentDate) = DATE(@date)
        ORDER BY AppointmentDate ASC
      `);
    res.json(result.recordset);
  } catch (err) {
    console.error("Error fetching appointments by date:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ---------------------- GET all active appointments ----------------------
router.get('/active/list', async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query(`
      SELECT *
      FROM Appointments
      WHERE Status NOT IN ('Cancelled', 'Completed', 'Rejected')
      ORDER BY AppointmentDate ASC
    `);
    res.json(result.recordset);
  } catch (err) {
    console.error("Error fetching active appointments:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ---------------------- CHECK if patient has appointment on date ----------------------
router.get('/check/:patientId/:date', async (req, res) => {
  const { patientId, date } = req.params;
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('patientId', patientId)
      .input('date', date)
      .query(`
        SELECT COUNT(*) AS appointmentCount
        FROM Appointments
        WHERE PatientID = @patientId
          AND DATE(AppointmentDate) = DATE(@date)
          AND Status NOT IN ('Cancelled', 'Rejected')
      `);
    
    const hasAppointment = result.recordset[0].appointmentCount > 0;
    
    res.json({ 
      hasAppointment,
      count: result.recordset[0].appointmentCount
    });
  } catch (err) {
    console.error("Error checking patient appointment:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ---------------------- GET appointment by ID ----------------------
router.get('/:appointmentId', async (req, res) => {
  const appointmentId = req.params.appointmentId;
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('appointmentId', appointmentId)
      .query(`
        SELECT *
        FROM Appointments
        WHERE AppointmentID = @appointmentId
      `);
    
    if (result.recordset.length === 0) {
      return res.status(404).json({ success: false, message: "Appointment not found" });
    }
    
    res.json(result.recordset[0]);
  } catch (err) {
    console.error("Error fetching appointment:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ---------------------- DELETE appointment ----------------------
router.delete('/:appointmentId', async (req, res) => {
  const appointmentId = req.params.appointmentId;
  try {
    const pool = await poolPromise;
    await pool.request()
      .input('appointmentId', appointmentId)
      .query(`DELETE FROM Appointments WHERE AppointmentID = @appointmentId`);
    
    res.json({ success: true, message: `Appointment ${appointmentId} deleted` });
  } catch (err) {
    console.error("Error deleting appointment:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ---------------------- SEARCH/FILTER appointments ----------------------
router.get('/search/filter', async (req, res) => {
  try {
    const pool = await poolPromise;
    const { status, patientId, startDate, endDate } = req.query;
    
    const request = pool.request();
    let query = `SELECT * FROM Appointments WHERE 1=1`;
    
    if (status) {
      query += ` AND Status = @status`;
      request.input('status', status);
    }
    
    if (patientId) {
      query += ` AND PatientID = @patientId`;
      request.input('patientId', patientId);
    }
    
    if (startDate) {
      query += ` AND AppointmentDate >= @startDate`;
      request.input('startDate', startDate);
    }
    
    if (endDate) {
      query += ` AND AppointmentDate <= @endDate`;
      request.input('endDate', endDate);
    }
    
    query += ` ORDER BY AppointmentDate DESC`;
    
    const result = await request.query(query);
    res.json(result.recordset);
  } catch (err) {
    console.error("Error searching appointments:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
