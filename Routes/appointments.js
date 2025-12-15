// routes/appointments.js
const express = require('express');
const router = express.Router();
const poolPromise = require('./db');

// ---------------------- GET appointments for a specific doctor ----------------------
router.get('/doctor/:doctorId', async (req, res) => {
  const doctorId = req.params.doctorId;

  try {
    const pool = await poolPromise;

    const result = await pool
      .request()
      .input("doctorId", doctorId)
      .query(`
        SELECT 
          A.AppointmentID,
          A.PatientID,
          A.DoctorID,
          A.AppointmentDate,
          A.Status,
          A.CreatedAt,
          A.ChiefComplaint,
          (PU.FirstName + ' ' + PU.LastName) AS PatientName,
          (DU.FirstName + ' ' + DU.LastName) AS DoctorName
        FROM Appointments A
        LEFT JOIN Patient P ON A.PatientID = P.PatientID
        LEFT JOIN Users PU ON P.UserID = PU.UserID
        LEFT JOIN Doctors D ON A.DoctorID = D.DoctorID
        LEFT JOIN Users DU ON D.UserID = DU.UserID
        WHERE A.DoctorID = @doctorId
        ORDER BY A.AppointmentDate DESC
      `);

    console.log("Appointments fetched:", result.recordset);
    res.json(result.recordset);

  } catch (err) {
    console.error("Error fetching appointments:", err);
    res.status(500).json({ error: err.message });
  }
});

// ---------------------- PUT to update appointment status ----------------------
router.put('/:appointmentId', async (req, res) => {
  const appointmentId = req.params.appointmentId;
  const { status } = req.body;

  if (!status) {
    return res.status(400).json({ error: "Status is required" });
  }

  try {
    const pool = await poolPromise;

    const result = await pool
      .request()
      .input("appointmentId", appointmentId)
      .input("status", status)
      .query(`
        UPDATE Appointments
        SET Status = @status
        WHERE AppointmentID = @appointmentId
      `);

    console.log(`Appointment ${appointmentId} updated to ${status}`);
    res.json({ success: true, message: `Appointment ${appointmentId} updated to ${status}` });

  } catch (err) {
    console.error("Error updating appointment:", err);
    res.status(500).json({ error: err.message });
  }
});
// ---------------------- POST create a new appointment ----------------------
router.post('/', async (req, res) => {
  const {
    patientId,
    doctorId,
    appointmentDate,
    status = 'Pending',
    chiefComplaint,
  } = req.body;

  // if (!patientId || !doctorId || !appointmentDate) {
  //   return res.status(400).json({ error: "patientId, doctorId, and appointmentDate are required" });
  // }

  try {
    const pool = await poolPromise;

    const result = await pool
      .request()
      .input("patientId", patientId)
      .input("doctorId", doctorId)
      .input("appointmentDate", new Date(appointmentDate))
      .input("status", status)
      .input("chiefComplaint", chiefComplaint || null)
      .query(`
        INSERT INTO Appointments (PatientID, DoctorID, AppointmentDate, Status, ChiefComplaint, CreatedAt)
        VALUES (@patientId, @doctorId, @appointmentDate, @status, @chiefComplaint, GETDATE());
        SELECT SCOPE_IDENTITY() AS AppointmentID;
      `);

    const newAppointmentId = result.recordset[0].AppointmentID;
    console.log("New appointment created:", newAppointmentId);
    res.json({ success: true, appointmentId: newAppointmentId });

  } catch (err) {
    console.error("Error creating appointment:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
