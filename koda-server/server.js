const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const childRoutes = require("./routes/children");

const activitiesRouter = require('./routes/activities'); //mdz0019 import activities routes

const app = express();
app.use(express.json());
app.use(cors({
  origin: [
    "http://localhost:3000", 
    "https://koda-app-yy9x.onrender.com"
  ],
  credentials: true
}));
app.use('/api', activitiesRouter);

// Connect to MongoDB using the secret variable
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ Koda Database Connected!"))
  .catch(err => console.error("❌ Connection Error:", err));

app.get('/', (req, res) => res.send("Koda API is Running..."));

// Define routes
const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);
app.use("/api/children", childRoutes);
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server on port ${PORT}`));

