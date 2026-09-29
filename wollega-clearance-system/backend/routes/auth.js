/**
 * routes/auth.js
 * ------------------------------------------------------------------
 *   POST /api/auth/register        Create a new student account
 *   POST /api/auth/login/student   Student login
 *   POST /api/auth/login/staff     Admin / department officer login
 * ------------------------------------------------------------------
 */
const express = require("express");
const jwt = require("jsonwebtoken");
const Student = require("../models/Student");
const Staff = require("../models/Staff");
const Clearance = require("../models/Clearance");
const { CLEARANCE_OFFICES } = require("../config/offices");

const router = express.Router();

function signToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "7d" });
}

function initials(name) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(part => part[0].toUpperCase())
    .join("");
}

// ---- POST /api/auth/register ------------------------------------------
router.post("/register", async (req, res) => {
  try {
    const { studentId, password, name, gender, department, college, program, graduationYear, phone, email } = req.body;

    if (!studentId || !password || !name || !department || !college || !program || !graduationYear || !phone || !email) {
      return res.status(400).json({ message: "Please fill in every field before submitting." });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters." });
    }

    const existing = await Student.findOne({ studentId: studentId.trim().toUpperCase() });
    if (existing) {
      return res.status(409).json({ message: "An account with this Student ID already exists." });
    }

    const student = await Student.create({
      studentId: studentId.trim().toUpperCase(),
      password,
      name: name.trim(),
      gender: gender || "Other",
      department,
      college,
      program,
      graduationYear,
      phone,
      email,
      avatarInitials: initials(name)
    });

    // Every new student starts with one Pending clearance record per office.
    await Clearance.insertMany(
      CLEARANCE_OFFICES.map(office => ({ studentId: student.studentId, office })),
      { ordered: false }
    ).catch(() => {}); // ignore duplicate-key races on repeated calls

    const token = signToken({ id: student.studentId, role: "student" });
    res.status(201).json({ token, student });
  } catch (err) {
    res.status(500).json({ message: "Registration failed.", error: err.message });
  }
});

// ---- POST /api/auth/login/student --------------------------------------
router.post("/login/student", async (req, res) => {
  try {
    const { studentId, password } = req.body;
    if (!studentId || !password) {
      return res.status(400).json({ message: "Please enter both your student ID and password." });
    }
    const student = await Student.findOne({ studentId: studentId.trim().toUpperCase() });
    if (!student) {
      return res.status(404).json({ message: "No student account found with that ID." });
    }
    const valid = await student.comparePassword(password);
    if (!valid) {
      return res.status(401).json({ message: "Incorrect password. Please try again." });
    } 
    const token = signToken({ id: student.studentId, role: "student" });
    res.json({ token, student });
  } catch (err) {
    res.status(500).json({ message: "Login failed.", error: err.message });
  }
});

// ---- POST /api/auth/login/staff ----------------------------------------
router.post("/login/staff", async (req, res) => {
  try {
    const { staffId, password } = req.body;
    if (!staffId || !password) {
      return res.status(400).json({ message: "Please enter both your staff ID and password." });
    }
    const staff = await Staff.findOne({ staffId: staffId.trim().toLowerCase() });
    if (!staff) {
      return res.status(404).json({ message: "No staff account found with that ID." });
    }
    const valid = await staff.comparePassword(password);
    if (!valid) {
      return res.status(401).json({ message: "Incorrect password. Please try again." });
    }
    const token = signToken({ id: staff.staffId, role: staff.role, office: staff.office });
    res.json({ token, staff });
  } catch (err) {
    res.status(500).json({ message: "Login failed.", error: err.message });
  }
});

module.exports = router;
