/**
 * server.js
 * ------------------------------------------------------------------
 * Entry point for the Wollega University Clearance System API.
 * Run `npm install` then `npm start` inside /backend (after copying
 * .env.example to .env and setting MONGODB_URI + JWT_SECRET).
 * ------------------------------------------------------------------
 */
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");

const authRoutes = require("./routes/auth");
const studentRoutes = require("./routes/students");
const staffRoutes = require("./routes/staff");
const clearanceRoutes = require("./routes/clearances");
const requestRoutes = require("./routes/requests");
const notificationRoutes = require("./routes/notifications");

const app = express();

const allowedOrigins = (process.env.CORS_ORIGIN || "").split(",").map(s => s.trim()).filter(Boolean);
app.use(
  cors({
    origin: allowedOrigins.length ? allowedOrigins : true
  })
);
app.use(express.json());

app.get("/api/health", (_req, res) => res.json({ status: "ok", service: "wollega-clearance-backend" }));

app.use("/api/auth", authRoutes);
app.use("/api/students", studentRoutes);
app.use("/api/staff", staffRoutes);
app.use("/api/clearances", clearanceRoutes);
app.use("/api/requests", requestRoutes);
app.use("/api/notifications", notificationRoutes);

// Fallback error handler so unexpected errors return JSON, not an HTML stack trace.
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ message: "Something went wrong on the server." });
});

const PORT = process.env.PORT || 5000;

connectDB()
  .then(() => {
    app.listen(PORT, () => console.log(`Wollega Clearance API running on http://localhost:${PORT}`));
  })
  .catch(err => {
    console.error("Failed to connect to MongoDB:", err.message);
    process.exit(1);
  });
