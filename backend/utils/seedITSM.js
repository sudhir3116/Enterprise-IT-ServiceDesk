const mongoose = require("mongoose");
const dotenv = require("dotenv");
const bcrypt = require("bcryptjs");
const User = require("../models/User");

dotenv.config();

const usersToSeed = [
  {
    name: "IT Requester Profile",
    email: "requester@itsm.com",
    mobileNumber: "+15551234501",
    role: "requester",
    department: "General",
    designation: "Staff Associate",
    employeeId: "EMP-1001",
    team: "General",
    accountStatus: "active",
  },
  {
    name: "IT Support Agent Profile",
    email: "agent@itsm.com",
    mobileNumber: "+15551234502",
    role: "agent",
    department: "IT Operations",
    designation: "Systems Engineer",
    employeeId: "EMP-2002",
    team: "Software",
    accountStatus: "active",
  },
  {
    name: "System Administrator Profile",
    email: "admin@itsm.com",
    mobileNumber: "+15551234503",
    role: "admin",
    department: "Administration",
    designation: "Principal Admin",
    employeeId: "EMP-3003",
    team: "General",
    accountStatus: "active",
  },
];

const seedDatabase = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || "mongodb://localhost:27017/itsm_db";
    console.log(`Connecting to MongoDB URI: ${mongoUri}`);
    await mongoose.connect(mongoUri);

    console.log("Cleaning existing testing accounts...");
    const emails = usersToSeed.map((u) => u.email);
    await User.deleteMany({ email: { $in: emails } });

    console.log("Hashing password for default accounts...");
    const hashedPassword = await bcrypt.hash("Helpdesk2026!", 10);

    console.log("Seeding new profiles...");
    for (const u of usersToSeed) {
      await User.create({
        ...u,
        password: hashedPassword,
      });
      console.log(`Created: ${u.name} (${u.role})`);
    }

    console.log("Database seeded successfully.");
    process.exit(0);
  } catch (error) {
    console.error("Failed to seed database:", error);
    process.exit(1);
  }
};

seedDatabase();
