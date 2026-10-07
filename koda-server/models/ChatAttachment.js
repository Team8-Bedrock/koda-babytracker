const mongoose = require("mongoose");

const ChatAttachmentSchema = new mongoose.Schema(
  {
    childId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Child",
      required: true,
    },
    kind: {
      type: String,
      enum: ["photo", "voice"],
      required: true,
    },
    mimeType: {
      type: String,
      required: true,
    },
    data: {
      type: Buffer,
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ChatAttachment", ChatAttachmentSchema);