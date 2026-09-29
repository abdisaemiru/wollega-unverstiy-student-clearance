const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    studentId: { type: String, required: true, index: true },
    type: { type: String, enum: ["approved", "rejected", "submitted", "message", "announcement"], required: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    date: { type: String, required: true },
    read: { type: Boolean, default: false }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Notification", notificationSchema);
