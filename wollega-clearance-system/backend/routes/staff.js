const express = require("express");
const Staff = require("../models/Staff");
const { verifyToken } = require("../middleware/auth");

const router = express.Router();

// GET /api/staff/:id
router.get("/:id", verifyToken, async (req, res) => {
  const staff = await Staff.findOne({ staffId: req.params.id.toLowerCase() });
  if (!staff) return res.status(404).json({ message: "Staff member not found." });
  res.json(staff);
});

module.exports = router;
