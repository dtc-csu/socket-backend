const express = require('express');
const router = express.Router();
const poolPromise = require('../db');
const generic = require('../Controllers/genericController')(poolPromise);

// CRUD for doctors table
// Get all doctors with joined user info and concatenated name
router.get('/', async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query(`
      SELECT 
        d.DoctorID,
        d.UserID,
        d.LicenseNumber,
        d.Specialty,
        d.Bio,
        d.CreationDate,
        u.FirstName,
        u.MiddleName,
        u.LastName,
        LTRIM(RTRIM(CONCAT(u.FirstName, ' ', ISNULL(u.MiddleName + ' ', ''), u.LastName))) AS FullName
      FROM Doctors d
      INNER JOIN Users u ON d.UserID = u.UserID
      ORDER BY d.DoctorID
    `);

    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({
      success: false,
      message: `GetAllDoctors Exception: ${err.message}`,
    });
  }
});

// Custom ADD to avoid invalid date conversions on CreationDate
router.post('/', async (req, res) => {
  try {
    const { UserID, LicenseNumber, Specialty, Bio } = req.body;

    if (!UserID || !LicenseNumber) {
      return res.status(400).json({
        success: false,
        message: 'AddDoctors failed: UserID and LicenseNumber are required',
      });
    }

    const pool = await poolPromise;
    const request = pool.request()
      .input('UserID', UserID)
      .input('LicenseNumber', LicenseNumber)
      .input('Specialty', Specialty ?? null)
      .input('Bio', Bio ?? null);

    const result = await request.query(`
      INSERT INTO Doctors (UserID, LicenseNumber, Specialty, Bio, CreationDate)
      VALUES (@UserID, @LicenseNumber, @Specialty, @Bio, GETDATE());
      SELECT * FROM Doctors WHERE DoctorID = SCOPE_IDENTITY();
    `);

    const newDoctor = result.recordset && result.recordset[0] ? result.recordset[0] : null;

    if (!newDoctor) {
      return res.status(500).json({
        success: false,
        message: 'AddDoctors Exception: Failed to retrieve newly created record',
      });
    }

    res.json({
      success: true,
      message: 'Doctors saved successfully',
      data: newDoctor,
    });
  } catch (err) {
    console.error('[Doctors ADD ERROR]', err.message, err.stack);
    res.status(500).json({
      success: false,
      message: `AddDoctors Exception: ${err.message}`,
    });
  }
});

router.put('/:id', generic.edit("Doctors", "DoctorID"));
router.delete('/:id', generic.delete("Doctors", "DoctorID"));

router.get('/user/:userId', async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('userId', req.params.userId)
      .query('SELECT * FROM Doctors WHERE UserID = @userId');

    res.json({ success: true, data: result.recordset[0] || null });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/by-role/:role', async (req, res) => {
  try {
    const pool = await poolPromise;
    const { role } = req.params;

    const result = await pool.request()
      .input('role', role)
      .query(`
        SELECT 
          d.DoctorID,
          d.specialty,
          u.UserID,
          u.FirstName,
          u.MiddleName,
          u.LastName
        FROM Doctors d
        INNER JOIN Users u ON d.UserID = u.UserID
        WHERE u.role = @role
      `);

    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

module.exports = router;
