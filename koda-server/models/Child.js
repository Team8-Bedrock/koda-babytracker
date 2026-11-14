const mongoose = require("mongoose");

const AiRoutineBaselineSchema = new mongoose.Schema(
  {
    establishedAt: { type: Date, required: true },
    updatedAt: { type: Date, required: true },
    lastAdaptedInputHash: { type: String, required: true },
    initialProfile: { type: mongoose.Schema.Types.Mixed, required: true },
    adaptiveProfile: { type: mongoose.Schema.Types.Mixed, required: true },
  },
  { _id: false }
);

const ChildSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    caregivers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    name: {
      type: String,
      required: true,
    },
    dob: {
      type: String,
      required: true,
    },
    avatar: {
      type: String,
      required: true,
    },
    weight: {
      type: String,
      default: "",
    },
    allergies: {
      type: String,
      default: "",
    },
    other: {
      type: String,
      default: "",
    },
    moodExplanation: {
      type: String,
      default: "",
    },
    aiRoutineBaseline: {
      type: AiRoutineBaselineSchema,
      default: undefined,
    },
    aiRoutineBaselineHistoryCheckedAt: {
      type: Date,
      default: undefined,
    },
    caregiverIds: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    }],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Child", ChildSchema);