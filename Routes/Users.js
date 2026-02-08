const express = require('express');
const router = express.Router();
const poolPromise = require('../db');
const generic = require('../Controllers/genericController')(poolPromise);
const crypto = require('crypto');

// Controllers
const forgotController = require('../Controllers/forgotController');

// ----------------------------------------------------
// SHA256 BASE64 PASSWORD (MATCHES C#)
// ----------------------------------------------------
function hashPassword(password) {
  return crypto
    .createHash('sha256')
    .update(password, 'utf8')
    .digest('base64');
}

function verifyPassword(inputPassword, storedHash) {
  return hashPassword(inputPassword) === storedHash;
}

// ----------------------------------------------------
// GENERIC CRUD ROUTES
// ----------------------------------------------------
router.get('/', generic.getAll("Users", "userid"));

// ----------------------------------------------------
// CREATE USER (HASH PASSWORD LIKE C#)
// ----------------------------------------------------
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

    // Hash password like C#
    const hashedPassword = hashPassword(Password);

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

    req.body = newUser;
    generic.add("Users", "userid")(req, res);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// UPDATE USER (HASH PASSWORD IF PROVIDED)
// ----------------------------------------------------
router.put('/:id', async (req, res) => {
  try {
    const { FirstName, LastName, Username, Password, Role, Email } = req.body;

    if (FirstName !== undefined && !FirstName)
      return res.status(400).json({ error: 'FirstName cannot be empty' });

    if (LastName !== undefined && !LastName)
      return res.status(400).json({ error: 'LastName cannot be empty' });

    if (Username !== undefined && (Username.length > 20 || !Username))
      return res.status(400).json({ error: 'Username invalid' });

    if (Role !== undefined && !Role)
      return res.status(400).json({ error: 'Role invalid' });

    if (Email !== undefined && (Email.length > 30 || !Email))
      return res.status(400).json({ error: 'Email invalid' });

    // Hash password if updating
    if (Password) {
      req.body.Password = hashPassword(Password);
    }

    generic.edit("Users", "userid")(req, res);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', generic.delete("Users", "userid"));

// ----------------------------------------------------
// FORGOT PASSWORD / OTP ROUTES
// ----------------------------------------------------
router.post('/forgot-password', forgotController.forgotPassword);
router.post('/send-sms-otp', forgotController.sendSmsOtp);
router.post('/reset-password', forgotController.resetPassword);
router.post('/verify-otp', forgotController.verifyOtp);
router.post('/verify-sms-otp', forgotController.verifySmsOtp);

// ----------------------------------------------------
// LOGIN ROUTE (MATCH C# HASH VERIFY)
// ----------------------------------------------------
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    const pool = await poolPromise;

    const result = await pool.request()
      .input('username', username)
      .query(`
        SELECT * FROM Users
        WHERE Username = @username
      `);

    if (result.recordset.length === 0) {
      return res.json({ success: false, message: 'Invalid username or password' });
    }

    const user = result.recordset[0];

    const isPasswordValid = verifyPassword(password, user.Password);

    if (!isPasswordValid) {
      return res.json({ success: false, message: 'Invalid username or password' });
    }

    return res.json({
      success: true,
      message: 'Login successful',
      user
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Server error: ' + err.message
    });
  }
});

// ----------------------------------------------------
// CHANGE PASSWORD (MATCH C#)
// ----------------------------------------------------
router.post('/change-password', async (req, res) => {
  const { userId, currentPassword, newPassword } = req.body;

  try {
    const pool = await poolPromise;

    const result = await pool.request()
      .input('userId', userId)
      .query(`SELECT * FROM Users WHERE userid = @userId`);

    if (result.recordset.length === 0) {
      return res.json({ success: false, message: "User not found" });
    }

    const user = result.recordset[0];

    const isCurrentPasswordValid = verifyPassword(currentPassword, user.Password);

    if (!isCurrentPasswordValid) {
      return res.json({ success: false, message: "Current password is incorrect" });
    }

    const hashedNewPassword = hashPassword(newPassword);

    await pool.request()
      .input('userId', userId)
      .input('newPassword', hashedNewPassword)
      .query(`UPDATE Users SET Password = @newPassword WHERE userid = @userId`);

    res.json({ success: true, message: "Password updated successfully" });

  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ----------------------------------------------------
// CHANGE EMAIL (VERIFY PASSWORD LIKE C#)
// ----------------------------------------------------
router.post('/change-email', async (req, res) => {
  const { userId, currentPassword, newEmail } = req.body;

  try {
    const pool = await poolPromise;

    const userResult = await pool.request()
      .input('userId', userId)
      .query('SELECT * FROM Users WHERE userid = @userId');

    if (userResult.recordset.length === 0) {
      return res.json({ success: false, message: "User not found" });
    }

    const user = userResult.recordset[0];

    const isCurrentPasswordValid = verifyPassword(currentPassword, user.Password);

    if (!isCurrentPasswordValid) {
      return res.json({ success: false, message: "Current password is incorrect" });
    }

    await pool.request()
      .input('userId', userId)
      .input('newEmail', newEmail)
      .query('UPDATE Users SET Email = @newEmail WHERE userid = @userId');

    res.json({ success: true, message: "Email updated successfully" });

  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ----------------------------------------------------
// GET PATIENT ID FROM USER ID
// ----------------------------------------------------
router.get('/patient-id-no-auto/:userId', async (req, res) => {
  try {
    const pool = await poolPromise;

    const result = await pool.request()
      .input('userId', req.params.userId)
      .query('SELECT PatientID FROM Patient WHERE UserID = @userId');

    if (result.recordset.length > 0) {
      res.json({ PatientIDNoAuto: result.recordset[0].PatientIDNoAuto });
    } else {
      res.status(404).json({ error: 'Patient not found' });
    }

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// GET ALL PATIENTS
// ----------------------------------------------------
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