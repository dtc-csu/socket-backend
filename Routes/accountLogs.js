const express = require('express');
const router = express.Router();
const poolPromise = require('../db');

// ----------------------------------------------------
// ADD ACCOUNT LOG
// ----------------------------------------------------
router.post('/', async (req, res) => {
  try {
    const { UserID, ActionType, Platform, Description } = req.body;

    if (!UserID || !ActionType || !Platform) {
      return res.status(400).json({ 
        success: false, 
        message: 'UserID, ActionType, and Platform are required' 
      });
    }

    const pool = await poolPromise;

    await pool.request()
      .input('UserID', UserID)
      .input('ActionType', ActionType)
      .input('Platform', Platform)
      .input('Description', Description || null)
      .query(`
        INSERT INTO AccountLogs (UserID, ActionType, Platform, Description, LogDate)
        VALUES (@UserID, @ActionType, @Platform, @Description, GETDATE())
      `);

    res.json({ success: true, message: 'Log added successfully' });

  } catch (err) {
    console.error('Error adding account log:', err);
    res.status(500).json({ success: false, message: 'Server error: ' + err.message });
  }
});

// ----------------------------------------------------
// GET LOGS BY USER ID
// ----------------------------------------------------
router.get('/user/:userId', async (req, res) => {
  try {
    const pool = await poolPromise;
    const userId = req.params.userId;

    const result = await pool.request()
      .input('UserID', userId)
      .query(`
        SELECT * FROM AccountLogs 
        WHERE UserID = @UserID 
        ORDER BY LogDate DESC
      `);

    res.json(result.recordset);

  } catch (err) {
    console.error('Error fetching account logs:', err);
    res.status(500).json({ success: false, message: 'Server error: ' + err.message });
  }
});

module.exports = router;
