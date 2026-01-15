const admin = require("firebase-admin");

const serviceAccount = JSON.parse(process.env.FIREBASE_ADMIN_JSON);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

module.exports = admin;
