const express = require('express');
const router = express.Router();
const poolPromise = require('../db');

// -----------------------------
// Utility: Validate required fields
// -----------------------------
function validateFields(body, fields) {
  for (const field of fields) {
    if (!body[field] && body[field] !== 0) {
      return `Missing field: ${field}`;
    }
  }
  return null;
}

// -----------------------------
// 1. SAVE MESSAGE
// -----------------------------
router.post('/saveMessage', async (req, res) => {
  try {
    let { SenderID, ReceiverID, SenderRole, ReceiverRole, Message } = req.body;
    SenderID = parseInt(SenderID, 10);
    ReceiverID = parseInt(ReceiverID, 10);

    const missing = validateFields(req.body, [
      "SenderID", "ReceiverID", "SenderRole", "ReceiverRole", "Message"
    ]);
    if (missing) return res.status(400).json({ error: missing });

    const pool = await poolPromise;

    // Get full names from the user table
    const senderResult = await pool.request()
      .input("SenderID", SenderID)
      .query(`SELECT firstname, lastname FROM Users WHERE UserID = @SenderID`);

    const receiverResult = await pool.request()
      .input("ReceiverID", ReceiverID)
      .query(`SELECT firstname, lastname FROM Users WHERE UserID = @ReceiverID`);

    const senderName = senderResult.recordset[0] ? `${senderResult.recordset[0].firstname} ${senderResult.recordset[0].lastname}` : "Unknown";
    const receiverName = receiverResult.recordset[0] ? `${receiverResult.recordset[0].firstname} ${receiverResult.recordset[0].lastname}` : "Unknown";

    // Insert message
    await pool.request()
      .input("SenderID", SenderID)
      .input("SenderName", senderName)
      .input("SenderRole", SenderRole)
      .input("ReceiverID", ReceiverID)
      .input("ReceiverName", receiverName)
      .input("ReceiverRole", ReceiverRole)
      .input("Message", Message)
      .query(`
        INSERT INTO ChatMessages 
        (SenderID, SenderName, SenderRole, ReceiverID, ReceiverName, ReceiverRole, Message, SentAt)
        VALUES 
        (@SenderID, @SenderName, @SenderRole, @ReceiverID, @ReceiverName, @ReceiverRole, @Message, GETDATE())
      `);

    return res.json({ success: true });
  } catch (err) {
    console.error("Error saving message:", err);
    return res.status(500).json({ error: "Database insert failed" });
  }
});

// -----------------------------
// 2. LIST LATEST CONVERSATIONS (Like Messenger Inbox)
// -----------------------------
router.get('/list/:userId', async (req, res) => {
  const userId = parseInt(req.params.userId, 10);

  try {
    const pool = await poolPromise;

    const result = await pool.request()
      .input("UserID", userId)
      .query(`
        SELECT TOP 1 WITH TIES
          CAST(SenderID AS INT) AS SenderID,
          SenderName,
          SenderRole,
          CAST(ReceiverID AS INT) AS ReceiverID,
          ReceiverName,
          ReceiverRole,
          Message,
          SentAt
        FROM ChatMessages
        WHERE SenderID = @UserID OR ReceiverID = @UserID
        ORDER BY ROW_NUMBER() OVER (
          PARTITION BY 
            CASE WHEN SenderID = @UserID THEN ReceiverID ELSE SenderID END
          ORDER BY SentAt DESC
        );
      `);

    return res.json(result.recordset);
  } catch (err) {
    console.error("Error loading chat list:", err);
    return res.status(500).json({ error: "Error loading chat list" });
  }
});

// -----------------------------
// 3. FULL CHAT THREAD BETWEEN 2 USERS
// -----------------------------
router.get('/thread/:myId/:peerId', async (req, res) => {
  const myId = parseInt(req.params.myId, 10);
  const peerId = parseInt(req.params.peerId, 10);

  try {
    const pool = await poolPromise;

    const result = await pool.request()
      .input("MyID", myId)
      .input("PeerID", peerId)
      .query(`
        SELECT
          CAST(SenderID AS INT) AS SenderID,
          SenderName,
          SenderRole,
          CAST(ReceiverID AS INT) AS ReceiverID,
          ReceiverName,
          ReceiverRole,
          Message,
          SentAt
        FROM ChatMessages
        WHERE
          (SenderID = @MyID AND ReceiverID = @PeerID)
          OR
          (SenderID = @PeerID AND ReceiverID = @MyID)
        ORDER BY SentAt ASC;
      `);

    return res.json(result.recordset);
  } catch (err) {
    console.error("Error loading chat thread:", err);
    return res.status(500).json({ error: "Error loading chat thread" });
  }
});
// GET all messages
router.get('/getAllMessages', async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool
      .request()
      .query(`
        SELECT *
        FROM ChatMessages
        ORDER BY SentAt ASC
      `);

    res.json(result.recordset);
  } catch (err) {
    console.error('Error fetching messages:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
