const express = require("express");
const router = express.Router();
const crud = require("../Controllers/genericController");
const poolPromise = require("../db");
const controller = crud(poolPromise);

// -----------------------------
// GET all prescriptions (for doctors)
// -----------------------------
router.get("/", async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query(`
      SELECT dm.DrugsAndMedicineId, dm.PatientID, dm.Quantity, dm.Description, dm.CreationDate, dm.EndDate,
             u.FirstName, u.MiddleName, u.LastName
      FROM DrugsAndMedicine dm
      INNER JOIN Patient pat ON pat.PatientIDNoAuto = dm.PatientIDNoAuto
      INNER JOIN Users u ON u.userid = pat.UserID
      ORDER BY dm.CreationDate DESC
    `);
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -----------------------------
// GET prescriptions by PatientIDNoAuto (for patients)
// -----------------------------
router.get("/patient/:patientIDNoAuto", async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input("patientID", req.params.patientIDNoAuto)
      .query(`
        SELECT dm.DrugsAndMedicineId, dm.PatientIDNoAuto, dm.Quantity, dm.Description, dm.CreationDate, dm.EndDate,
               pat.PatientIDNoAuto, pat.UserID,
               u.FirstName, u.LastName
        FROM DrugsAndMedicine dm
        INNER JOIN Patient pat ON pat.PatientIDNoAuto = dm.PatientIDNoAuto
        INNER JOIN [Users] u ON u.UserID = pat.UserID
        WHERE dm.PatientIDNoAuto = @patientID
        ORDER BY dm.CreationDate DESC
      `);
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -----------------------------
// ADD a prescription
// -----------------------------
router.post("/", async (req, res) => {
  const {
    PatientID,
    Quantity,
    Description,
    CreationDate,
    EndDate
  } = req.body;

  try {
    const pool = await poolPromise;

    // Resolve PatientID → PatientIDNoAuto
    const patient = await pool.request()
      .input("PatientID", PatientID)
      .query(`
        SELECT PatientIDNoAuto
        FROM Patient
        WHERE PatientID = @PatientID
      `);

    if (patient.recordset.length === 0) {
      return res.status(400).json({ error: "Patient not found" });
    }

    const patientIDNoAuto = patient.recordset[0].PatientIDNoAuto;

    // Insert
    await pool.request()
      .input("PatientIDNoAuto", patientIDNoAuto)
      .input("Quantity", Quantity)
      .input("Description", Description)
      .input("CreationDate", CreationDate)
      .input("EndDate", EndDate)
      .query(`
        INSERT INTO DrugsAndMedicine
        (PatientIDNoAuto, Quantity, Description, CreationDate, EndDate)
        VALUES (@PatientIDNoAuto, @Quantity, @Description, @CreationDate, @EndDate)
      `);

    res.json({ message: "Prescription added successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -----------------------------
// EDIT a prescription
// -----------------------------
router.put("/:id", controller.edit("DrugsAndMedicine", "DrugsAndMedicineId"));

// -----------------------------
// DELETE a prescription
// -----------------------------
router.delete("/:id", controller.delete("DrugsAndMedicine", "DrugsAndMedicineId"));

module.exports = router;
