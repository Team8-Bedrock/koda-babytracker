require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

// Connect to MongoDB using the secret variable
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ Koda Database Connected!"))
  .catch(err => console.error("❌ Connection Error:", err));

app.get('/', (req, res) => res.send("Koda API is Running..."));

// Define routes
const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server on port ${PORT}`));

