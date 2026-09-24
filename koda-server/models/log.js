//PAUSED
const mongoose = require('mongoose');

const logSchema = new mongoose.Schema({
    logId: {
        type: String,
        required: true,
        unique: true,
    },

    timestamp: {
        type: Date,
        required: true,
    },
    
    level: {
        type: String,
        required: true,
        index: true,
    },

    message: {
        type: String,
        required: true,
    },

    context: {
        type: String, //Maybe modify to: type: mongoose.Schema.Types.Mixed,
        required: false,
    },

    serverReceivedAt: {
        type: Date,
        default: Date.now,
    },
}); 

logSchema.index({ serverReceivedAt: -1 }, { expireAfterSeconds: 2592000 }); // Index for faster queries on serverReceivedAt & expirations
module.exports = mongoose.model('Log', logSchema);

