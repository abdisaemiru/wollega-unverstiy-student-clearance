const express = require("express");
const Notification = require("../models/Notification");
const { verifyToken } = require("../middleware/auth");

const router = express.Router();

// GET /api/notifications?studentId=
router.get("/", verifyToken, async (req, res) => {
  const { studentId } = req.query;
  const target = (studentId || req.user.id).toUpperCase();
  if (req.user.role === "student" && req.user.id !== target) {
    return res.status(403).json({ message: "You can only view your own notifications." });
  }
  const notifications = await Notification.find({ studentId: target }).sort({ createdAt: -1 });
  res.json(notifications);
});

// PATCH /api/notifications/:id/read
router.patch("/:id/read", verifyToken, async (req, res) => {
  const notification = await Notification.findByIdAndUpdate(req.params.id, { read: true }, { new: true });
  if (!notification) return res.status(404).json({ message: "Notification not found." });
  res.json(notification);
});

module.exports = router;
