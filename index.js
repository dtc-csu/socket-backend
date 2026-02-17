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

const bodyParser = require('body-parser');

// 👇 RAW BODY for Stream webhook ONLY
app.use(
  '/api/stream/webhook',
  bodyParser.raw({ type: 'application/json' })
);

// 👇 Normal JSON for everything else
app.use(bodyParser.json());
/* ===================== HEALTH CHECK ===================== */
app.get("/", (req, res) => {
  res.send("✅ API + Socket.IO + GetStream running");
});
const callRoutes = require("./Routes/call");
app.use("/api/call", callRoutes);
/* ===================== YOUR EXISTING ROUTES ===================== */
app.use("/ChatMessages", require("./Routes/chat"));
app.use("/Users", require("./Routes/Users"));
app.use("/DrugsAndMedicine", require("./Routes/prescription"));
app.use("/Appointments", require("./Routes/appointments"));
app.use("/FollowUps", require("./Routes/followups"));
app.use("/Patient", require("./Routes/patients"));
app.use("/Doctors", require("./Routes/doctors"));
app.use("/ContactPerson", require("./Routes/contactperson"));
app.use("/FamilyInfo", require("./Routes/familyinfo"));
app.use("/Dental", require("./Routes/dental"));
app.use("/DentalRecords", require("./Routes/dentalrecords"));
app.use("/MedicalRecords", require("./Routes/medicalrecords"));
const streamWebhook = require('./Routes/streamWebhook');
app.use('/api/stream', streamWebhook);
const generic = require("./Routes/fcm_generic");
app.use("/api/generic", generic);

/* ===================== SERVER START ===================== */
const PORT = process.env.PORT || 3000;
server.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
