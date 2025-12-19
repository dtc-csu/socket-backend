require("dotenv").config();
const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const { AccessToken } = require("livekit-server-sdk"); // ✅ v2.x correct

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
console.log("LIVEKIT_API_KEY:", process.env.LIVEKIT_API_KEY);
console.log("LIVEKIT_API_SECRET:", process.env.LIVEKIT_API_SECRET);

/* ===================== SOCKET.IO ===================== */
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
    console.log("📨 Message:", msg);
    io.to(`user_${msg.ReceiverID}`).emit("receiveMessage", msg);
  });

  socket.on("messageRead", (data) => {
    console.log("📖 Message read:", data);
    io.to(`user_${data.ReceiverID}`).emit("messageRead", data);
  });

  socket.on("disconnect", () => {
    console.log("❌ Socket disconnected:", socket.id);
  });
});
app.get("/debug-token", (req, res) => {
  const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, { identity: "test-user" });
  at.addGrant({ room: LIVEKIT_ROOM, roomJoin: true, canPublish: true, canSubscribe: true });
  const token = at.toJwt();
  console.log("DEBUG TOKEN →", token);
  res.json({ token });
});

/* ===================== ROUTES ===================== */
app.get("/", (req, res) => {
  res.send("API is running");
});

/* ---- Your existing routes ---- */
const usersRoutes = require("./Routes/Users");
const drugsRoutes = require("./Routes/drugandmedicine");
const appointmentRoutes = require("./Routes/appointments");
const doctorRoutes = require("./Routes/doctors");
const patientRoutes = require("./Routes/patients");
const chatRoute = require("./Routes/chat");
const contactRoute = require("./Routes/contactperson");
const familyRoute = require("./Routes/familyinfo");

app.use("/ChatMessages", chatRoute);
app.use("/DrugsAndMedicine", drugsRoutes);
app.use("/Users", usersRoutes);
app.use("/Appointments", appointmentRoutes);
app.use("/Patient", patientRoutes);
app.use("/Doctors", doctorRoutes);
app.use("/ContactPerson", contactRoute);
app.use("/FamilyInfo", familyRoute);

/* ===================== LIVEKIT TOKEN ===================== */
const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY;
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET;
const LIVEKIT_ROOM = process.env.LIVEKIT_ROOM || "test-room";

console.log("ENV CHECK →", {
  key: process.env.LIVEKIT_API_KEY,
  secret: process.env.LIVEKIT_API_SECRET,
  cwd: process.cwd(),
});
/**
 * ✅ SDK v2.x CORRECT TOKEN ENDPOINT
 */
app.post("/livekit/token", (req, res) => {
  try {
    const { identity, room } = req.body || {};

    if (!identity) {
      return res.status(400).json({ error: "identity is required" });
    }

    const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, { identity });

    at.addGrant({
      room: room || LIVEKIT_ROOM,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
    });

    const token = at.toJwt();

    // ✅ Debug logs
    console.log("✅ LiveKit token generated for:", identity);
    console.log("TOKEN TYPE →", typeof token);
    console.log("TOKEN VALUE →", token);
    res.json({ token }); 
    // ✅ Send as string explicitly
    // res.send(JSON.stringify({ token: token.toString() }));
    
  } catch (err) {
    console.error("❌ LIVEKIT TOKEN ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

/* ===================== SERVER START ===================== */
const PORT = process.env.PORT || 3000;
server.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 API + Socket.IO running on port ${PORT}`);
});
