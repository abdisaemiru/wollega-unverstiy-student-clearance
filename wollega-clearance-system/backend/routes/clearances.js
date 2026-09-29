/**
 * routes/clearances.js
 * ------------------------------------------------------------------
 *   GET   /api/clearances?studentId=      A student's own 10 records
 *   GET   /api/clearances?office=         An officer's queue for their office
 *   GET   /api/clearances                 Every record (admin only)
 *   PATCH /api/clearances/:id             Approve / reject (officer or admin)
 * ------------------------------------------------------------------
 */
const express = require("express");
const Clearance = require("../models/Clearance");
const Notification = require("../models/Notification");
const { verifyToken, requireRole } = require("../middleware/auth");

const router = express.Router();

// GET /api/clearances
router.get("/", verifyToken, async (req, res) => {
  const { studentId, office } = req.query;

  if (studentId) {
    const target = studentId.toUpperCase();
    if (req.user.role === "student" && req.user.id !== target) {
      return res.status(403).json({ message: "You can only view your own clearance records." });
    }
    const records = await Clearance.find({ studentId: target }).sort({ office: 1 });
    return res.json(records);
  }

  if (office) {
    if (req.user.role === "officer" && req.user.office !== office) {
      return res.status(403).json({ message: "You can only view your own office's queue." });
    }
    const records = await Clearance.find({ office }).sort({ createdAt: -1 });
    return res.json(records);
  }

  // No filter -> full list, admin only.
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Admins only." });
  }
  const records = await Clearance.find();
  res.json(records);
});

// PATCH /api/clearances/:id   body: { status: "Approved" | "Rejected", comment? }
router.patch("/:id", verifyToken, requireRole("admin", "officer"), async (req, res) => {
  const { status, comment } = req.body;
  if (!["Approved", "Rejected", "Pending"].includes(status)) {
    return res.status(400).json({ message: "Status must be Approved, Rejected, or Pending." });
  }

  const record = await Clearance.findById(req.params.id);
  if (!record) return res.status(404).json({ message: "Clearance record not found." });

  if (req.user.role === "officer" && req.user.office !== record.office) {
    return res.status(403).json({ message: "You can only act on requests for your own office." });
  }

  record.status = status;
  if (comment) record.comment = comment;
  record.date = new Date().toISOString().slice(0, 10);
  await record.save();

  await Notification.create({
    studentId: record.studentId,
    type: status === "Approved" ? "approved" : "rejected",
    title: `Clearance ${status.toLowerCase()}`,
    message: `${record.office} has ${status.toLowerCase()} your clearance request.`,
    date: record.date,
    read: false
  });

  res.json(record);
});

module.exports = router;
