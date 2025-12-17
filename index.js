require('dotenv').config(); // <-- Add this at the top

const express = require("express");
const cors = require("cors");
const { AccessToken } = require('livekit-server-sdk'); // <-- add this

const app = express();
app.use(cors());
app.use(express.json());

// Root test route
app.get("/", (req, res) => {
  res.send("API is running");
});

// import routes
const usersRoutes = require("./Routes/Users");
const drugsRoutes = require("./Routes/drugandmedicine");
const appointmentRoutes = require("./Routes/appointments");
const doctorRoutes = require("./Routes/doctors");
const patientRoutes = require("./Routes/patients");
const chatRoute = require('./Routes/chat');
const contactRoute = require('./Routes/contactperson');
const familyRoute = require('./Routes/familyinfo');

app.use('/ChatMessages', chatRoute); 
app.use("/DrugsAndMedicine", drugsRoutes);
// FIXED route paths (added leading slash)
app.use("/Users", usersRoutes);
app.use("/Appointments", appointmentRoutes);
app.use("/Patient", patientRoutes);
app.use("/Doctors", doctorRoutes);
app.use("/ContactPerson", contactRoute);
app.use("/FamilyInfo", familyRoute);

// -------------------- LiveKit token route --------------------
const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY || "devkey";
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET || "livekitthisissupersecret12345678910";
const LIVEKIT_ROOM = process.env.LIVEKIT_ROOM || "test-room";

app.get('/livekit/token/:identity', (req, res) => {
  try {
    const identity = req.params.identity;

    const at = new AccessToken(
      process.env.LIVEKIT_API_KEY,
      process.env.LIVEKIT_API_SECRET,
      { identity }
    );

    // ✅ NEW WAY (NO VideoGrant)
    at.addGrant({
      roomJoin: true,
      room: process.env.LIVEKIT_ROOM || 'test-room',
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });

    res.json({ token: at.toJwt() });
  } catch (err) {
    console.error('LIVEKIT TOKEN ERROR:', err);
    res.status(500).json({ error: err.message });
  }
});
// ------------------------------------------------------------

const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`API running on http://0.0.0.0:${PORT}`);
});
