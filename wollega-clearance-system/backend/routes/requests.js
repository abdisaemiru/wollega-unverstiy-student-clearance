const express = require("express");
const ClearanceRequest = require("../models/ClearanceRequest");
const Notification = require("../models/Notification");
const { verifyToken, requireRole } = require("../middleware/auth");

const router = express.Router();

// POST /api/requests
router.post("/", verifyToken, requireRole("student"), async (req, res) => {
  const { fullName, department, college, program, graduationYear, phone, email, reason } = req.body;
  if (!reason || !reason.trim()) {
    return res.status(400).json({ message: "Please describe your reason for requesting clearance." });
  }

  const request = await ClearanceRequest.create({
    studentId: req.user.id,
    fullName,
    department,
    college,
    program,
    graduationYear,
    phone,
    email,
    reason: reason.trim()
  });

  await Notification.create({
    studentId: req.user.id,
    type: "submitted",
    title: "Clearance request submitted",
    message: "Your clearance request has been submitted and is now pending review.",
    date: new Date().toISOString().slice(0, 10),
    read: false
  });

  res.status(201).json(request);
});

// GET /api/requests  (admin only)
router.get("/", verifyToken, requireRole("admin"), async (_req, res) => {
  const requests = await ClearanceRequest.find().sort({ submittedAt: -1 });
  res.json(requests);
});

module.exports = router;
