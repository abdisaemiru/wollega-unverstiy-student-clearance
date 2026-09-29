const mongoose = require("mongoose");

const clearanceSchema = new mongoose.Schema(
  {
    studentId: { type: String, required: true, index: true },
    office: {
      type: String,
      required: true,
      enum: ["Library", "Finance", "Registrar", "Department", "College", "Student Affairs", "Cafeteria", "Dormitory", "ICT", "Property/Store"]
    },
    status: { type: String, enum: ["Pending", "Approved", "Rejected"], default: "Pending" },
    comment: { type: String, default: "Awaiting review." },
    date: { type: String, default: "-" } // display date string, set when an officer acts
  },
  { timestamps: true }
);

clearanceSchema.index({ studentId: 1, office: 1 }, { unique: true });

module.exports = mongoose.model("Clearance", clearanceSchema);
