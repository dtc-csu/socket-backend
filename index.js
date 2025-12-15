require('dotenv').config(); // <-- Add this at the top

const express = require("express");
const cors = require("cors");
const { AccessToken, VideoGrant } = require('livekit-server-sdk'); // <-- add this

const app = express();
app.use(cors());
app.use(express.json());

// Root test route
app.get("/", (req, res) => {
  res.send("API is running");
});

// import routes
const usersRoutes = require("./Routes/Users");
const appointmentRoutes = require("./Routes/appointments");
const doctorRoutes = require("./Routes/doctors");
const patientRoutes = require("./Routes/patients");
const chatRoute = require('./Routes/chat');

app.use('/ChatMessages', chatRoute); 
// FIXED route paths (added leading slash)
app.use("/Users", usersRoutes);
app.use("/Appointments", appointmentRoutes);
app.use("/Patient", patientRoutes);
app.use("/Doctors", doctorRoutes);

// -------------------- LiveKit token route --------------------
const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY || "devkey";
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET || "devsupersecret_123456789abcdefgh";
const LIVEKIT_ROOM = process.env.LIVEKIT_ROOM || "test-room";

app.get("/livekit/token/:identity", (req, res) => {
  const identity = req.params.identity;

  const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, { identity });
  const grant = new VideoGrant({ room: LIVEKIT_ROOM });
  at.addGrant(grant);

  const token = at.toJwt();
  res.json({ token });
});
// ------------------------------------------------------------

const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`API running on http://0.0.0.0:${PORT}`);
});
