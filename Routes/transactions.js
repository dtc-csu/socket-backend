// routes/transactions.js
const express = require('express');
const router = express.Router();
const poolPromise = require('../db');
const generic = require('../Controllers/genericController')(poolPromise);

// ----------------------------------------------------
// GENERIC CRUD ROUTES FOR Transactions
// ----------------------------------------------------
router.get('/', generic.getAll("Transactions", "TransactionID"));      // Get all transactions
router.post('/', generic.add("Transactions", "TransactionID"));        // Add transaction
router.put('/:id', generic.edit("Transactions", "TransactionID"));     // Update transaction
router.delete('/:id', generic.delete("Transactions", "TransactionID"));// Delete transaction

// ----------------------------------------------------
// GET TRANSACTIONS BY PATIENT ID
// ----------------------------------------------------
router.get('/patient/:patientId', async (req, res) => {
  const patientId = req.params.patientId;

  try {
    const pool = await poolPromise;

    const result = await pool.request()
      .input('patientId', patientId)
      .query(`
        SELECT *
        FROM Transactions
        WHERE PatientID = @patientId
        ORDER BY TransactionDate DESC
      `);

    return res.json(result.recordset);

  } catch (err) {
    console.error("Error fetching transactions:", err);
    return res.status(500).json({ success: false, message: 'Server error: ' + err.message });
  }
});

// ----------------------------------------------------
// GET TRANSACTIONS BY SERVICE TYPE
// ----------------------------------------------------
router.get('/service/:serviceType', async (req, res) => {
  const serviceType = req.params.serviceType;

  try {
    const pool = await poolPromise;

    const result = await pool.request()
      .input('serviceType', serviceType)
      .query(`
        SELECT *
        FROM Transactions
        WHERE ServiceType = @serviceType
        ORDER BY TransactionDate DESC
      `);

    return res.json(result.recordset);

  } catch (err) {
    console.error("Error fetching transactions by service type:", err);
    return res.status(500).json({ success: false, message: 'Server error: ' + err.message });
  }
});

// ----------------------------------------------------
// GET TRANSACTIONS BY DATE RANGE
// ----------------------------------------------------
router.get('/date-range/:startDate/:endDate', async (req, res) => {
  const { startDate, endDate } = req.params;

  try {
    const pool = await poolPromise;

    const result = await pool.request()
      .input('startDate', startDate)
      .input('endDate', endDate)
      .query(`
        SELECT *
        FROM Transactions
        WHERE TransactionDate BETWEEN @startDate AND @endDate
        ORDER BY TransactionDate DESC
      `);

    return res.json(result.recordset);

  } catch (err) {
    console.error("Error fetching transactions by date range:", err);
    return res.status(500).json({ success: false, message: 'Server error: ' + err.message });
  }
});

module.exports = router;
