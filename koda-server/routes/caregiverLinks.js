const express = require("express");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const User = require("../models/user");
const Child = require("../models/Child");
const CaregiverLink = require("../models/CaregiverLink");

const router = express.Router();

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

const requireRole = (role) => async (req, res, next) => {
  const user = await User.findById(req.user.id);
  if (!user || user.role !== role) {
    return res.status(403).json({ msg: `Only ${role} accounts can do this.` });
  }
  req.currentUser = user;
  next();
};

// Letters and numbers only, no ambiguous 0/O/1/I characters.
const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const generateCode = () => {
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += CODE_CHARS[crypto.randomInt(CODE_CHARS.length)];
  }
  return code;
};

const generateUniqueCode = async () => {
  let code;
  let existing;
  do {
    code = generateCode();
    existing = await User.findOne({ linkCode: code });
  } while (existing);
  return code;
};

// Keeps Child.caregiverIds in sync with an approved link's sharedChildren list.
const syncSharedChildren = async (parentId, caregiverId, sharedChildIds) => {
  const sharedSet = new Set(sharedChildIds.map((id) => id.toString()));
  const children = await Child.find({ userId: parentId });

  await Promise.all(
    children.map((child) => {
      const isShared = sharedSet.has(child._id.toString());
      const alreadyLinked = child.caregiverIds.some((id) => id.toString() === caregiverId.toString());

      if (isShared && !alreadyLinked) {
        child.caregiverIds.push(caregiverId);
        return child.save();
      }
      if (!isShared && alreadyLinked) {
        child.caregiverIds = child.caregiverIds.filter((id) => id.toString() !== caregiverId.toString());
        return child.save();
      }
      return null;
    })
  );
};

// Removes a caregiver from every one of the parent's children.
const clearSharedChildren = (parentId, caregiverId) => syncSharedChildren(parentId, caregiverId, []);

// Parent: get (and lazily create) their own link code.
router.get("/code", authMiddleware, requireRole("parent"), async (req, res) => {
  try {
    const user = req.currentUser;
    if (!user.linkCode) {
      user.linkCode = await generateUniqueCode();
      await user.save();
    }
    res.json({ code: user.linkCode });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Could not fetch link code." });
  }
});

// Parent: regenerate their link code.
router.post("/code/regenerate", authMiddleware, requireRole("parent"), async (req, res) => {
  try {
    const user = req.currentUser;
    user.linkCode = await generateUniqueCode();
    await user.save();
    res.json({ code: user.linkCode });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Could not regenerate link code." });
  }
});

// Caregiver: redeem a parent's link code, creating a pending request.
router.post("/redeem", authMiddleware, requireRole("caregiver"), async (req, res) => {
  try {
    const code = String(req.body.code || "").trim().toUpperCase();
    if (!code || code.length !== 6) {
      return res.status(400).json({ msg: "Enter the 6-character code from the parent's account." });
    }

    const parent = await User.findOne({ linkCode: code, role: "parent" });
    if (!parent) {
      return res.status(404).json({ msg: "That code doesn't match any parent account." });
    }

    let link = await CaregiverLink.findOne({ parentId: parent._id, caregiverId: req.currentUser._id });
    if (link) {
      if (link.status === "denied") {
        link.status = "pending";
        link.sharedChildren = [];
        await link.save();
      }
    } else {
      link = await CaregiverLink.create({
        parentId: parent._id,
        caregiverId: req.currentUser._id,
        status: "pending",
      });
    }

    res.json({ ok: true, status: link.status });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Could not submit that code." });
  }
});

// Caregiver: view their current link status and any shared children.
router.get("/mine", authMiddleware, requireRole("caregiver"), async (req, res) => {
  try {
    const link = await CaregiverLink.findOne({ caregiverId: req.currentUser._id })
      .sort({ updatedAt: -1 })
      .populate("parentId", "username email")
      .populate("sharedChildren", "name avatar");

    if (!link) return res.json(null);

    res.json({
      id: link._id,
      status: link.status,
      parent: link.parentId ? { id: link.parentId._id, username: link.parentId.username } : null,
      sharedChildren: link.sharedChildren,
      chatPermissions: link.chatPermissions,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Could not fetch your link status." });
  }
});

// Parent: view all caregiver requests/links plus their own children for toggle UI.
router.get("/requests", authMiddleware, requireRole("parent"), async (req, res) => {
  try {
    const links = await CaregiverLink.find({ parentId: req.currentUser._id })
      .populate("caregiverId", "username email")
      .sort({ createdAt: -1 });

    const children = await Child.find({ userId: req.currentUser._id }, "name avatar");

    res.json({
      children,
      links: links.map((link) => ({
        id: link._id,
        status: link.status,
        caregiver: link.caregiverId ? { id: link.caregiverId._id, username: link.caregiverId.username, email: link.caregiverId.email } : null,
        sharedChildren: link.sharedChildren.map((id) => id.toString()),
        chatPermissions: link.chatPermissions,
      })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Could not fetch caregiver requests." });
  }
});

// Parent: approve a pending request and choose which children to share.
router.post("/:linkId/approve", authMiddleware, requireRole("parent"), async (req, res) => {
  try {
    const link = await CaregiverLink.findOne({ _id: req.params.linkId, parentId: req.currentUser._id });
    if (!link) return res.status(404).json({ msg: "Request not found." });

    const requested = Array.isArray(req.body.sharedChildren) ? req.body.sharedChildren : [];
    const ownedChildren = await Child.find({ userId: req.currentUser._id, _id: { $in: requested } }, "_id");
    const validIds = ownedChildren.map((c) => c._id);

    link.status = "approved";
    link.sharedChildren = validIds;
    await link.save();

    await syncSharedChildren(req.currentUser._id, link.caregiverId, validIds);

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Could not approve caregiver." });
  }
});

// Parent: deny a pending (or previously approved) request.
router.post("/:linkId/deny", authMiddleware, requireRole("parent"), async (req, res) => {
  try {
    const link = await CaregiverLink.findOne({ _id: req.params.linkId, parentId: req.currentUser._id });
    if (!link) return res.status(404).json({ msg: "Request not found." });

    link.status = "denied";
    link.sharedChildren = [];
    await link.save();

    await clearSharedChildren(req.currentUser._id, link.caregiverId);

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Could not deny caregiver." });
  }
});

router.patch("/:linkId/chat-permissions",
  authMiddleware,
  requireRole("parent"),
  async (req, res) => {
    try {
      const link = await CaregiverLink.findOne({
        _id: req.params.linkId,
        parentId: req.currentUser._id,
        status: "approved",
      });

      if (!link) {
        return res.status(404).json({ msg: "Approved caregiver link not found." });
      }

      const allowed = ["enabled", "photos", "voice", "urgent"];
      for (const key of allowed) {
        if (req.body[key] !== undefined) {
          if (typeof req.body[key] !== "boolean") {
            return res.status(400).json({ msg: `${key} must be true or false.` });
          }
          link.set(`chatPermissions.${key}`, req.body[key]);
        }
      }

      await link.save();
      res.json({ chatPermissions: link.chatPermissions });
    } catch (err) {
      console.error(err);
      res.status(500).json({ msg: "Could not update chat permissions." });
    }
  }
);
// Parent: toggle which children an already-approved caregiver can access.
router.patch("/:linkId/children", authMiddleware, requireRole("parent"), async (req, res) => {
  try {
    const link = await CaregiverLink.findOne({ _id: req.params.linkId, parentId: req.currentUser._id });
    if (!link || link.status !== "approved") {
      return res.status(404).json({ msg: "Approved caregiver link not found." });
    }

    const requested = Array.isArray(req.body.sharedChildren) ? req.body.sharedChildren : [];
    const ownedChildren = await Child.find({ userId: req.currentUser._id, _id: { $in: requested } }, "_id");
    const validIds = ownedChildren.map((c) => c._id);

    link.sharedChildren = validIds;
    await link.save();

    await syncSharedChildren(req.currentUser._id, link.caregiverId, validIds);

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Could not update shared children." });
  }
});

// Parent: revoke a caregiver link entirely.
router.delete("/:linkId", authMiddleware, requireRole("parent"), async (req, res) => {
  try {
    const link = await CaregiverLink.findOne({ _id: req.params.linkId, parentId: req.currentUser._id });
    if (!link) return res.status(404).json({ msg: "Request not found." });

    await clearSharedChildren(req.currentUser._id, link.caregiverId);
    await link.deleteOne();

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Could not remove caregiver." });
  }
});

module.exports = router;
