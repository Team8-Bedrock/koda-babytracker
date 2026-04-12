//mdz0019
const mongoose = require('mongoose');

const DiaperSchema = new mongoose.Schema({
    type : { type: String, enum: ['Wet', 'Dirty', 'Mixed'], required: true },
    timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Diaper', DiaperSchema);
