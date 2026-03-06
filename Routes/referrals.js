const express = require('express');
const router = express.Router();
const poolPromise = require('../db');

// ============================================================
// GET ALL REFERRALS
// ============================================================
router.get('/', async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query(`
      SELECT
        r.ReferralID,
        r.PatientID,
        r.ReferralDate,
        r.ChiefComplaint,
        r.BriefHistoryandPhysicalExamination,
        r.Impression,
        r.Reasons,
        r.CreationDate,
        r.DoctorID,
        CONCAT(u.FirstName, ' ', COALESCE(CONCAT(u.MiddleName, ' '), ''), u.LastName) AS DoctorName,
        d.LicenseNumber
      FROM Referral r
      LEFT JOIN Doctors d ON r.DoctorID = d.DoctorID
      LEFT JOIN Users u ON d.UserID = u.UserID
      ORDER BY r.CreationDate DESC
    `);
    res.json(result.recordset);
  } catch (err) {
    console.error("Error fetching referrals:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ============================================================
// GRID: referrals joined with patient user data (for DGV)
// ============================================================
router.get('/grid', async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query(`
      SELECT
        r.ReferralID,
        r.PatientID,
        CONVERT(varchar(126), r.ReferralDate, 126) AS ReferralDate,
        r.ChiefComplaint,
        r.Impression,
        r.Reasons,
        CONVERT(varchar(126), r.CreationDate, 126) AS CreationDate,
        p.UserID AS PatientUserID,
        CONCAT(u.FirstName, ' ', COALESCE(CONCAT(u.MiddleName, ' '), ''), u.LastName) AS PatientFullName,
        CONCAT(du.FirstName, ' ', COALESCE(CONCAT(du.MiddleName, ' '), ''), du.LastName) AS DoctorName,
        d.LicenseNumber AS DoctorLicenseNumber
      FROM Referral r
      LEFT JOIN Patient p ON r.PatientID = p.PatientID
      LEFT JOIN Users u ON p.UserID = u.UserID
      LEFT JOIN Doctors d ON r.DoctorID = d.DoctorID
      LEFT JOIN Users du ON d.UserID = du.UserID
      ORDER BY r.CreationDate DESC
    `);

    res.json(result.recordset);
  } catch (err) {
    console.error('Error fetching referral grid:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});
// ============================================================
// GET REFERRAL REPORTS BY PATIENT ID (for reporting, no follow-up)
// ============================================================
router.get('/report/patient/:patientId', async (req, res) => {
  const patientId = req.params.patientId;
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('patientId', patientId)
      .query(`
        SELECT
          r.ReferralID,
          r.PatientID,
          r.ReferralDate,
          r.ChiefComplaint,
          r.BriefHistoryandPhysicalExamination,
          r.Impression,
          r.Reasons,
          r.DoctorID,
          CONCAT(u.FirstName, ' ', COALESCE(u.MiddleName, ''), ' ', u.LastName) AS PatientName,
          p.Age,
          p.Sex,
          p.CivilStatus,
          p.HomeAddress AS Address,
          d.LicenseNumber AS PhysicianLicensenNumber
        FROM Referral r
        LEFT JOIN Patient p ON r.PatientID = p.PatientID
        LEFT JOIN Users u ON p.UserID = u.UserID
        LEFT JOIN Doctors d ON r.DoctorID = d.DoctorID
        WHERE r.PatientID = @patientId
        ORDER BY r.ReferralDate DESC
      `);
    if (!result.recordset || result.recordset.length === 0) {
      return res.status(404).json({ success: false, message: 'No referral reports found for patient' });
    }
    res.json(result.recordset);
  } catch (err) {
    console.error("Error fetching referral reports by patient:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});
// ============================================================
// GET REFERRAL REPORT BY REFERRAL ID (for reporting)
// ============================================================
router.get('/report/referral/:referralId', async (req, res) => {
  const referralId = req.params.referralId;
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('referralId', referralId)
      .query(`
        SELECT
          r.ReferralID AS referralid,
          r.PatientID AS patientId,
          r.ReferralDate AS referralDate,
          NULL AS followUpDate,
          r.ChiefComplaint AS chiefComplaint,
          r.BriefHistoryandPhysicalExamination AS briefHistoryandPhysicalExamination,
          r.Impression AS impression,
          r.Reasons AS reasons,
          r.DoctorID AS doctorId
        FROM Referral r
        WHERE r.ReferralID = @referralId
      `);
    if (!result.recordset || result.recordset.length === 0) {
      return res.status(404).json({ success: false, message: 'Referral report not found' });
    }
    res.json(result.recordset[0]);
  } catch (err) {
    console.error("Error fetching referral report:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ============================================================
// GET REFERRALS BY PATIENT ID
// ============================================================
router.get('/patient/:patientId', async (req, res) => {
  const patientId = req.params.patientId;
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('patientId', patientId)
      .query(`
        SELECT
          r.ReferralID,
          r.PatientID,
          r.ReferralDate,
          r.ChiefComplaint,
          r.BriefHistoryandPhysicalExamination,
          r.Impression,
          r.Reasons,
          r.CreationDate,
          r.DoctorID,
          CONCAT(pu.FirstName, ' ', COALESCE(CONCAT(pu.MiddleName, ' '), ''), pu.LastName) AS PatientName,
          pu.UserID AS PatientUserID,
          p.PatientID,
          p.Gender,
          p.DateofBirth AS DateOfBirth,
          p.HomeAddress,
          p.ContactNumber,
          CONCAT(du.FirstName, ' ', COALESCE(CONCAT(du.MiddleName, ' '), ''), du.LastName) AS DoctorName,
          du.UserID AS DoctorUserID
        FROM Referral r
        LEFT JOIN Patient p ON r.PatientID = p.PatientID
        LEFT JOIN Users pu ON p.UserID = pu.UserID
        LEFT JOIN Doctors d ON r.DoctorID = d.DoctorID
        LEFT JOIN Users du ON d.UserID = du.UserID
        WHERE r.PatientID = @patientId
           OR p.UserID = @patientId
        ORDER BY r.CreationDate DESC
      `);
    res.json(result.recordset);
  } catch (err) {
    console.error("Error fetching patient referrals:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ============================================================
// GET REFERRALS BY DOCTOR ID
// ============================================================
router.get('/doctor/:doctorId', async (req, res) => {
  const doctorId = req.params.doctorId;
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('doctorId', doctorId)
      .query(`
        SELECT
          r.*,
          CONCAT(u.FirstName, ' ', COALESCE(CONCAT(u.MiddleName, ' '), ''), u.LastName) AS DoctorName
        FROM Referral r
        LEFT JOIN Doctors d ON r.DoctorID = d.DoctorID
        LEFT JOIN Users u ON d.UserID = u.UserID
        WHERE r.DoctorID = @doctorId
        ORDER BY r.CreationDate DESC
      `);
    res.json(result.recordset);
  } catch (err) {
    console.error("Error fetching doctor referrals:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ============================================================
// GET REFERRAL BY ID
// ============================================================
router.get('/:referralId', async (req, res) => {
  const referralId = req.params.referralId;
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('referralId', referralId)
      .query(`
        SELECT
          r.*,
          CONCAT(u.FirstName, ' ', COALESCE(CONCAT(u.MiddleName, ' '), ''), u.LastName) AS DoctorName
        FROM Referral r
        LEFT JOIN Doctors d ON r.DoctorID = d.DoctorID
        LEFT JOIN Users u ON d.UserID = u.UserID
        WHERE r.ReferralID = @referralId
      `);
    
    if (result.recordset.length === 0) {
      return res.status(404).json({ success: false, message: 'Referral not found' });
    }
    
    res.json(result.recordset[0]);
  } catch (err) {
    console.error("Error fetching referral:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ============================================================
// CREATE NEW REFERRAL
// ============================================================
router.post('/', async (req, res) => {
  const {
    patientId,
    referralDate,
    followUpDate,
    chiefComplaint,
    briefHistoryandPhysicalExamination,
    impression,
    reasons,
    doctorId
  } = req.body;

  const resolvedReferralDate = referralDate || followUpDate;

  if (!patientId || !resolvedReferralDate) {
    return res.status(400).json({ 
      success: false, 
      message: "patientId and referralDate are required" 
    });
  }

  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input("patientId", patientId)
      .input("referralDate", new Date(resolvedReferralDate))
      .input("chiefComplaint", chiefComplaint || null)
      .input("briefHistoryandPhysicalExamination", briefHistoryandPhysicalExamination || null)
      .input("impression", impression || null)
      .input("reasons", reasons || null)
      .input("doctorId", doctorId || null)
      .query(`
        INSERT INTO Referral (
          PatientID, 
          ReferralDate, 
          ChiefComplaint, 
          BriefHistoryandPhysicalExamination, 
          Impression, 
          Reasons, 
          CreationDate,
          DoctorID
        )
        VALUES (
          @patientId, 
          @referralDate, 
          @chiefComplaint, 
          @briefHistoryandPhysicalExamination, 
          @impression, 
          @reasons, 
          GETDATE(),
          @doctorId
        );
        SELECT SCOPE_IDENTITY() AS ReferralID;
      `);

    const newReferralId = result.recordset[0].ReferralID;
    res.json({ 
      success: true, 
      message: 'Referral created successfully', 
      referralId: newReferralId 
    });
  } catch (err) {
    console.error("Error creating referral:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ============================================================
// UPDATE REFERRAL
// ============================================================
router.put('/:referralId', async (req, res) => {
  const referralId = req.params.referralId;
  const {
    referralDate,
    followUpDate,
    chiefComplaint,
    briefHistoryandPhysicalExamination,
    impression,
    reasons,
    doctorId
  } = req.body;

  const resolvedReferralDate = referralDate || followUpDate;

  try {
    const pool = await poolPromise;
    await pool.request()
      .input("referralId", referralId)
      .input("referralDate", resolvedReferralDate ? new Date(resolvedReferralDate) : null)
      .input("chiefComplaint", chiefComplaint || null)
      .input("briefHistoryandPhysicalExamination", briefHistoryandPhysicalExamination || null)
      .input("impression", impression || null)
      .input("reasons", reasons || null)
      .input("doctorId", doctorId || null)
      .query(`
        UPDATE Referral
        SET 
          ReferralDate = COALESCE(@referralDate, ReferralDate),
          ChiefComplaint = @chiefComplaint,
          BriefHistoryandPhysicalExamination = @briefHistoryandPhysicalExamination,
          Impression = @impression,
          Reasons = @reasons,
          DoctorID = @doctorId
        WHERE ReferralID = @referralId
      `);

    res.json({ success: true, message: `Referral ${referralId} updated successfully` });
  } catch (err) {
    console.error("Error updating referral:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ============================================================
// DELETE REFERRAL
// ============================================================
router.delete('/:referralId', async (req, res) => {
  const referralId = req.params.referralId;
  try {
    const pool = await poolPromise;
    await pool.request()
      .input('referralId', referralId)
      .query('DELETE FROM Referral WHERE ReferralID = @referralId');
    
    res.json({ success: true, message: `Referral ${referralId} deleted successfully` });
  } catch (err) {
    console.error("Error deleting referral:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
