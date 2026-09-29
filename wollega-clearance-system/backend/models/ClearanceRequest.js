const mongoose = require("mongoose");

const clearanceRequestSchema = new mongoose.Schema(
  {
    studentId: { type: String, required: true, index: true },
    fullName: { type: String, required: true },
    department: { type: String, required: true },
    college: { type: String, required: true },
    program: { type: String, required: true },
    graduationYear: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String, required: true },
    reason: { type: String, required: true }
  },
  { timestamps: { createdAt: "submittedAt", updatedAt: false } }
);

module.exports = mongoose.model("ClearanceRequest", clearanceRequestSchema);
