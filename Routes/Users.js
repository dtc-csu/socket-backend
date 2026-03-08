const express = require('express');
const router = express.Router();
const poolPromise = require('../db');
const generic = require('../Controllers/genericController')(poolPromise);
const { upsertUsers } = require('./streamService');
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

// ============================================================
// SPECIFIC ROUTES (MUST COME BEFORE GENERIC /:id ROUTES)
// ============================================================

// ---------------------- GET USER BY ID (BY USERID) ----------------------
router.get('/:id', async (req, res) => {
  const userId = req.params.id;
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('userId', userId)
      .query(`
        SELECT * FROM Users
        WHERE userid = @userId
      `);
    
    if (result.recordset.length === 0) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    
    res.json({ success: true, data: result.recordset[0] });
  } catch (err) {
    console.error("Error fetching user:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ---------------------- GET USERS BY ROLE ----------------------
router.get('/role/:role', async (req, res) => {
  const role = req.params.role;
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('role', role)
      .query(`
        SELECT * FROM Users
        WHERE Role = @role
        ORDER BY FirstName, LastName
      `);
    
    res.json(result.recordset);
  } catch (err) {
    console.error("Error fetching users by role:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ---------------------- CHECK IF USERNAME EXISTS ----------------------
router.get('/exists/username', async (req, res) => {
  const { username, excludeId } = req.query;
  
  if (!username) {
    return res.status(400).json({ success: false, message: "Username query parameter is required" });
  }
  
  try {
    const pool = await poolPromise;
    let query = `SELECT COUNT(*) as count FROM Users WHERE Username = @username`;
    let request = pool.request().input('username', username);
    
    // Exclude a specific user (useful when checking updates)
    if (excludeId) {
      query += ` AND userid != @excludeId`;
      request = request.input('excludeId', excludeId);
    }
    
    const result = await request.query(query);
    const exists = result.recordset[0].count > 0;
    
    res.json({ success: true, exists, username, message: exists ? "Username is already taken" : "Username is available" });
  } catch (err) {
    console.error("Error checking username:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ---------------------- GET ARCHIVED USERS (SOFT DELETED) ----------------------
router.get('/archived/list', async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query(`
      SELECT * FROM Users
      WHERE Disabled = 1 AND EndDate IS NOT NULL
      ORDER BY EndDate DESC
    `);
    
    res.json(result.recordset);
  } catch (err) {
    console.error("Error fetching archived users:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ============================================================
// GENERIC CRUD ROUTES (AFTER SPECIFIC ROUTES)
// ============================================================
// GET ALL ACTIVE USERS (Disabled = 0, EndDate IS NULL)
router.get('/', async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .query(`
        SELECT * FROM Users
        WHERE Disabled = 0 AND EndDate IS NULL
        ORDER BY FirstName, LastName
      `);

    // Best-effort: upsert these users into GetStream so channels won't fail
    try {
      const usersToUpsert = (result.recordset || []).map(u => ({
        id: (u.UserID || u.userid).toString(),
        name: `${u.FirstName || u.firstname || ''} ${u.LastName || u.lastname || ''}`.trim(),
      }));
      // Fire-and-forget: don't block API response on Stream upsert
      upsertUsers(usersToUpsert)
        .then(() => console.log(`Upserted ${usersToUpsert.length} Stream users`))
        .catch(err => console.error('Stream upsert (users) failed:', err && err.message ? err.message : err));
    } catch (e) {
      console.error('Stream upsert (prepare) failed:', e && e.message ? e.message : e);
    }

    res.json(result.recordset);
  } catch (err) {
    console.error("Error fetching active users:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ----------------------------------------------------
// CREATE USER (HASH PASSWORD LIKE C#)
// ----------------------------------------------------
router.post('/', async (req, res) => {
  try {
    const { FirstName, LastName, Username, Password, Role, Email, MiddleName, PhoneNumber, Disabled, CreationDate, ModificationDate, EndDate } = req.body;

    // Validation
    if (!FirstName || !LastName || !Username || !Password || !Role || !Email) {
      return res.status(400).json({ 
        success: false, 
        message: 'FirstName, LastName, Username, Password, Role, and Email are required' 
      });
    }

    if (Username.length > 20) {
      return res.status(400).json({ 
        success: false, 
        message: 'Username must be 20 characters or less' 
      });
    }

    if (Username.length < 3) {
      return res.status(400).json({ 
        success: false, 
        message: 'Username must be at least 3 characters' 
      });
    }

    if (Email.length > 30) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email must be 30 characters or less' 
      });
    }

    if (Password.length < 6) {
      return res.status(400).json({ 
        success: false, 
        message: 'Password must be at least 6 characters' 
      });
    }

    // Check if username already exists
    const pool = await poolPromise;
    const checkUsername = await pool.request()
      .input('username', Username)
      .query(`SELECT COUNT(*) as count FROM Users WHERE Username = @username`);
    
    if (checkUsername.recordset[0].count > 0) {
      return res.status(409).json({ 
        success: false, 
        message: 'Username already exists' 
      });
    }

    // Check if email already exists
    const checkEmail = await pool.request()
      .input('email', Email)
      .query(`SELECT COUNT(*) as count FROM Users WHERE Email = @email`);
    
    if (checkEmail.recordset[0].count > 0) {
      return res.status(409).json({ 
        success: false, 
        message: 'Email already exists' 
      });
    }

    // Hash password like C#
    const hashedPassword = hashPassword(Password);

    /* DO NOT include userid - it's auto-generated by the database */
    /* DO NOT include CreationDate/ModificationDate - use GETDATE()/NOW() in SQL */
    const newUser = {
      FirstName,
      LastName,
      Username,
      Password: hashedPassword,
      Role,
      Email,
      MiddleName: MiddleName || null,
      PhoneNumber: PhoneNumber || null,
      Disabled: Disabled !== undefined ? Disabled : 0,
      EndDate: EndDate || null
    };

    // Insert user directly to handle better error reporting
    try {
      const pool = await poolPromise;
      const request = pool.request();
      
      request.input('FirstName', newUser.FirstName);
      request.input('LastName', newUser.LastName);
      request.input('Username', newUser.Username);
      request.input('Password', newUser.Password);
      request.input('Role', newUser.Role);
      request.input('Email', newUser.Email);
      request.input('MiddleName', newUser.MiddleName);
      request.input('PhoneNumber', newUser.PhoneNumber);
      request.input('Disabled', newUser.Disabled);
      request.input('EndDate', newUser.EndDate);

      const insertQuery = `
        INSERT INTO Users (FirstName, LastName, Username, Password, Role, Email, MiddleName, PhoneNumber, Disabled, CreationDate, ModificationDate, EndDate)
        VALUES (@FirstName, @LastName, @Username, @Password, @Role, @Email, @MiddleName, @PhoneNumber, @Disabled, GETDATE(), GETDATE(), @EndDate)
      `;
      
      await request.query(insertQuery);
      
      // Fetch the newly created user by username
      const fetchRequest = pool.request();
      fetchRequest.input('username', newUser.Username);
      const result = await fetchRequest.query(`SELECT * FROM Users WHERE Username = @username`);
      
      if (!result.recordset || result.recordset.length === 0) {
        return res.status(500).json({ 
          success: false, 
          message: 'User created but could not be retrieved' 
        });
      }
      
      res.status(201).json({ 
        success: true, 
        message: 'User created successfully',
        data: result.recordset[0]
      });
    } catch (insertErr) {
      console.error("[USER CREATE ERROR]", insertErr);
      res.status(500).json({ 
        success: false, 
        message: insertErr.message 
      });
    }

  } catch (err) {
    console.error("[USER VALIDATION ERROR]", err);
    res.status(500).json({ 
      success: false, 
      message: err.message 
    });
  }
});

// ----------------------------------------------------
// UPDATE USER (HASH PASSWORD IF PROVIDED)
// ----------------------------------------------------
router.put('/:id', async (req, res) => {
  try {
    const { FirstName, LastName, Username, Password, Role, Email } = req.body;

    if (FirstName !== undefined && !FirstName)
      return res.status(400).json({ success: false, message: 'FirstName cannot be empty' });

    if (LastName !== undefined && !LastName)
      return res.status(400).json({ success: false, message: 'LastName cannot be empty' });

    if (Username !== undefined && (Username.length > 20 || !Username))
      return res.status(400).json({ success: false, message: 'Username invalid' });

    if (Role !== undefined && !Role)
      return res.status(400).json({ success: false, message: 'Role invalid' });

    if (Email !== undefined && (Email.length > 30 || !Email))
      return res.status(400).json({ success: false, message: 'Email invalid' });

    // Hash password if updating
    if (Password) {
      req.body.Password = hashPassword(Password);
    }

    // Update user directly with success/message format
    const pool = await poolPromise;
    const userId = req.params.id;
    const keys = Object.keys(req.body).filter(k => req.body[k] !== undefined);
    const values = keys.map(k => req.body[k]);

    if (keys.length === 0) {
      return res.status(400).json({ success: false, message: 'No fields to update' });
    }

    const setQuery = keys.map((k, i) => `${k}=@param${i}`).join(",");
    const request = pool.request();
    keys.forEach((k, i) => request.input(`param${i}`, values[i]));
    request.input("userId", userId);
    request.input("now", new Date());

    const query = `
      UPDATE Users 
      SET ${setQuery}, ModificationDate = GETDATE()
      WHERE userid = @userId;
      SELECT * FROM Users WHERE userid = @userId
    `;

    const result = await request.query(query);

    if (!result.recordset || result.recordset.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({ 
      success: true, 
      message: 'User updated successfully',
      data: result.recordset[0]
    });

  } catch (err) {
    console.error("[USER UPDATE ERROR]", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ---------------------- DEACTIVATE USER (SOFT DELETE) ----------------------
router.put('/:id/deactivate', async (req, res) => {
  const userId = req.params.id;
  
  try {
    const pool = await poolPromise;
    
    // Mark user as disabled and set end date
    await pool.request()
      .input('userId', userId)
      .query(`
        UPDATE Users 
        SET Disabled = 1, EndDate = GETDATE()
        WHERE userid = @userId
      `);
    
    // Fetch updated user
    const fetchRequest = pool.request();
    fetchRequest.input('userId', userId);
    const result = await fetchRequest.query(`SELECT * FROM Users WHERE userid = @userId`);
    
    if (!result.recordset || result.recordset.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    res.json({ 
      success: true, 
      message: 'User deactivated successfully',
      data: result.recordset[0]
    });
  } catch (err) {
    console.error("Error deactivating user:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ---------------------- PERMANENT DELETE USER (HARD DELETE) ----------------------
router.delete('/:id', generic.delete("Users", "userid"));

// ---------------------- REACTIVATE USER ----------------------
router.put('/:id/reactivate', async (req, res) => {
  const userId = req.params.id;
  
  try {
    const pool = await poolPromise;
    
    // Clear disabled flag and end date
    await pool.request()
      .input('userId', userId)
      .query(`
        UPDATE Users 
        SET Disabled = 0, EndDate = NULL
        WHERE userid = @userId
      `);
    
    // Fetch updated user
    const fetchRequest = pool.request();
    fetchRequest.input('userId', userId);
    const result = await fetchRequest.query(`SELECT * FROM Users WHERE userid = @userId`);
    
    if (!result.recordset || result.recordset.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    res.json({ 
      success: true, 
      message: 'User reactivated successfully',
      data: result.recordset[0]
    });
  } catch (err) {
    console.error("Error reactivating user:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

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

    // Check if user is disabled
    if (user.Disabled === 1 || user.Disabled === true) {
      return res.json({ 
        success: false, 
        message: 'This account has been deactivated. Contact support to reactivate.' 
      });
    }

    // Normalize user object keys to lowercase for frontend compatibility
    const normalizedUser = {
      userid: user.UserID,
      firstname: user.FirstName,
      lastname: user.LastName,
      middlename: user.MiddleName,
      username: user.Username,
      role: user.Role,
      email: user.Email,
      phonenumber: user.PhoneNumber,
      disabled: user.Disabled,
      creationdate: user.CreationDate,
      modificationdate: user.ModificationDate,
      enddate: user.EndDate
    };

    return res.json({
      success: true,
      message: 'Login successful',
      user: normalizedUser
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
      res.json({ success: true, PatientIDNoAuto: result.recordset[0].PatientIDNoAuto });
    } else {
      res.status(404).json({ success: false, message: 'Patient not found' });
    }

  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
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
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;