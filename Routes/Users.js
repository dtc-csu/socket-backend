const express = require('express');
const router = express.Router();
const poolPromise = require('../db');
const generic = require('../Controllers/genericController')(poolPromise);

// Controllers
const forgotController = require('../Controllers/forgotController');

// ----------------------------------------------------
// GENERIC CRUD ROUTES
// ----------------------------------------------------
router.get('/', generic.getAll("Users", "userid"));
router.post('/', generic.add("Users", "userid"));
router.put('/:id', generic.edit("Users", "userid"));
router.delete('/:id', generic.delete("Users", "userid"));

// ----------------------------------------------------
// FORGOT PASSWORD (Send Email Link)
// ----------------------------------------------------
router.post('/forgot-password', forgotController.forgotPassword);

// ----------------------------------------------------
// RESET PASSWORD (Flutter App)
// ----------------------------------------------------
router.post('/reset-password', forgotController.resetPassword);
// ADD THIS:
router.post('/verify-otp', forgotController.verifyOtp);

// ----------------------------------------------------
// LOGIN ROUTE
// ----------------------------------------------------
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    const pool = await poolPromise;

    const result = await pool.request()
      .input('username', username)
      .input('password', password)
      .query(`
        SELECT * FROM Users
        WHERE username = @username AND password = @password
      `);

    if (result.recordset.length > 0) {
      const user = result.recordset[0];

      return res.json({
        success: true,
        message: 'Login successful',
        user: user
      });
    }

    // LOGIN FAILED
    return res.json({
      success: false,
      message: 'Invalid username or password'
    });

  } catch (err) {
    // SERVER ERROR
    return res.status(500).json({
      success: false,
      message: 'Server error: ' + err.message
    });
  }
});

router.post('/change-password', async (req, res) => {
  const { userId, currentPassword, newPassword } = req.body;
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('userId', userId)
      .input('currentPassword', currentPassword)
      .query(`
        SELECT * FROM Users WHERE userid = @userId AND password = @currentPassword
      `);

    if (result.recordset.length === 0) {
      return res.json({ success: false, message: "Current password is incorrect" });
    }

    // Update password
    await pool.request()
      .input('userId', userId)
      .input('newPassword', newPassword)
      .query(`
        UPDATE Users SET password = @newPassword WHERE userid = @userId
      `);

    res.json({ success: true, message: "Password updated successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/change-email', async (req, res) => {
  const { userId, currentPassword, newEmail } = req.body;

  try {
    const pool = await poolPromise;

    // Check current password
    const user = await pool.request()
      .input('userId', userId)
      .input('currentPassword', currentPassword)
      .query('SELECT * FROM Users WHERE userid = @userId AND password = @currentPassword');

    if (user.recordset.length === 0) {
      return res.json({ success: false, message: "Current password is incorrect" });
    }

    // Update email
    await pool.request()
      .input('userId', userId)
      .input('newEmail', newEmail)
      .query('UPDATE Users SET email = @newEmail WHERE userid = @userId');

    res.json({ success: true, message: "Email updated successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
