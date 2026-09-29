/**
 * seed.js
 * ------------------------------------------------------------------
 * Run with `npm run seed` after your .env is set up. Creates the
 * demo staff accounts (admin + two department officers) and one
 * sample fully-cleared student, so the system has something to log
 * in with immediately. Safe to re-run — it skips accounts that
 * already exist.
 * ------------------------------------------------------------------
 */
require("dotenv").config();
const connectDB = require("./config/db");
const Staff = require("./models/Staff");
const Student = require("./models/Student");
const Clearance = require("./models/Clearance");
const { CLEARANCE_OFFICES } = require("./config/offices");

const DEMO_STAFF = [
  { staffId: "admin", password: "admin123", name: "Registrar Admin Office", role: "admin" },
  { staffId: "library01", password: "officer123", name: "Alemu Fikru", role: "officer", office: "Library" },
  { staffId: "finance01", password: "officer123", name: "Kebede Worku", role: "officer", office: "Finance" }
];

const DEMO_STUDENT = {
  studentId: "WU2026002",
  password: "student123",
  name: "Biftu Tesfaye Girma",
  gender: "Female",
  department: "Computer Science",
  college: "College of Computing and Informatics",
  program: "Computer Science",
  graduationYear: "2026",
  phone: "+251 91 876 5432",
  email: "biftu.tesfaye@wu.edu.et",
  avatarInitials: "BT"
};

async function run() {
  await connectDB();

  for (const staff of DEMO_STAFF) {
    const exists = await Staff.findOne({ staffId: staff.staffId });
    if (!exists) {
      await Staff.create(staff);
      console.log(`Created staff account: ${staff.staffId}`);
    }
  }

  let student = await Student.findOne({ studentId: DEMO_STUDENT.studentId });
  if (!student) {
    student = await Student.create(DEMO_STUDENT);
    console.log(`Created demo student: ${student.studentId}`);
  }

  for (const office of CLEARANCE_OFFICES) {
    const exists = await Clearance.findOne({ studentId: student.studentId, office });
    if (!exists) {
      await Clearance.create({ studentId: student.studentId, office, status: "Approved", comment: "Cleared.", date: "2026-05-20" });
    }
  }

  console.log("Seeding complete.");
  process.exit(0);
}

run().catch(err => {
  console.error("Seeding failed:", err);
  process.exit(1);
});
