const express = require("express");
const router = express.Router();
const poolPromise = require("../db");

// GET all contact persons by UserID
router.get("/Users/:id", async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input("userId", req.params.id)
      .query(`
        SELECT *
        FROM ContactPerson
        WHERE UserID = @userId
        ORDER BY CreationDate DESC
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: "ContactPerson record not found for this user"
      });
    }

    res.json({
      success: true,
      message: "ContactPerson records fetched successfully",
      data: result.recordset
    });
  } catch (err) {
    res.status(500).json({ success: false, message: `GetContactPerson Exception: ${err.message}` });
  }
});

// ADD
router.post("/", async (req, res) => {
  const {
    UserID,
    ContactPersonName,
    ContactPersonRelationship,
    ContactPersonOccupation,
    ContactPersonContactNo,
    ContactPersonAddress
  } = req.body;

  if (!UserID || !ContactPersonName || !ContactPersonRelationship || !ContactPersonContactNo || !ContactPersonAddress) {
    return res.status(400).json({
      success: false,
      message: "AddContactPerson failed: required fields are missing"
    });
  }

  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input("UserID", UserID)
      .input("ContactPersonName", ContactPersonName)
      .input("ContactPersonRelationship", ContactPersonRelationship)
      .input("ContactPersonOccupation", ContactPersonOccupation || null)
      .input("ContactPersonContactNo", ContactPersonContactNo)
      .input("ContactPersonAddress", ContactPersonAddress)
      .query(`
        INSERT INTO ContactPerson
          (UserID, ContactPersonName, ContactPersonRelationship, ContactPersonOccupation, ContactPersonContactNo, ContactPersonAddress, CreationDate)
        VALUES
          (@UserID, @ContactPersonName, @ContactPersonRelationship, @ContactPersonOccupation, @ContactPersonContactNo, @ContactPersonAddress, GETDATE());

        SELECT *
        FROM ContactPerson
        WHERE ContactsID = SCOPE_IDENTITY();
      `);

    res.json({
      success: true,
      message: "ContactPerson saved successfully",
      data: result.recordset[0]
    });
  } catch (err) {
    res.status(500).json({ success: false, message: `AddContactPerson Exception: ${err.message}` });
  }
});

// EDIT
router.put("/:id", async (req, res) => {
  const id = req.params.id;
  const {
    ContactPersonName,
    ContactPersonRelationship,
    ContactPersonOccupation,
    ContactPersonContactNo,
    ContactPersonAddress
  } = req.body;

  try {
    const pool = await poolPromise;
    const updateResult = await pool.request()
      .input("id", id)
      .input("ContactPersonName", ContactPersonName || null)
      .input("ContactPersonRelationship", ContactPersonRelationship || null)
      .input("ContactPersonOccupation", ContactPersonOccupation || null)
      .input("ContactPersonContactNo", ContactPersonContactNo || null)
      .input("ContactPersonAddress", ContactPersonAddress || null)
      .query(`
        UPDATE ContactPerson
        SET
          ContactPersonName = COALESCE(@ContactPersonName, ContactPersonName),
          ContactPersonRelationship = COALESCE(@ContactPersonRelationship, ContactPersonRelationship),
          ContactPersonOccupation = COALESCE(@ContactPersonOccupation, ContactPersonOccupation),
          ContactPersonContactNo = COALESCE(@ContactPersonContactNo, ContactPersonContactNo),
          ContactPersonAddress = COALESCE(@ContactPersonAddress, ContactPersonAddress)
        WHERE ContactsID = @id;
      `);

    if (!updateResult.rowsAffected || updateResult.rowsAffected[0] === 0) {
      return res.status(404).json({
        success: false,
        message: "ContactPerson record not found"
      });
    }

    const result = await pool.request()
      .input("id", id)
      .query(`SELECT * FROM ContactPerson WHERE ContactsID = @id`);

    res.json({
      success: true,
      message: "ContactPerson updated successfully",
      data: result.recordset[0]
    });
  } catch (err) {
    res.status(500).json({ success: false, message: `UpdateContactPerson Exception: ${err.message}` });
  }
});

// DELETE
router.delete("/:id", async (req, res) => {
  const id = req.params.id;

  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input("id", id)
      .query(`DELETE FROM ContactPerson WHERE ContactsID = @id`);

    if (!result.rowsAffected || result.rowsAffected[0] === 0) {
      return res.status(404).json({
        success: false,
        message: "ContactPerson record not found"
      });
    }

    res.json({
      success: true,
      message: "ContactPerson deleted successfully"
    });
  } catch (err) {
    res.status(500).json({ success: false, message: `DeleteContactPerson Exception: ${err.message}` });
  }
});

module.exports = router;
