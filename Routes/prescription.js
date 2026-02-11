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
        dm.DrugsAndMedicineId,
        dm.PatientID,
        dm.Quantity,
        dm.Description,
        dm.CreationDate,
        u.FirstName,
        u.MiddleName,
        u.LastName
      FROM DrugsAndMedicines dm
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
        SELECT dm.MedicineID, p.PrescriptionID, p.PatientID, dm.Quantity, dm.Description, dm.CreationDate,
               p.ServiceType,
               pat.PatientID, pat.UserID,
               u.FirstName, u.LastName
        FROM DrugAndMedicine dm
        INNER JOIN Prescription p ON p.PrescriptionID = dm.PrescriptionID
        INNER JOIN Patient pat ON pat.PatientID = p.PatientID
        INNER JOIN [Users] u ON u.UserID = pat.UserID
        WHERE p.PatientID = @patientID
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
  const { Quantity, Description } = req.body;

  try {
    const pool = await poolPromise;

    // Update DrugAndMedicine
    await pool.request()
      .input("MedicineID", req.params.id)
      .input("Quantity", Quantity)
      .input("Description", Description)
      .query(`
        UPDATE DrugAndMedicine
        SET Quantity = @Quantity,
            Description = @Description
        WHERE MedicineID = @MedicineID
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
