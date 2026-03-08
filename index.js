require("dotenv").config();
const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");

// Import Stream service
const { generateToken, STREAM_API_KEY } = require("./Routes/streamService");

/* ===================== APP SETUP ===================== */
const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);

/* ===================== SOCKET.IO ===================== */
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  console.log("✅ Socket connected:", socket.id);

  // Join personal room
  socket.on("join", (userId) => {
    socket.join(`user_${userId}`);
    console.log(`👤 User ${userId} joined room`);
  });

  /* -------- CHAT -------- */
  socket.on("sendMessage", (msg) => {
    io.to(`user_${msg.ReceiverID}`).emit("receiveMessage", msg);
  });

  socket.on("messageRead", (data) => {
    io.to(`user_${data.ReceiverID}`).emit("messageRead", data);
  });

  /* -------- CALL SIGNALING -------- */
  socket.on("callInitiated", (data) => {
    io.to(`user_${data.to}`).emit("callInitiated", data);
  });

  socket.on("callAccepted", (data) => {
    io.to(`user_${data.from}`).emit("callAccepted", data);
  });

  socket.on("callRejected", (data) => {
    io.to(`user_${data.from}`).emit("callRejected", data);
  });

  socket.on("disconnect", () => {
    console.log("❌ Socket disconnected:", socket.id);
  });
});

/* ===================== STREAM TOKEN ===================== */
app.post("/stream/token", async (req, res) => {
  try {
    const user = req.body;

    const token = await generateToken({
      userid: user.userid,
      firstname: user.firstname,
      lastname: user.lastname,
    });

    res.json({ apiKey: STREAM_API_KEY,
               userId: user.userid,
               token });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message });
  }
});

// Upsert a Stream user (creates user in GetStream).
// Client can call this to ensure other participants exist before creating channels.
app.post('/stream/upsert', async (req, res) => {
  try {
    const user = req.body;
    if (!user || !user.userid) return res.status(400).json({ success: false, message: 'userid is required' });
    // generateToken performs upsert internally; call it but discard token
    await generateToken({ userid: user.userid, firstname: user.firstname || 'User', lastname: user.lastname || '' });
    return res.json({ success: true });
  } catch (err) {
    console.error('Stream upsert error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

const bodyParser = require('body-parser');

// 👇 RAW BODY for Stream webhook ONLY
app.use(
  '/api/stream/webhook',
  bodyParser.raw({ type: 'application/json' })
);

// 👇 Normal JSON for everything else
app.use(bodyParser.json());
// DB access for lightweight fallbacks
const poolPromise = require('./db');

// Resilient fallback for `/users` (lowercase) used by some clients.
// If the `./Routes/Users` module failed to load at startup, this
// endpoint will still return the active users list directly from DB.
app.get('/users', async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .query(`
        SELECT * FROM Users
        WHERE Disabled = 0 AND EndDate IS NULL
        ORDER BY FirstName, LastName
      `);
    return res.json(result.recordset);
  } catch (err) {
    console.error('Fallback /users failed:', err && err.message ? err.message : err);
    return res.status(500).json({ success: false, message: 'Fallback users endpoint error' });
  }
});
/* ===================== HEALTH CHECK ===================== */
app.get("/", (req, res) => {
  res.send("✅ API + Socket.IO + GetStream running");
});
// Helper to safely require and mount route modules
function safeMount(mountPoint, modulePath) {
  try {
    let mod = require(modulePath);
    // Support common export shapes: router itself, { router }, or default
    if (mod && mod.router) mod = mod.router;
    if (mod && mod.default && (mod.default.router || mod.default.use)) mod = mod.default.router || mod.default;

    const isRouter = !!mod && (typeof mod === 'function' || typeof mod.use === 'function' || typeof mod.handle === 'function' || Array.isArray(mod.stack));
    if (!isRouter) {
      console.error(`Invalid route module at ${modulePath} — export shape:`, Object.keys(mod || {}));
      const errRouter = express.Router();
      errRouter.use((req, res) => res.status(500).json({ success: false, message: `Invalid route module: ${modulePath}` }));
      app.use(mountPoint, errRouter);
      return;
    }
    app.use(mountPoint, mod);
  } catch (e) {
    console.error(`Failed to load route ${modulePath}:`, e && e.stack ? e.stack : e);
    const errRouter = express.Router();
    errRouter.use((req, res) => res.status(500).json({ success: false, message: `Failed to load route: ${modulePath}` }));
    app.use(mountPoint, errRouter);
  }
}

// Mount routes safely
safeMount('/api/call', './Routes/call');
safeMount('/ChatMessages', './Routes/chat');
safeMount('/Users', './Routes/Users');
safeMount('/prescription', './Routes/prescription');
// Backwards-compatible mount: allow legacy client paths that expect /DrugsAndMedicine
safeMount('/DrugsAndMedicine', './Routes/prescription');
safeMount('/Appointments', './Routes/appointments');
safeMount('/FollowUps', './Routes/followups');
safeMount('/Referrals', './Routes/referrals');
safeMount('/patients', './Routes/patients');
// Backwards compatibility: some clients call /Patient (singular, capitalized)
safeMount('/Patient', './Routes/patients');
safeMount('/Doctors', './Routes/doctors');
safeMount('/prescription-requests', './Routes/prescription_requests');
safeMount('/ContactPerson', './Routes/contactperson');
safeMount('/FamilyInfo', './Routes/familyinfo');
safeMount('/Dental', './Routes/dental');
safeMount('/DentalRecords', './Routes/dentalrecords');
safeMount('/MedicalRecords', './Routes/medicalrecords');
safeMount('/AccountLogs', './Routes/accountLogs');
safeMount('/FamilyHistory', './Routes/familyhistory');
safeMount('/LabTests', './Routes/labtests');
safeMount('/MedicalCheckup', './Routes/medicalcheckup');
safeMount('/OBHistory', './Routes/obhistory');
safeMount('/PastMedicalHistory', './Routes/pastmedicalhistory');
safeMount('/PatientConsent', './Routes/patientconsent');
safeMount('/ReviewOfSystems', './Routes/reviewofsystems');
safeMount('/SystemSettings', './Routes/systemsettings');
safeMount('/Transactions', './Routes/transactions');
safeMount('/api/stream', './Routes/streamWebhook');
safeMount('/api/generic', './Routes/fcm_generic');

/* ===================== SERVER START ===================== */
const PORT = process.env.PORT || 3000;
server.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
