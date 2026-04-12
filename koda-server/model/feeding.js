//mdz0019
const mongoose = require('mongoose');

const FeedingSchema = new mongoose.Schema({
    type : { type: String, enum: ['Breast', 'Bottle', 'Solids'], required: true },
    amount : { type: Number },
    side: { type: String, enum: ['Left', 'Right', "N/A"] },
    timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Feeding', FeedingSchema);
