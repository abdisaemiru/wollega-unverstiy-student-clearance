/**
 * config/db.js
 * ------------------------------------------------------------------
 * Opens the Mongoose connection to MongoDB using MONGODB_URI from
 * the environment. Called once when the server starts.
 * ------------------------------------------------------------------
 */
const mongoose = require("mongoose");

async function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is not set. Copy .env.example to .env and fill it in.");
  }
  mongoose.set("strictQuery", true);
  await mongoose.connect(uri);
  console.log(`MongoDB connected -> ${mongoose.connection.name}`);
}

module.exports = connectDB;
