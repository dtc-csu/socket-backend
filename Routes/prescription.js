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
      SELECT
        dm.MedicineID,
        dm.PrescriptionID,
        dm.Quantity,
        dm.Description,
        dm.CreationDate,
        u.FirstName,
        u.MiddleName,
        u.LastName
      FROM DrugAndMedicine dm
      INNER JOIN Patient pat ON pat.PatientID = dm.PatientID
      INNER JOIN Users u ON u.UserID = pat.UserID
      ORDER BY dm.CreationDate DESC
    `);

    console.log("Prescription result:", result.recordset);  // <--- DEBUG

    res.json(result.recordset);
  } catch (err) {
    console.error("Error fetching prescriptions:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// -----------------------------
// GET prescriptions by PatientID (for patients)
// -----------------------------
router.get("/patient/:patientID", async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input("patientID", req.params.patientID)
      .query(`
        SELECT dm.MedicineID, dm.PrescriptionID, dm.Quantity, dm.Description, dm.CreationDate,
               pat.PatientID, pat.UserID,
               u.FirstName, u.LastName
        FROM DrugAndMedicine dm
        INNER JOIN Patient pat ON pat.PatientID = dm.PatientID
        INNER JOIN [Users] u ON u.UserID = pat.UserID
        WHERE dm.PatientID = @patientID
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
    PrescriptionID,
    Quantity,
    Description,
    CreationDate
  } = req.body;

  try {
    const pool = await poolPromise;

    // Insert directly
    await pool.request()
      .input("PrescriptionID", PrescriptionID)
      .input("Quantity", Quantity)
      .input("Description", Description)
      .input("CreationDate", CreationDate)
      .query(`
        INSERT INTO DrugAndMedicine
        (PrescriptionID, Quantity, Description, CreationDate)
        VALUES (@PrescriptionID, @Quantity, @Description, @CreationDate)
      `);

    res.json({ message: "Prescription added successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -----------------------------
// EDIT a prescription
// -----------------------------
router.put("/:id", async (req, res) => {
  const { PatientID, Quantity, Description, EndDate } = req.body;

  try {
    const pool = await poolPromise;

    // Resolve PatientID → PatientIDNoAuto
    const patient = await pool.request()
      .input("PatientID", PatientID)
      .query(`
        SELECT PatientIDNoAuto FROM Patient WHERE PatientID = @PatientID
      `);

    if (patient.recordset.length === 0) {
      return res.status(400).json({ error: "Patient not found" });
    }

    const patientIDNoAuto = patient.recordset[0].PatientIDNoAuto;

    // Update DrugsAndMedicine
    await pool.request()
      .input("DrugsAndMedicineId", req.params.id)
      .input("PatientIDNoAuto", patientIDNoAuto)
      .input("Quantity", Quantity)
      .input("Description", Description)
      .input("EndDate", EndDate)
      .query(`
        UPDATE DrugsAndMedicine
        SET PatientIDNoAuto = @PatientIDNoAuto,
            Quantity = @Quantity,
            Description = @Description,
            EndDate = @EndDate
        WHERE DrugsAndMedicineId = @DrugsAndMedicineId
      `);

    res.json({ message: "Prescription updated successfully" });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -----------------------------
// DELETE a prescription
// -----------------------------
router.delete("/:id", controller.delete("DrugAndMedicine", "MedicineID"));

module.exports = router;
