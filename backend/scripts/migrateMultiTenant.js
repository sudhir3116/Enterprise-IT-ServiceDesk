require("dotenv").config({ path: __dirname + "/../.env" });
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const Organization = require("../models/Organization");
const User = require("../models/User");
const Ticket = require("../models/Ticket");

async function migrateMultiTenant() {
  try {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
      console.error("MONGO_URI is missing in .env");
      process.exit(1);
    }

    console.log("[Migration] Connecting to MongoDB...");
    await mongoose.connect(mongoUri);

    // 1. Provision Default Organization
    console.log("[Migration] Ensuring Default Organization exists...");
    let defaultOrg = await Organization.findOne({ slug: "acme-global" });
    if (!defaultOrg) {
      defaultOrg = await Organization.create({
        name: "Acme Global Enterprise",
        slug: "acme-global",
        domain: "acme.com",
        plan: "enterprise",
        status: "active",
        maxUsers: 500,
        maxAgents: 50,
        settings: {
          brandColor: "#2563eb",
          logoUrl: "",
          allowSelfSignup: true,
        },
      });
      console.log(`[Migration] Created Default Organization: ${defaultOrg.name} (${defaultOrg._id})`);
    } else {
      console.log(`[Migration] Existing Organization found: ${defaultOrg.name} (${defaultOrg._id})`);
    }

    // 2. Backfill Users missing organizationId
    console.log("[Migration] Backfilling User records with organizationId...");
    const userRes = await User.updateMany(
      { organizationId: { $exists: false } },
      { $set: { organizationId: defaultOrg._id } }
    );
    console.log(`[Migration] Updated ${userRes.modifiedCount || 0} user records.`);

    // 3. Backfill Tickets missing organizationId
    console.log("[Migration] Backfilling Ticket records with organizationId...");
    const ticketRes = await Ticket.updateMany(
      { organizationId: { $exists: false } },
      { $set: { organizationId: defaultOrg._id } }
    );
    console.log(`[Migration] Updated ${ticketRes.modifiedCount || 0} ticket records.`);

    // 4. Seed standard multi-tenant test accounts
    console.log("[Migration] Seeding/Updating multi-tenant test users...");
    const defaultPasswordHash = await bcrypt.hash("Password123!", 10);

    const testUsers = [
      {
        name: "Test Customer",
        email: "employee@company.com",
        mobileNumber: "9876543210",
        password: defaultPasswordHash,
        role: "customer",
        organizationId: defaultOrg._id,
        department: "Engineering",
        designation: "Software Engineer",
        employeeId: "EMP-10001",
        accountStatus: "active",
        isEmailVerified: true,
        authProvider: "local",
      },
      {
        name: "Test Support Engineer",
        email: "engineer@company.com",
        mobileNumber: "9876543211",
        password: defaultPasswordHash,
        role: "support_engineer",
        organizationId: defaultOrg._id,
        department: "IT Support",
        designation: "Senior Support Engineer",
        employeeId: "EMP-10002",
        accountStatus: "active",
        isEmailVerified: true,
        authProvider: "local",
      },
      {
        name: "Test Administrator",
        email: "admin@company.com",
        mobileNumber: "9876543212",
        password: defaultPasswordHash,
        role: "admin",
        organizationId: defaultOrg._id,
        department: "IT Operations",
        designation: "IT Administrator",
        employeeId: "EMP-10003",
        accountStatus: "active",
        isEmailVerified: true,
        authProvider: "local",
      },
    ];

    for (const u of testUsers) {
      await User.findOneAndUpdate({ email: u.email }, u, { upsert: true, returnDocument: "after" });
      console.log(`[Migration] Test user ready: ${u.email} (Role: ${u.role}, Org: ${defaultOrg.name})`);
    }

    console.log("[Migration] Multi-tenant migration and seeding completed successfully!");
    process.exit(0);
  } catch (err) {
    console.error("[Migration] Migration failed:", err);
    process.exit(1);
  }
}

migrateMultiTenant();
