const express = require('express');
const router = express.Router();
const poolPromise = require('../db');

// ---------------------- GET all follow-ups ----------------------
router.get('/', async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query(`
      SELECT
        f.FollowUpID,
        f.AppointmentID,
        f.PatientID,
        CONVERT(varchar(126), f.FollowUpDate, 126) AS FollowUpDate,
        f.Notes,
        CONVERT(varchar(126), f.CreatedAt, 126) AS CreatedAt,
        ISNULL(u.FirstName,'') + ' ' + ISNULL(u.LastName,'') AS PatientFullName
      FROM FollowUps f
      LEFT JOIN Patient p ON f.PatientID = p.PatientID
      LEFT JOIN Users u ON p.UserID = u.UserID
      ORDER BY f.FollowUpDate DESC
    `);
    res.json(result.recordset);
  } catch (err) {
    console.error("Error fetching follow-ups:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ---------------------- GET follow-ups by appointment ID ----------------------
router.get('/appointment/:appointmentId', async (req, res) => {
  const appointmentId = req.params.appointmentId;
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('appointmentId', appointmentId)
      .query(`
        SELECT *
        FROM FollowUps
        WHERE AppointmentID = @appointmentId
        ORDER BY FollowUpDate DESC
      `);
    res.json(result.recordset);
  } catch (err) {
    console.error("Error fetching appointment follow-ups:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ---------------------- GET follow-ups by patient ID ----------------------
router.get('/patient/:patientId', async (req, res) => {
  const patientId = req.params.patientId;
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('patientId', patientId)
      .query(`
        SELECT *
        FROM FollowUps
        WHERE PatientID = @patientId
        ORDER BY FollowUpDate DESC
      `);
    res.json(result.recordset);
  } catch (err) {
    console.error("Error fetching patient follow-ups:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ---------------------- POST create a new follow-up ----------------------
router.post('/', async (req, res) => {
  const {
    appointmentId,
    patientId,
    followUpDate,
    notes
  } = req.body;

  if (!patientId || !followUpDate) {
    return res.status(400).json({ success: false, message: "patientId and followUpDate are required" });
  }

  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input("appointmentId", appointmentId || null)
      .input("patientId", patientId)
      .input("followUpDate", new Date(followUpDate))
      .input("notes", notes || null)
      .query(`
        INSERT INTO FollowUps (AppointmentID, PatientID, FollowUpDate, Notes, CreatedAt)
        VALUES (@appointmentId, @patientId, @followUpDate, @notes, GETDATE());
        SELECT SCOPE_IDENTITY() AS FollowUpID;
      `);

    const newFollowUpId = result.recordset[0].FollowUpID;
    res.json({ success: true, message: 'Follow-up created successfully', followUpId: newFollowUpId });
  } catch (err) {
    console.error("Error creating follow-up:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ---------------------- PUT update follow-up ----------------------
router.put('/:followUpId', async (req, res) => {
  const followUpId = req.params.followUpId;
  const {
    followUpDate,
    notes
  } = req.body;

  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input("followUpId", followUpId)
      .input("followUpDate", followUpDate ? new Date(followUpDate) : null)
      .input("notes", notes || null)
      .query(`
        UPDATE FollowUps
        SET FollowUpDate = COALESCE(@followUpDate, FollowUpDate),
            Notes = @notes
        WHERE FollowUpID = @followUpId
      `);

    res.json({ success: true, message: `Follow-up ${followUpId} updated` });
  } catch (err) {
    console.error("Error updating follow-up:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ---------------------- DELETE follow-up ----------------------
router.delete('/:followUpId', async (req, res) => {
  const followUpId = req.params.followUpId;
  try {
    const pool = await poolPromise;
    await pool.request()
      .input('followUpId', followUpId)
      .query('DELETE FROM FollowUps WHERE FollowUpID = @followUpId');
    res.json({ success: true, message: `Follow-up ${followUpId} deleted` });
  } catch (err) {
    console.error("Error deleting follow-up:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
