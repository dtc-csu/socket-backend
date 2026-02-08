const express = require('express');
const router = express.Router();
const poolPromise = require('../db');
const generic = require('../Controllers/genericController')(poolPromise);
const bcrypt = require('bcrypt');

// Controllers
const forgotController = require('../Controllers/forgotController');

// ----------------------------------------------------
// GENERIC CRUD ROUTES
// ----------------------------------------------------
router.get('/', generic.getAll("Users", "userid"));

// Custom add with validation and password hashing
router.post('/', async (req, res) => {
  try {
    const { FirstName, LastName, Username, Password, Role, Email, MiddleName, PhoneNumber, Disabled, CreationDate, ModificationDate, EndDate } = req.body;

    // Validation
    if (!FirstName || !LastName || !Username || !Password || !Role || !Email) {
      return res.status(400).json({ error: 'FirstName, LastName, Username, Password, Role, and Email are required' });
    }
    if (Username.length > 20) {
      return res.status(400).json({ error: 'Username must be 20 characters or less' });
    }
    if (Email.length > 30) {
      return res.status(400).json({ error: 'Email must be 30 characters or less' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(Password, 10);

    const newUser = {
      FirstName,
      LastName,
      Username,
      Password: hashedPassword,
      Role,
      Email,
      MiddleName: MiddleName || null,
      PhoneNumber: PhoneNumber || null,
      Disabled: Disabled !== undefined ? Disabled : null,
      CreationDate: CreationDate || null,
      ModificationDate: ModificationDate || null,
      EndDate: EndDate || null
    };

    // Use generic add with modified body
    req.body = newUser;
    generic.add("Users", "userid")(req, res);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Custom edit with validation and password hashing
router.put('/:id', async (req, res) => {
  try {
    const { FirstName, LastName, Username, Password, Role, Email, MiddleName, PhoneNumber, Disabled, CreationDate, ModificationDate, EndDate } = req.body;

    // Validation for provided fields
    if (FirstName !== undefined && !FirstName) {
      return res.status(400).json({ error: 'FirstName cannot be empty if provided' });
    }
    if (LastName !== undefined && !LastName) {
      return res.status(400).json({ error: 'LastName cannot be empty if provided' });
    }
    if (Username !== undefined && (Username.length > 20 || !Username)) {
      return res.status(400).json({ error: 'Username must be 20 characters or less and not empty if provided' });
    }
    if (Role !== undefined && !Role) {
      return res.status(400).json({ error: 'Role cannot be empty if provided' });
    }
    if (Email !== undefined && (Email.length > 30 || !Email)) {
      return res.status(400).json({ error: 'Email must be 30 characters or less and not empty if provided' });
    }

    // Hash password if provided
    if (Password) {
      req.body.Password = await bcrypt.hash(Password, 10);
    }

    generic.edit("Users", "userid")(req, res);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', generic.delete("Users", "userid"));

// ----------------------------------------------------
// FORGOT PASSWORD (Send Email Link)
// ----------------------------------------------------
router.post('/forgot-password', forgotController.forgotPassword);

// ----------------------------------------------------
// SEND SMS OTP
// ----------------------------------------------------
router.post('/send-sms-otp', forgotController.sendSmsOtp);

// ----------------------------------------------------
// RESET PASSWORD (Flutter App)
// ----------------------------------------------------
router.post('/reset-password', forgotController.resetPassword);

// ----------------------------------------------------
// VERIFY OTP (Email)
// ----------------------------------------------------
router.post('/verify-otp', forgotController.verifyOtp);

// ----------------------------------------------------
// VERIFY SMS OTP
// ----------------------------------------------------
router.post('/verify-sms-otp', forgotController.verifySmsOtp);

// ----------------------------------------------------
// LOGIN ROUTE
// ----------------------------------------------------
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    const pool = await poolPromise;

    const result = await pool.request()
      .input('username', username)
      .query(`
        SELECT * FROM Users
        WHERE username = @username
      `);

    if (result.recordset.length > 0) {
      const user = result.recordset[0];

      // Compare hashed password
      const isPasswordValid = await bcrypt.compare(password, user.password);

      if (isPasswordValid) {
        return res.json({
          success: true,
          message: 'Login successful',
          user: user
        });
      }
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
      .query(`
        SELECT * FROM Users WHERE userid = @userId
      `);

    if (result.recordset.length === 0) {
      return res.json({ success: false, message: "User not found" });
    }

    const user = result.recordset[0];
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);

    if (!isCurrentPasswordValid) {
      return res.json({ success: false, message: "Current password is incorrect" });
    }

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await pool.request()
      .input('userId', userId)
      .input('newPassword', hashedNewPassword)
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

    // Get user
    const userResult = await pool.request()
      .input('userId', userId)
      .query('SELECT * FROM Users WHERE userid = @userId');

    if (userResult.recordset.length === 0) {
      return res.json({ success: false, message: "User not found" });
    }

    const user = userResult.recordset[0];
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);

    if (!isCurrentPasswordValid) {
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

// ---------------------- GET PATIENT ID NO AUTO FROM USER ID ----------------------
router.get('/patient-id-no-auto/:userId', async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('userId', req.params.userId)
      .query('SELECT PatientIDNoAuto FROM Patient WHERE UserID = @userId');

    if (result.recordset.length > 0) {
      res.json({ PatientIDNoAuto: result.recordset[0].PatientIDNoAuto });
    } else {
      res.status(404).json({ error: 'Patient not found' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------- GET ALL PATIENTS ----------------------
// ---------------------- GET ALL PATIENTS ----------------------
router.get('/patients', async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .query(`
        SELECT pat.PatientID, u.UserID, u.FirstName, u.MiddleName, u.LastName
        FROM Patient pat
        INNER JOIN Users u ON u.UserID = pat.UserID
        ORDER BY u.FirstName
      `);
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
