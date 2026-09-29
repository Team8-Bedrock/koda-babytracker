const mongoose = require("mongoose");

// Tracks a caregiver's request to access a parent's children, approval status,
// and which specific child profiles the parent has chosen to share.
const CaregiverLinkSchema = new mongoose.Schema(
  {
    parentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    caregiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "denied"],
      default: "pending",
    },
    chatPermissions: {
      enabled: { type: Boolean, default: true },
      photos: { type: Boolean, default: true },
      voice: { type: Boolean, default: true },
      urgent: { type: Boolean, default: true },
    },
    sharedChildren: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Child",
      },
    ],
  },
  { timestamps: true }
);

CaregiverLinkSchema.index({ parentId: 1, caregiverId: 1 }, { unique: true });

module.exports = mongoose.model("CaregiverLink", CaregiverLinkSchema);
