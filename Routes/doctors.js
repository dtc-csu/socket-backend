const express = require('express');
const router = express.Router();
const poolPromise = require('../db');
const generic = require('../Controllers/genericController')(poolPromise);

// CRUD for doctors table
router.get('/', generic.getAll("Doctors", "DoctorID"));
router.post('/', generic.add("Doctors", "DoctorID"));
router.put('/:id', generic.edit("Doctors", "DoctorID"));
router.delete('/:id', generic.delete("Doctors", "DoctorID"));

router.get('/user/:userId', async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('userId', req.params.userId)
      .query('SELECT * FROM Doctors WHERE UserID = @userId');

    res.json(result.recordset[0] || null);
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
          u.userid,
          u.firstname,
          u.middlename,
          u.lastname
        FROM Doctors d
        INNER JOIN Users u ON d.UserID = u.userid
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
