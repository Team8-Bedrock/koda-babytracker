const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const Child = require("../models/Child");
const CaregiverLink = require("../models/CaregiverLink");

const NOTE_TOPICS = ["diaper", "mood", "sleeping", "playtime", "feeding", "allergies", "other"];

const topicOf = (value) => {
  const topic = String(value || "").trim().toLowerCase();
  return NOTE_TOPICS.includes(topic) ? topic : null;
};

const ChildNote = mongoose.models.ChildNote || mongoose.model("ChildNote", new mongoose.Schema({
  childId: { type: mongoose.Schema.Types.ObjectId, ref: "Child", required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  label: { type: String, default: "other" },
  text: { type: String, default: "", maxlength: 1000 },
  visibleToCaregiver: { type: Boolean, default: false }
}, { timestamps: true }));

const authMiddleware = (req, res, next) => {
  const token = req.header("x-auth-token");
  if (!token) return res.status(401).json({ msg: "No token, authorization denied" });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (err) {
    res.status(401).json({ msg: "Token is not valid" });
  }
};

const loadChild = async (childId, userId) => {
  if (!mongoose.Types.ObjectId.isValid(childId)) return null;
  const child = await Child.findById(childId);
  if (!child) return null;
  if (String(child.userId) === String(userId)) return { child, isParent: true };
  const listed = (child.caregiverIds || []).some((id) => String(id) === String(userId));
  if (listed) return { child, isParent: false };
  const link = await CaregiverLink.findOne({
    parentId: child.userId,
    caregiverId: userId,
    status: "approved",
    sharedChildren: child._id,
  });
  if (!link) return null;
  await Child.updateOne({ _id: child._id }, { $addToSet: { caregiverIds: link.caregiverId } });
  return { child, isParent: false };
};

const clean = (body) => {
  const out = {};
  if (body.label !== undefined) {
    const topic = topicOf(body.label);
    if (!topic) return { error: `topic must be one of: ${NOTE_TOPICS.join(", ")}` };
    out.label = topic;
  }
  if (typeof body.text === "string") out.text = body.text.trim().slice(0, 1000);
  if (typeof body.visibleToCaregiver === "boolean") out.visibleToCaregiver = body.visibleToCaregiver;
  return { out };
};

router.get("/:childId", authMiddleware, async (req, res) => {
  try {
    const found = await loadChild(req.params.childId, req.user.id);
    if (!found) return res.status(404).json({ msg: "Child not found" });
    const filter = { childId: found.child._id };
    if (!found.isParent) filter.visibleToCaregiver = true;
    const topic = topicOf(req.query.topic);
    if (topic) filter.label = topic;
    const notes = await ChildNote.find(filter).sort({ createdAt: 1 });
    res.json({ isParent: found.isParent, notes });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/:childId", authMiddleware, async (req, res) => {
  try {
    const found = await loadChild(req.params.childId, req.user.id);
    if (!found) return res.status(404).json({ msg: "Child not found" });
    if (!found.isParent) return res.status(403).json({ msg: "Only parents can add notes" });
    const { out, error } = clean(req.body);
    if (error) return res.status(400).json({ msg: error });
    if (!out.label) return res.status(400).json({ msg: "pick a topic for this note" });
    if (!out.text) return res.status(400).json({ msg: "note text is required" });
    const note = await ChildNote.create({ ...out, childId: found.child._id, createdBy: req.user.id });
    res.status(201).json(note);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/:childId/:noteId", authMiddleware, async (req, res) => {
  try {
    const found = await loadChild(req.params.childId, req.user.id);
    if (!found) return res.status(404).json({ msg: "Child not found" });
    if (!found.isParent) return res.status(403).json({ msg: "Only parents can edit notes" });
    const { out, error } = clean(req.body);
    if (error) return res.status(400).json({ msg: error });
    const note = await ChildNote.findOneAndUpdate(
      { _id: req.params.noteId, childId: found.child._id },
      out,
      { new: true }
    );
    if (!note) return res.status(404).json({ msg: "Note not found" });
    res.json(note);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/:childId/:noteId", authMiddleware, async (req, res) => {
  try {
    const found = await loadChild(req.params.childId, req.user.id);
    if (!found) return res.status(404).json({ msg: "Child not found" });
    if (!found.isParent) return res.status(403).json({ msg: "Only parents can delete notes" });
    await ChildNote.deleteOne({ _id: req.params.noteId, childId: found.child._id });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;