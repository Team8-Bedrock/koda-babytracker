const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const Child = require("../models/Child");

const authMiddleware = (req, res, next) => {
  const token = req.header("x-auth-token");
  if (!token) {
    return res.status(401).json({ msg: "No token, authorization denied" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ msg: "Token is not valid" });
  }
};

// Create child profile
router.post("/", authMiddleware, async (req, res) => {
  try {
    const { name, dob, avatar, weight, allergies, other, moodExplanation } = req.body;

    const child = new Child({
      userId: req.user.id,
      name,
      dob,
      avatar,
      weight,
      allergies,
      other,
      moodExplanation,
    });

    await child.save();
    res.status(201).json(child);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Get all child profiles for logged-in user
router.get("/", authMiddleware, async (req, res) => {
  try {
    const children = await Child.find({
      $or: [{ userId: req.user.id }, { caregiverIds: req.user.id }],
    })
      .populate("caregiverIds", "username email role")
      .sort({ createdAt: -1 });
    res.json(children);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Update a child profile for the logged-in user
router.put("/:id", authMiddleware, async (req, res) => {
  try {
    const { name, dob, avatar, weight, allergies, other, moodExplanation } = req.body;

    const child = await Child.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { name, dob, avatar, weight, allergies, other, moodExplanation },
      { new: true, runValidators: true }
    );

    if (!child) {
      return res.status(404).json({ msg: "Child profile not found" });
    }

    res.json(child);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;