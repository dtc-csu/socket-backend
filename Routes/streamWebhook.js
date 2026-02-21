const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const poolPromise = require('../db');

const STREAM_SECRET = process.env.STREAM_API_SECRET;

// 🔐 Verify Stream signature
function verifyStreamSignature(req) {
  const signature = req.headers['x-signature'];
  if (!signature) return false;

  const body = req.body; // RAW buffer
  const hash = crypto
    .createHmac('sha256', STREAM_SECRET)
    .update(body)
    .digest('hex');

  return signature === hash;
}

router.post('/webhook', async (req, res) => {
  try {
    // 1️⃣ Verify signature
    if (!verifyStreamSignature(req)) {
      return res.status(401).send('Invalid Stream signature');
    }

    // 2️⃣ Parse JSON
    const event = JSON.parse(req.body.toString());

    // 3️⃣ Only care about new messages
    if (event.type !== 'message.new') {
      return res.sendStatus(200);
    }

    const { message, user, channel } = event;

    // 4️⃣ Extract members (1-to-1)
    const members = Object.keys(channel.members || {});
    if (members.length !== 2) {
      return res.sendStatus(200);
    }

    const senderId = parseInt(user.id, 10);
    const receiverId = parseInt(
      members.find(id => id !== user.id),
      10
    );

    // 5️⃣ Save to SQL
    const pool = await poolPromise;
    await pool.request()
      .input('SenderID', senderId)
      .input('ReceiverID', receiverId)
      .input('Message', message.text || '')
      .query(`
        INSERT INTO ChatMessages
          (SenderID, ReceiverID, Message, SentAt)
        VALUES
          (@SenderID, @ReceiverID, @Message, GETDATE())
      `);

    return res.sendStatus(200);
  } catch (err) {
    console.error('Stream webhook error:', err && err.stack ? err.stack : err);
    return res.sendStatus(500);
  }
});

module.exports = router;
