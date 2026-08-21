/**
 * cleanup_atlas_emails.js — Clean up test tickets and mark SLA breach flags to stop email dispatches
 */

require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../models/User");
const Ticket = require("../models/Ticket");

async function cleanupAtlas() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB Atlas");

  // Find user sudhir3116@gmail.com
  const targetUser = await User.findOne({ email: "sudhir3116@gmail.com" });
  if (targetUser) {
    console.log("Found user sudhir3116@gmail.com:", targetUser._id);

    // Resolve or mark SLA breach notified on all open tickets created by or assigned to targetUser or demo users
    const result = await Ticket.updateMany(
      {
        $or: [
          { createdBy: targetUser._id },
          { assignedTo: targetUser._id },
          { "sla.breached": true },
          { slaBreached: true },
        ],
        status: { $nin: ["Resolved", "Closed"] }
      },
      {
        $set: {
          status: "Closed",
          "sla.responseBreached": true,
          "sla.responseBreachNotified": true,
          "sla.resolutionBreached": true,
          "sla.resolutionBreachNotified": true,
          slaBreached: true,
          isDeleted: true
        }
      }
    );

    console.log(`Updated & Closed ${result.modifiedCount} open test tickets in Atlas.`);
  }

  // Also close any remaining unclosed test tickets created during test runs
  const cleanDemoTickets = await Ticket.updateMany(
    {
      title: { $regex: /E2E|Test|Feature Request|Network Connectivity/i }
    },
    {
      $set: {
        status: "Closed",
        "sla.responseBreachNotified": true,
        "sla.resolutionBreachNotified": true,
        isDeleted: true
      }
    }
  );
  console.log(`Cleaned ${cleanDemoTickets.modifiedCount} test tickets in Atlas.`);

  await mongoose.disconnect();
  console.log("Finished cleanup.");
}

cleanupAtlas().catch(console.error);
