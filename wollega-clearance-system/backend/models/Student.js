const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const studentSchema = new mongoose.Schema(
  {
    studentId: { type: String, required: true, unique: true, trim: true, uppercase: true },
    password: { type: String, required: true }, // stored as a bcrypt hash, never plain text
    name: { type: String, required: true, trim: true },
    gender: { type: String, enum: ["Male", "Female", "Other"], default: "Other" },
    department: { type: String, required: true },
    college: { type: String, required: true },
    program: { type: String, required: true },
    graduationYear: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    avatarInitials: { type: String }
  },
  { timestamps: true }
);

// Hash the password automatically whenever it is set or changed.
studentSchema.pre("save", async function hashPassword(next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

studentSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.password);
};

// Never leak the password hash to API responses.
studentSchema.set("toJSON", {
  transform: (_doc, ret) => {
    delete ret.password;
    return ret;
  }
});

module.exports = mongoose.model("Student", studentSchema);
