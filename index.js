require('dotenv').config();
const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const { AccessToken, grants } = require("livekit-server-sdk"); // correct v2+ import

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);

// -------------------- SOCKET.IO ----------------------
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  console.log("✅ Socket connected:", socket.id);

  socket.on("join", (userId) => {
    socket.join(`user_${userId}`);
    console.log(`👤 User ${userId} joined room`);
  });

  socket.on("sendMessage", (msg) => {
    io.to(`user_${msg.ReceiverID}`).emit("receiveMessage", msg);
  });

  socket.on("messageRead", (data) => {
    io.to(`user_${data.ReceiverID}`).emit("messageRead", data);
  });

  socket.on("disconnect", () => {
    console.log("❌ Socket disconnected:", socket.id);
  });
});
// Import your route modules
const usersRoutes = require("./Routes/Users");
const drugsRoutes = require("./Routes/drugandmedicine");
const appointmentRoutes = require("./Routes/appointments");
const doctorRoutes = require("./Routes/doctors");
const patientRoutes = require("./Routes/patients");
const chatRoute = require('./Routes/chat');
const contactRoute = require("./Routes/contactperson");
const familyRoute = require("./Routes/familyinfo");

// Use the routes
app.use('/ChatMessages', chatRoute);
app.use("/DrugsAndMedicine", drugsRoutes);
app.use("/Users", usersRoutes);
app.use("/Appointments", appointmentRoutes);
app.use("/Patient", patientRoutes);
app.use("/Doctors", doctorRoutes);
app.use("/ContactPerson", contactRoute);
app.use("/FamilyInfo", familyRoute);
// -------------------- LIVEKIT TOKEN ------------------
const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY;
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET;
const LIVEKIT_ROOM = process.env.LIVEKIT_ROOM || "test-room";

app.post('/livekit/token', (req, res) => {
  try {
    const { identity, room } = req.body || {};
    if (!identity) return res.status(400).json({ error: "identity is required" });

    // Create token
    const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, { identity });

    // Add VideoGrant using grants.VideoGrant
    const videoGrant = new grants.VideoGrant({
      room: room || LIVEKIT_ROOM,
      canPublish: true,
      canSubscribe: true
    });

    at.addGrant(videoGrant);

    res.json({ token: at.toJwt() });
  } catch (err) {
    console.error("LIVEKIT TOKEN ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

// Optional GET endpoint for testing
app.get('/livekit/token/:identity', (req, res) => {
  try {
    const identity = req.params.identity;
    if (!identity) return res.status(400).json({ error: "identity is required" });

    const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, { identity });
    const videoGrant = new grants.VideoGrant({
      room: LIVEKIT_ROOM,
      canPublish: true,
      canSubscribe: true
    });
    at.addGrant(videoGrant);

    res.json({ token: at.toJwt() });
  } catch (err) {
    console.error("LIVEKIT TOKEN ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 API + Socket.IO running on port ${PORT}`);
});
