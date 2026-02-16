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
        p.PrescriptionID,
        p.PatientID,
        dm.Quantity,
        dm.Description,
        dm.CreationDate,
        p.ServiceType,
        u.FirstName,
        u.MiddleName,
        u.LastName
      FROM DrugAndMedicine dm
      INNER JOIN Prescription p ON p.PrescriptionID = dm.PrescriptionID
      INNER JOIN Patient pat ON pat.PatientID = p.PatientID
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
// CREATE a new prescription (header)
// -----------------------------
router.post("/create", async (req, res) => {
  const {
    PatientID,
    DoctorID,
    ServiceType,
    EndDate
  } = req.body;

  if (!PatientID || !DoctorID || !ServiceType) {
    return res.status(400).json({ 
      error: "PatientID, DoctorID, and ServiceType are required" 
    });
  }

  try {
    const pool = await poolPromise;

    const result = await pool.request()
      .input("PatientID", PatientID)
      .input("DoctorID", DoctorID)
      .input("ServiceType", ServiceType)
      .input("EndDate", EndDate || null)
      .input("CreationDate", new Date())
      .query(`
        INSERT INTO Prescription (PatientID, DoctorID, ServiceType, EndDate, CreationDate)
        VALUES (@PatientID, @DoctorID, @ServiceType, @EndDate, @CreationDate);
        SELECT SCOPE_IDENTITY() AS PrescriptionID;
      `);

    const prescriptionID = result.recordset[0].PrescriptionID;
    
    res.json({ 
      message: "Prescription created successfully",
      PrescriptionID: prescriptionID
    });
  } catch (err) {
    console.error("Error creating prescription:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// -----------------------------
// ADD a drug/medicine to an existing prescription
// -----------------------------
router.post("/", async (req, res) => {
  const {
    PrescriptionID,
    Quantity,
    Description,
    CreationDate
  } = req.body;

  if (!PrescriptionID) {
    return res.status(400).json({ 
      error: "PrescriptionID is required. Create a prescription first using /prescription/create" 
    });
  }

  try {
    const pool = await poolPromise;

    // Insert drug/medicine
    await pool.request()
      .input("PrescriptionID", PrescriptionID)
      .input("Quantity", Quantity)
      .input("Description", Description)
      .input("CreationDate", CreationDate || new Date())
      .query(`
        INSERT INTO DrugAndMedicine
        (PrescriptionID, Quantity, Description, CreationDate)
        VALUES (@PrescriptionID, @Quantity, @Description, @CreationDate)
      `);

    res.json({ message: "Drug/Medicine added successfully" });
  } catch (err) {
    console.error("Error adding drug/medicine:", err.message);
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
