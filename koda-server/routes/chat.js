const express = require("express");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const User = require("../models/user");
const Child = require("../models/Child");
const CaregiverLink = require("../models/CaregiverLink");
const ChatMessage = require("../models/ChatMessage");
const ChatAttachment = require("../models/ChatAttachment");

const router = express.Router();
const MAX_ATTACHMENT_BYTES = 1024 * 1024; // 1 MB

async function checkAccess(req, res, next) {
    try {
        const token = req.header("x-auth-token");
        if (!token) return res.status(401).json({ msg: "Please log in." });

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id);
        if (!user) return res.status(401).json({ msg: "Account not found." });

        if (!mongoose.isValidObjectId(req.params.childId)) {
            return res.status(400).json({ msg: "Invalid child ID." });
        }

        const child = await Child.findById(req.params.childId);
        if (!child) return res.status(404).json({ msg: "Child not found." });

        const isParent =
            user.role === "parent" &&
            child.userId.toString() === user._id.toString();

        const approvedLink =
            user.role === "caregiver"
                ? await CaregiverLink.findOne({
                    parentId: child.userId,
                    caregiverId: user._id,
                    status: "approved",
                    sharedChildren: child._id,
                })
                : null;

        if (!isParent && !approvedLink) {
            return res.status(403).json({ msg: "You do not have access to this chat." });
        }

        if (approvedLink?.chatPermissions?.enabled === false) {
            return res.status(403).json({ msg: "Chat is disabled for this caregiver." });
        }

        req.chatLink = approvedLink;

        req.chatUser = user;
        req.chatChild = child;
        next();
    } catch (err) {
        if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
            return res.status(401).json({ msg: "Please log in again." });
        }
        console.error(err);
        res.status(500).json({ msg: "Could not check chat access." });
    }
}
router.patch("/family-name", async (req, res) => {
    try {
        const token = req.header("x-auth-token");
        if (!token) return res.status(401).json({ msg: "Please log in." });

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const parent = await User.findById(decoded.id);
        if (!parent || parent.role !== "parent") {
            return res.status(403).json({ msg: "Only a parent can change the chat name." });
        }

        const name = typeof req.body.name === "string" ? req.body.name.trim() : "";
        if (!name || name.length > 60) {
            return res.status(400).json({ msg: "Enter a chat name up to 60 characters." });
        }

        parent.familyChatName = name;
        await parent.save();
        res.json({ familyChatName: parent.familyChatName });
    } catch (err) {
        if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
            return res.status(401).json({ msg: "Please log in again." });
        }
        console.error(err);
        res.status(500).json({ msg: "Could not update the chat name." });
    }
});

router.get("/:childId/messages", checkAccess, async (req, res) => {
    try {
        const messages = await ChatMessage.find({ childId: req.chatChild._id })
            .sort({ createdAt: -1 })
            .limit(100)
            .populate("senderId", "username role");

        res.json(messages.reverse());
    } catch (err) {
        console.error(err);
        res.status(500).json({ msg: "Could not load messages." });
    }
});

router.post("/:childId/messages", checkAccess, async (req, res) => {
    try {
        const text = typeof req.body.text === "string" ? req.body.text.trim() : "";
        if (!text || text.length > 2000) {
            return res.status(400).json({ msg: "Enter a message up to 2000 characters." });
        }
        if (req.body.urgent === true && req.chatLink?.chatPermissions?.urgent === false) {
            return res.status(403).json({ msg: "Urgent messages are disabled for this caregiver." });
        }
        const message = await ChatMessage.create({
            childId: req.chatChild._id,
            senderId: req.chatUser._id,
            kind: "text",
            text,
            urgent: req.body.urgent === true,
        });

        await message.populate("senderId", "username role");
        res.status(201).json(message);
    } catch (err) {
        console.error(err);
        res.status(500).json({ msg: "Could not send message." });
    }
});

router.post("/:childId/attachments", checkAccess, async (req, res) => {
    let attachment;

    try {
        const { kind, data } = req.body;
        if (kind === "photo" && req.chatLink?.chatPermissions?.photos === false) {
            return res.status(403).json({ msg: "Photo messages are disabled for this caregiver." });
        }
        if (kind === "voice" && req.chatLink?.chatPermissions?.voice === false) {
            return res.status(403).json({ msg: "Voice messages are disabled for this caregiver." });
        }
        if (req.body.urgent === true && req.chatLink?.chatPermissions?.urgent === false) {
            return res.status(403).json({ msg: "Urgent messages are disabled for this caregiver." });
        }
        const mimeType = String(req.body.mimeType || "").split(";")[0].toLowerCase();

        const allowedTypes = {
            photo: ["image/jpeg", "image/png", "image/webp"],
            voice: ["audio/webm", "audio/mp4", "audio/ogg", "audio/mpeg"],
        };

        if (!allowedTypes[kind]?.includes(mimeType) || typeof data !== "string") {
            return res.status(400).json({ msg: "Unsupported attachment type." });
        }

        if (!data || !/^[A-Za-z0-9+/]+={0,2}$/.test(data)) {
            return res.status(400).json({ msg: "Invalid attachment data." });
        }

        const fileBuffer = Buffer.from(data, "base64");
        if (!fileBuffer.length || fileBuffer.length > MAX_ATTACHMENT_BYTES) {
            return res.status(400).json({ msg: "Attachment must be under 1 MB." });
        }

        attachment = await ChatAttachment.create({
            childId: req.chatChild._id,
            kind,
            mimeType,
            data: fileBuffer,
        });

        const message = await ChatMessage.create({
            childId: req.chatChild._id,
            senderId: req.chatUser._id,
            kind,
            attachmentId: attachment._id,
            urgent: req.body.urgent === true,
        });

        await message.populate("senderId", "username role");
        res.status(201).json(message);
    } catch (err) {
        if (attachment) await attachment.deleteOne();
        console.error(err);
        res.status(500).json({ msg: "Could not upload attachment." });
    }
});

router.get("/:childId/attachments/:attachmentId", checkAccess, async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.attachmentId)) {
            return res.status(400).json({ msg: "Invalid attachment ID." });
        }

        const attachment = await ChatAttachment.findOne({
            _id: req.params.attachmentId,
            childId: req.chatChild._id,
        });

        if (!attachment) return res.status(404).json({ msg: "Attachment not found." });

        res.set({
            "Content-Type": attachment.mimeType,
            "Cache-Control": "private, no-store",
            "X-Content-Type-Options": "nosniff",
        });
        res.send(attachment.data);
    } catch (err) {
        console.error(err);
        res.status(500).json({ msg: "Could not load attachment." });
    }
});

module.exports = router;