// routes/patientconsent.js
const express = require('express');
const router = express.Router();
const poolPromise = require('../db');
const generic = require('../Controllers/genericController')(poolPromise);

// ----------------------------------------------------
// GENERIC CRUD ROUTES FOR PatientConsent
// ----------------------------------------------------
router.get('/', async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query(`SELECT * FROM PatientConsent ORDER BY CreatedAt DESC`);
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ConsentID is identity/auto-increment, do not include in add
router.post('/', async (req, res) => {
  if ('ConsentID' in req.body) {
    delete req.body.ConsentID;
  }
  return generic.add("PatientConsent", "ConsentID")(req, res);
});        // Add patient consent
router.put('/:id', generic.edit("PatientConsent", "ConsentID"));     // Update patient consent
router.delete('/:id', generic.delete("PatientConsent", "ConsentID"));// Delete patient consent

// ----------------------------------------------------
// GET PATIENT CONSENT BY PATIENT ID
// ----------------------------------------------------
router.get('/patient/:patientId', async (req, res) => {
  const patientId = req.params.patientId;

  try {
    const pool = await poolPromise;

    const result = await pool.request()
      .input('patientId', patientId)
      .query(`
        SELECT *
        FROM PatientConsent
        WHERE PatientID = @patientId
        ORDER BY CreatedAt DESC
      `);

    return res.json(result.recordset);

  } catch (err) {
    console.error("Error fetching patient consent:", err);
    return res.status(500).json({ success: false, message: 'Server error: ' + err.message });
  }
});

// ----------------------------------------------------
// GET PATIENT CONSENT BY ID
// ----------------------------------------------------
router.get('/:id', async (req, res) => {
  const id = req.params.id;

  try {
    const pool = await poolPromise;

    const result = await pool.request()
      .input('id', id)
      .query(`
        SELECT *
        FROM PatientConsent
        WHERE ConsentID = @id
      `);

    if (result.recordset.length > 0) {
      return res.json(result.recordset[0]);
    } else {
      return res.status(404).json({ success: false, message: 'Patient consent not found' });
    }

  } catch (err) {
    console.error("Error fetching patient consent:", err);
    return res.status(500).json({ success: false, message: 'Server error: ' + err.message });
  }
});

module.exports = router;
