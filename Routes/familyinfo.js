const express = require("express");
const router = express.Router();
const poolPromise = require("../db");

// ============================================================
// READ - GET ALL FAMILY INFO
// ============================================================
router.get("/", async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query(`
      SELECT *
      FROM FamilyInfo
      ORDER BY CreationDate DESC
    `);

    res.json({
      success: true,
      message: "FamilyInfo records fetched successfully",
      data: result.recordset
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: `GetAllFamilyInfo Exception: ${err.message}`
    });
  }
});

// ============================================================
// READ - GET FAMILY INFO BY PATIENTID (Primary lookup)
// ============================================================
router.get("/patient/:patientId", async (req, res) => {
  const patientId = req.params.patientId;

  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input("patientId", patientId)
      .query(`
        SELECT *
        FROM FamilyInfo
        WHERE PatientID = @patientId
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: "FamilyInfo not found for this patient"
      });
    }

    res.json({
      success: true,
      message: "FamilyInfo retrieved successfully",
      data: result.recordset[0]
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: `GetFamilyInfoByPatientID Exception: ${err.message}`
    });
  }
});

// ============================================================
// READ - GET FAMILY INFO BY ID
// ============================================================
router.get("/:id", async (req, res) => {
  const familyInfoId = req.params.id;

  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input("id", familyInfoId)
      .query(`
        SELECT *
        FROM FamilyInfo
        WHERE FamilyInfoID = @id
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: "FamilyInfo record not found"
      });
    }

    res.json({
      success: true,
      message: "FamilyInfo retrieved successfully",
      data: result.recordset[0]
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: `GetFamilyInfoByID Exception: ${err.message}`
    });
  }
});

// ============================================================
// CREATE - ADD FAMILY INFO BY PATIENTID (Prevent duplicates)
// ============================================================
router.post("/", async (req, res) => {
  const {
    PatientID,
    SpouseName,
    SpouseOccupation,
    SpouseDateOfBirth,
    SpouseAge,
    SpouseContact,
    SpouseAddress,
    FatherFullName,
    FatherBirthDate,
    FatherAge,
    FatherContact,
    FatherAddress,
    FatherOccupation,
    MotherFullName,
    MotherBirthDate,
    MotherAge,
    MotherContact,
    MotherAddress,
    MotherOccupation,
    GeneticDiseases
  } = req.body;

  // Validate required field
  if (!PatientID) {
    return res.status(400).json({
      success: false,
      message: "AddFamilyInfo failed: PatientID is required"
    });
  }

  try {
    const pool = await poolPromise;

    // Prevent duplicate: check if FamilyInfo already exists for this patient
    const existingCheck = await pool.request()
      .input("patientId", PatientID)
      .query(`
        SELECT FamilyInfoID
        FROM FamilyInfo
        WHERE PatientID = @patientId
      `);

    if (existingCheck.recordset.length > 0) {
      return res.status(409).json({
        success: false,
        message: "AddFamilyInfo failed: FamilyInfo already exists for this patient"
      });
    }

    // Insert new FamilyInfo
    const result = await pool.request()
      .input("PatientID", PatientID)
      .input("SpouseName", SpouseName?.trim() || null)
      .input("SpouseOccupation", SpouseOccupation?.trim() || null)
      .input("SpouseDateOfBirth", SpouseDateOfBirth || null)
      .input("SpouseAge", SpouseAge || null)
      .input("SpouseContact", SpouseContact?.trim() || null)
      .input("SpouseAddress", SpouseAddress?.trim() || null)
      .input("FatherFullName", FatherFullName?.trim() || null)
      .input("FatherBirthDate", FatherBirthDate || null)
      .input("FatherAge", FatherAge || null)
      .input("FatherContact", FatherContact?.trim() || null)
      .input("FatherAddress", FatherAddress?.trim() || null)
      .input("FatherOccupation", FatherOccupation?.trim() || null)
      .input("MotherFullName", MotherFullName?.trim() || null)
      .input("MotherBirthDate", MotherBirthDate || null)
      .input("MotherAge", MotherAge || null)
      .input("MotherContact", MotherContact?.trim() || null)
      .input("MotherAddress", MotherAddress?.trim() || null)
      .input("MotherOccupation", MotherOccupation?.trim() || null)
      .input("GeneticDiseases", GeneticDiseases?.trim() || null)
      .query(`
        INSERT INTO FamilyInfo
          (PatientID, SpouseName, SpouseOccupation, SpouseDateOfBirth, SpouseAge, SpouseContact, SpouseAddress,
           FatherFullName, FatherBirthDate, FatherAge, FatherContact, FatherAddress, FatherOccupation,
           MotherFullName, MotherBirthDate, MotherAge, MotherContact, MotherAddress, MotherOccupation,
           GeneticDiseases, CreationDate)
        VALUES
          (@PatientID, @SpouseName, @SpouseOccupation, @SpouseDateOfBirth, @SpouseAge, @SpouseContact, @SpouseAddress,
           @FatherFullName, @FatherBirthDate, @FatherAge, @FatherContact, @FatherAddress, @FatherOccupation,
           @MotherFullName, @MotherBirthDate, @MotherAge, @MotherContact, @MotherAddress, @MotherOccupation,
           @GeneticDiseases, GETDATE());

        SELECT *
        FROM FamilyInfo
        WHERE FamilyInfoID = SCOPE_IDENTITY();
      `);

    res.json({
      success: true,
      message: "FamilyInfo saved successfully",
      data: result.recordset[0]
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: `AddFamilyInfo Exception: ${err.message}`
    });
  }
});

// ============================================================
// UPDATE - UPDATE FAMILY INFO BY ID
// ============================================================
router.put("/:id", async (req, res) => {
  const familyInfoId = req.params.id;
  const {
    SpouseName,
    SpouseOccupation,
    SpouseDateOfBirth,
    SpouseAge,
    SpouseContact,
    SpouseAddress,
    FatherFullName,
    FatherBirthDate,
    FatherAge,
    FatherContact,
    FatherAddress,
    FatherOccupation,
    MotherFullName,
    MotherBirthDate,
    MotherAge,
    MotherContact,
    MotherAddress,
    MotherOccupation,
    GeneticDiseases
  } = req.body;

  try {
    const pool = await poolPromise;

    // Verify record exists
    const checkResult = await pool.request()
      .input("id", familyInfoId)
      .query(`
        SELECT FamilyInfoID
        FROM FamilyInfo
        WHERE FamilyInfoID = @id
      `);

    if (checkResult.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: "FamilyInfo record not found"
      });
    }

    // Update record
    await pool.request()
      .input("id", familyInfoId)
      .input("SpouseName", SpouseName?.trim() || null)
      .input("SpouseOccupation", SpouseOccupation?.trim() || null)
      .input("SpouseDateOfBirth", SpouseDateOfBirth || null)
      .input("SpouseAge", SpouseAge || null)
      .input("SpouseContact", SpouseContact?.trim() || null)
      .input("SpouseAddress", SpouseAddress?.trim() || null)
      .input("FatherFullName", FatherFullName?.trim() || null)
      .input("FatherBirthDate", FatherBirthDate || null)
      .input("FatherAge", FatherAge || null)
      .input("FatherContact", FatherContact?.trim() || null)
      .input("FatherAddress", FatherAddress?.trim() || null)
      .input("FatherOccupation", FatherOccupation?.trim() || null)
      .input("MotherFullName", MotherFullName?.trim() || null)
      .input("MotherBirthDate", MotherBirthDate || null)
      .input("MotherAge", MotherAge || null)
      .input("MotherContact", MotherContact?.trim() || null)
      .input("MotherAddress", MotherAddress?.trim() || null)
      .input("MotherOccupation", MotherOccupation?.trim() || null)
      .input("GeneticDiseases", GeneticDiseases?.trim() || null)
      .query(`
        UPDATE FamilyInfo
        SET
          SpouseName = COALESCE(@SpouseName, SpouseName),
          SpouseOccupation = COALESCE(@SpouseOccupation, SpouseOccupation),
          SpouseDateOfBirth = COALESCE(@SpouseDateOfBirth, SpouseDateOfBirth),
          SpouseAge = COALESCE(@SpouseAge, SpouseAge),
          SpouseContact = COALESCE(@SpouseContact, SpouseContact),
          SpouseAddress = COALESCE(@SpouseAddress, SpouseAddress),
          FatherFullName = COALESCE(@FatherFullName, FatherFullName),
          FatherBirthDate = COALESCE(@FatherBirthDate, FatherBirthDate),
          FatherAge = COALESCE(@FatherAge, FatherAge),
          FatherContact = COALESCE(@FatherContact, FatherContact),
          FatherAddress = COALESCE(@FatherAddress, FatherAddress),
          FatherOccupation = COALESCE(@FatherOccupation, FatherOccupation),
          MotherFullName = COALESCE(@MotherFullName, MotherFullName),
          MotherBirthDate = COALESCE(@MotherBirthDate, MotherBirthDate),
          MotherAge = COALESCE(@MotherAge, MotherAge),
          MotherContact = COALESCE(@MotherContact, MotherContact),
          MotherAddress = COALESCE(@MotherAddress, MotherAddress),
          MotherOccupation = COALESCE(@MotherOccupation, MotherOccupation),
          GeneticDiseases = COALESCE(@GeneticDiseases, GeneticDiseases)
        WHERE FamilyInfoID = @id
      `);

    // Return updated record
    const updatedResult = await pool.request()
      .input("id", familyInfoId)
      .query(`
        SELECT *
        FROM FamilyInfo
        WHERE FamilyInfoID = @id
      `);

    res.json({
      success: true,
      message: "FamilyInfo updated successfully",
      data: updatedResult.recordset[0]
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: `UpdateFamilyInfo Exception: ${err.message}`
    });
  }
});

// ============================================================
// DELETE - DELETE FAMILY INFO BY ID
// ============================================================
router.delete("/:id", async (req, res) => {
  const familyInfoId = req.params.id;

  try {
    const pool = await poolPromise;

    // Verify record exists
    const checkResult = await pool.request()
      .input("id", familyInfoId)
      .query(`
        SELECT FamilyInfoID
        FROM FamilyInfo
        WHERE FamilyInfoID = @id
      `);

    if (checkResult.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: "FamilyInfo record not found"
      });
    }

    // Delete record
    await pool.request()
      .input("id", familyInfoId)
      .query(`
        DELETE FROM FamilyInfo
        WHERE FamilyInfoID = @id
      `);

    res.json({
      success: true,
      message: "FamilyInfo deleted successfully"
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: `DeleteFamilyInfo Exception: ${err.message}`
    });
  }
});

module.exports = router;
