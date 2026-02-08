const express = require('express');
const router = express.Router();
const poolPromise = require('../db');

// ---------------------- GET all follow-ups ----------------------
router.get('/', async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query(`
      SELECT
        FollowUpID,
        AppointmentID,
        PatientID,
        FollowUpDate,
        ChiefComplaint,
        BriefHistoryandPhysicalExamination,
        Impression,
        Reasons,
        CreationDate
      FROM FollowUps
      ORDER BY FollowUpDate DESC
    `);
    res.json(result.recordset);
  } catch (err) {
    console.error("Error fetching follow-ups:", err);
    res.status(500).json({ error: err.message });
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
    res.status(500).json({ error: err.message });
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
    res.status(500).json({ error: err.message });
  }
});

// ---------------------- POST create a new follow-up ----------------------
router.post('/', async (req, res) => {
  const {
    appointmentId,
    patientId,
    followUpDate,
    chiefComplaint,
    briefHistoryandPhysicalExamination,
    impression,
    reasons
  } = req.body;

  if (!appointmentId || !patientId || !followUpDate) {
    return res.status(400).json({ error: "appointmentId, patientId, and followUpDate are required" });
  }

  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input("appointmentId", appointmentId)
      .input("patientId", patientId)
      .input("followUpDate", new Date(followUpDate))
      .input("chiefComplaint", chiefComplaint || null)
      .input("briefHistoryandPhysicalExamination", briefHistoryandPhysicalExamination || null)
      .input("impression", impression || null)
      .input("reasons", reasons || null)
      .query(`
        INSERT INTO FollowUps (AppointmentID, PatientID, FollowUpDate, ChiefComplaint, BriefHistoryandPhysicalExamination, Impression, Reasons, CreationDate)
        VALUES (@appointmentId, @patientId, @followUpDate, @chiefComplaint, @briefHistoryandPhysicalExamination, @impression, @reasons, GETDATE());
        SELECT SCOPE_IDENTITY() AS FollowUpID;
      `);

    const newFollowUpId = result.recordset[0].FollowUpID;
    res.json({ success: true, followUpId: newFollowUpId });
  } catch (err) {
    console.error("Error creating follow-up:", err);
    res.status(500).json({ error: err.message });
  }
});

// ---------------------- PUT update follow-up ----------------------
router.put('/:followUpId', async (req, res) => {
  const followUpId = req.params.followUpId;
  const {
    chiefComplaint,
    briefHistoryandPhysicalExamination,
    impression,
    reasons
  } = req.body;

  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input("followUpId", followUpId)
      .input("chiefComplaint", chiefComplaint || null)
      .input("briefHistoryandPhysicalExamination", briefHistoryandPhysicalExamination || null)
      .input("impression", impression || null)
      .input("reasons", reasons || null)
      .query(`
        UPDATE FollowUps
        SET ChiefComplaint = @chiefComplaint,
            BriefHistoryandPhysicalExamination = @briefHistoryandPhysicalExamination,
            Impression = @impression,
            Reasons = @reasons
        WHERE FollowUpID = @followUpId
      `);

    res.json({ success: true, message: `Follow-up ${followUpId} updated` });
  } catch (err) {
    console.error("Error updating follow-up:", err);
    res.status(500).json({ error: err.message });
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
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
