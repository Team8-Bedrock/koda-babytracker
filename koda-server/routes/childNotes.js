const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const Child = require("../models/Child");

const ChildNote = mongoose.models.ChildNote || mongoose.model("ChildNote", new mongoose.Schema({
  childId: { type: mongoose.Schema.Types.ObjectId, ref: "Child", required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  label: { type: String, default: "note", maxlength: 40 },
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
  const child = await Child.findOne({ _id: childId, $or: [{ userId }, { caregiverIds: userId }] });
  if (!child) return null;
  return { child, isParent: String(child.userId) === String(userId) };
};

const clean = (body) => {
  const out = {};
  if (typeof body.label === "string") out.label = body.label.trim().slice(0, 40) || "note";
  if (typeof body.text === "string") out.text = body.text.trim().slice(0, 1000);
  if (typeof body.visibleToCaregiver === "boolean") out.visibleToCaregiver = body.visibleToCaregiver;
  return out;
};

router.get("/:childId", authMiddleware, async (req, res) => {
  try {
    const found = await loadChild(req.params.childId, req.user.id);
    if (!found) return res.status(404).json({ msg: "Child not found" });
    const filter = { childId: found.child._id };
    if (!found.isParent) filter.visibleToCaregiver = true;
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
    const note = await ChildNote.create({ ...clean(req.body), childId: found.child._id, createdBy: req.user.id });
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
    const note = await ChildNote.findOneAndUpdate(
      { _id: req.params.noteId, childId: found.child._id },
      clean(req.body),
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
