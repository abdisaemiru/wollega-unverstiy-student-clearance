const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const staffSchema = new mongoose.Schema(
  {
    staffId: { type: String, required: true, unique: true, trim: true, lowercase: true },
    password: { type: String, required: true },
    name: { type: String, required: true },
    role: { type: String, enum: ["admin", "officer"], required: true },
    office: { type: String } // required only for officers
  },
  { timestamps: true }
);

staffSchema.pre("save", async function hashPassword(next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

staffSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.password);
};

staffSchema.set("toJSON", {
  transform: (_doc, ret) => {
    delete ret.password;
    return ret;
  }
});

module.exports = mongoose.model("Staff", staffSchema);
