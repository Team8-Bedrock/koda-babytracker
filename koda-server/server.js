const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const dns = require('dns');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const childRoutes = require("./routes/children");

// Some routers mishandle the SRV lookups mongodb+srv:// needs, causing ECONNREFUSED
// even though normal DNS works; point Node's resolver at a public DNS server instead.
dns.setServers(['8.8.8.8', '1.1.1.1']);

const activitiesRouter = require('./routes/activities'); //mdz0019 import activities routes

const app = express();
app.use(express.json());
app.use(cors());

app.use('/api', activitiesRouter); //mdz0019 use activities routes

app.use('/api/telemetry', require('./routes/offlineLog')); //Offline

// Connect to MongoDB using the secret variable
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ Koda Database Connected!"))
  .catch(err => console.error("❌ Connection Error:", err));

app.get('/', (req, res) => res.send("Koda API is Running..."));

// Define routes
const authRoutes = require('./routes/auth');
const caregiverLinkRoutes = require('./routes/caregiverLinks');
app.use('/api/auth', authRoutes);
app.use("/api/children", childRoutes);
app.use('/api/caregiver-links', caregiverLinkRoutes);
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server on port ${PORT}`));

