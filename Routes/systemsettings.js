// routes/systemsettings.js
const express = require('express');
const router = express.Router();
const poolPromise = require('../db');
const generic = require('../Controllers/genericController')(poolPromise);

// ----------------------------------------------------
// GENERIC CRUD ROUTES FOR SystemSettings
// ----------------------------------------------------
router.get('/', generic.getAll("SystemSettings", "SettingName"));      // Get all system settings
router.post('/', generic.add("SystemSettings", "SettingName"));        // Add system setting
router.put('/:id', generic.edit("SystemSettings", "SettingName"));     // Update system setting
router.delete('/:id', generic.delete("SystemSettings", "SettingName"));// Delete system setting

// ----------------------------------------------------
// GET SYSTEM SETTING BY NAME
// ----------------------------------------------------
router.get('/name/:settingName', async (req, res) => {
  const settingName = req.params.settingName;

  try {
    const pool = await poolPromise;

    const result = await pool.request()
      .input('settingName', settingName)
      .query(`
        SELECT *
        FROM SystemSettings
        WHERE SettingName = @settingName
      `);

    if (result.recordset.length > 0) {
      return res.json({ success: true, data: result.recordset[0] });
    } else {
      return res.json({ success: false, message: 'System setting not found' });
    }

  } catch (err) {
    console.error("Error fetching system setting:", err);
    return res.status(500).json({ success: false, message: 'Server error: ' + err.message });
  }
});

// ----------------------------------------------------
// EDIT SYSTEM SETTING BY NAME
// ----------------------------------------------------
router.put('/name/:settingName', async (req, res) => {
  const settingName = req.params.settingName;

  try {
    const updates = req.body || {};
    const keys = Object.keys(updates).filter((key) => key !== 'SettingName');

    if (keys.length === 0) {
      return res.status(400).json({ success: false, message: 'No fields provided to update' });
    }

    const pool = await poolPromise;
    const request = pool.request().input('settingName', settingName);

    const setClause = keys.map((key, index) => {
      request.input(`param${index}`, updates[key]);
      return `${key} = @param${index}`;
    }).join(', ');

    const result = await request.query(`
      UPDATE SystemSettings
      SET ${setClause}
      WHERE SettingName = @settingName;

      SELECT *
      FROM SystemSettings
      WHERE SettingName = @settingName;
    `);

    if (!result.recordset || result.recordset.length === 0) {
      return res.status(404).json({ success: false, message: 'System setting not found' });
    }

    return res.json({ success: true, message: 'System setting updated successfully', data: result.recordset[0] });
  } catch (err) {
    console.error('Error updating system setting:', err);
    return res.status(500).json({ success: false, message: 'Server error: ' + err.message });
  }
});

module.exports = router;
