//mdz0019

const mongoose = require('mongoose');

const SleepSchema = new mongoose.Schema({
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    duration: { type: Number, required: true }, 
    type: { type: String, enum: ['Nap', 'Night'] }, // Optional, team decision
    quality: { type: String, enum: ['Good', 'Fair', 'Poor'] }, // Optional, team decision
    timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Sleep', SleepSchema);
