const mongoose = require("mongoose");

const ChatMessageSchema = new mongoose.Schema(
    {
        childId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Child",
            required: true,
            index: true,
        },
        senderId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        kind: {
            type: String,
            enum: ["text", "photo", "voice"],
            default: "text",
        },
        text: {
            type: String,
            required: function () {
                return this.kind === "text";
            },
            trim: true,
            maxlength: 2000,
            default: "",
        },
        recipientId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
            index: true,
        },
        attachmentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "ChatAttachment",
        },
        urgent: {
            type: Boolean,
            default: false,
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model("ChatMessage", ChatMessageSchema);