// Tracks offline activity entries and holds possible duplicates for parent review.
const mongoose = require('mongoose');

const OfflineActivitySchema = new mongoose.Schema({
    clientEntryId: {
        type: String,
        required: true
    },
    childId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Child',
        required: true
    },
    parentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    loggedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    activityType: {
        type: String,
        enum: ['feeding', 'sleep', 'diaper'],
        required: true
    },
    details: {
        type: mongoose.Schema.Types.Mixed,
        required: true
    },
    loggedAt: {
        type: Date,
        required: true
    },
    status: {
        type: String,
        enum: ['queued', 'pending_review', 'saved', 'discarded'],
        default: 'queued'
    },
    existingEntryId: {
        type: mongoose.Schema.Types.ObjectId,
        default: null
    },
    savedEntryId: {
        type: mongoose.Schema.Types.ObjectId,
        default: null
    }
}, {
    timestamps: true
});

OfflineActivitySchema.index(
    { loggedBy: 1, clientEntryId: 1 },
    { unique: true }
);

OfflineActivitySchema.index({ parentId: 1, status: 1 });

module.exports = mongoose.model(
    'OfflineActivity',
    OfflineActivitySchema
);