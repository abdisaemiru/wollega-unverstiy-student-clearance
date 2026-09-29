/**
 * routes/students.js
 * ------------------------------------------------------------------
 *   GET  /api/students/:id   Fetch one student's profile
 *   PUT  /api/students/:id   Update a student's phone/email (or, for
 *                            admins, any field)
 * ------------------------------------------------------------------
 */
const express = require("express");
const Student = require("../models/Student");
const Clearance = require("../models/Clearance");
const { verifyToken } = require("../middleware/auth");

const router = express.Router();

// GET /api/students  (admin only: list every student, with clearance progress)
router.get("/", verifyToken, async (req, res) => {
  if (req.user.role !== "admin") return res.status(403).json({ message: "Admins only." });
  const students = await Student.find().sort({ createdAt: -1 });
  res.json(students);
});

// GET /api/students/:id
router.get("/:id", verifyToken, async (req, res) => {
  const studentId = req.params.id.toUpperCase();
  // Students may only view their own profile; staff may view anyone's.
  if (req.user.role === "student" && req.user.id !== studentId) {
    return res.status(403).json({ message: "You can only view your own profile." });
  }
  const student = await Student.findOne({ studentId });
  if (!student) return res.status(404).json({ message: "Student not found." });
  res.json(student);
});

// PUT /api/students/:id
router.put("/:id", verifyToken, async (req, res) => {
  const studentId = req.params.id.toUpperCase();
  if (req.user.role === "student" && req.user.id !== studentId) {
    return res.status(403).json({ message: "You can only update your own profile." });
  }
  const allowedFields = req.user.role === "student" ? ["phone", "email"] : ["phone", "email", "department", "college", "program", "graduationYear", "gender", "name"];
  const updates = {};
  allowedFields.forEach(field => {
    if (req.body[field] !== undefined) updates[field] = req.body[field];
  });

  const student = await Student.findOneAndUpdate({ studentId }, updates, { new: true });
  if (!student) return res.status(404).json({ message: "Student not found." });
  res.json(student);
});

module.exports = router;
