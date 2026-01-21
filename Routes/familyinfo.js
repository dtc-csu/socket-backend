const express = require("express");
const router = express.Router();
const crud = require("../Controllers/genericController");
const poolPromise = require("../db");
const controller = crud(poolPromise);

// GET family info by PatientID
router.get("/patient/:id", async (req, res) => {
  try {
    const pool = await poolPromise;

    // First, get PatientIDNoAuto from Patient table using PatientID
    const patientResult = await pool
      .request()
      .input("patientId", req.params.id)
      .query("SELECT PatientIDNoAuto FROM Patient WHERE PatientID = @patientId");

    if (patientResult.recordset.length === 0) {
      return res.status(404).json({ message: "Patient not found" });
    }

    const patientIdNoAuto = patientResult.recordset[0].PatientIDNoAuto;

    // Then, get family info using PatientIDNoAuto
    const result = await pool
      .request()
      .input("patientIdNoAuto", patientIdNoAuto)
      .query(`
        SELECT *
        FROM PatientFamilyInfo
        WHERE PatientIDNoAuto = @patientIdNoAuto
        ORDER BY CreationDate DESC
      `);

    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ADD family info
router.post("/", async (req, res) => {
  try {
    const pool = await poolPromise;

    // Get PatientIDNoAuto from Patient table using PatientID
    const patientResult = await pool
      .request()
      .input("patientId", req.body.PatientID)
      .query("SELECT PatientIDNoAuto FROM Patient WHERE PatientID = @patientId");

    if (patientResult.recordset.length === 0) {
      return res.status(404).json({ message: "Patient not found" });
    }

    const patientIdNoAuto = patientResult.recordset[0].PatientIDNoAuto;

    // Add PatientIDNoAuto to the request body
    req.body.PatientIDNoAuto = patientIdNoAuto;

    // Remove PatientID from the body as it's not needed in the table
    delete req.body.PatientID;

    // Use the generic controller to add
    await controller.add("PatientFamilyInfo", "PatientFamilyInfoId")(req, res);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// EDIT family info
router.put("/:id", async (req, res) => {
  try {
    const pool = await poolPromise;

    // Get PatientIDNoAuto from Patient table using PatientID
    const patientResult = await pool
      .request()
      .input("patientId", req.body.PatientID)
      .query("SELECT PatientIDNoAuto FROM Patient WHERE PatientID = @patientId");

    if (patientResult.recordset.length === 0) {
      return res.status(404).json({ message: "Patient not found" });
    }

    const patientIdNoAuto = patientResult.recordset[0].PatientIDNoAuto;

    // Add PatientIDNoAuto to the request body
    req.body.PatientIDNoAuto = patientIdNoAuto;

    // Remove PatientID from the body as it's not needed in the table
    delete req.body.PatientID;

    // Use the generic controller to edit
    await controller.edit("PatientFamilyInfo", "PatientFamilyInfoId")(req, res);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE family info
router.delete("/:id", controller.delete("PatientFamilyInfo", "PatientFamilyInfoId"));

module.exports = router;
