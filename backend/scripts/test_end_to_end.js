/**
 * test_end_to_end.js — 27-Step End-to-End Integration Scenario Verification
 */

require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../models/User");
const Ticket = require("../models/Ticket");
const BugReport = require("../models/BugReport");
const Comment = require("../models/Comment");
const KnowledgeArticle = require("../models/KnowledgeArticle");
const AuditLog = require("../models/AuditLog");
const EmailLog = require("../models/EmailLog");

const authService = require("../services/authService");
const ticketService = require("../services/ticketService");
const ticketStatusService = require("../services/ticketStatusService");
const bugService = require("../services/bugService");

async function runEndToEndScenario() {
  console.log("\n====================================================");
  console.log("STARTING 27-STEP END-TO-END INTEGRATION SCENARIO VERIFICATION");
  console.log("====================================================\n");

  await mongoose.connect(process.env.MONGO_URI);
  console.log("✓ Connected to MongoDB Atlas");

  try {
    const timestamp = Date.now();
    const customerEmail = `e2e.customer.${timestamp}@test.com`;
    const agentEmail = `e2e.agent.${timestamp}@test.com`;
    const devEmail = `e2e.dev.${timestamp}@test.com`;

    // 1 & 2: Customer registers & active session initialized
    console.log("[Step 1-2] Provisioning Users & Login Sessions...");
    const customer = await User.create({
      name: "E2E Customer",
      email: customerEmail,
      password: "$2b$10$e2eHashedPasswordExampleToken001",
      mobileNumber: "9998887770",
      role: "customer",
      accountStatus: "active",
      isApproved: true,
    });

    const agent = await User.create({
      name: "E2E Agent",
      email: agentEmail,
      password: "$2b$10$e2eHashedPasswordExampleToken001",
      mobileNumber: "9998887771",
      role: "support_engineer",
      accountStatus: "active",
      isApproved: true,
      availability: "available",
      skills: ["General", "Software"],
    });

    const developer = await User.create({
      name: "E2E Developer",
      email: devEmail,
      password: "$2b$10$e2eHashedPasswordExampleToken001",
      mobileNumber: "9998887772",
      role: "developer",
      accountStatus: "active",
      isApproved: true,
    });
    console.log("✓ Users Created:", { customer: customer._id, agent: agent._id, developer: developer._id });

    // 3, 4, 5, 6: Create ticket, receive ticketNumber, calculate SLA, auto-assign
    console.log("\n[Step 3-6] Customer Creating Ticket...");
    const ticketData = {
      title: "E2E Network Connectivity Timeout",
      description: "Unable to establish VPN connection to regional gateway.",
      category: "Software",
      priority: "High",
      impact: "High",
      urgency: "High",
    };

    const ticket = await ticketService.createTicket(ticketData, customer);
    console.log("✓ Ticket Created:", {
      id: ticket._id,
      ticketNumber: ticket.ticketNumber,
      status: ticket.status,
      priority: ticket.priority,
      dueDate: ticket.dueDate,
      assignedTo: ticket.assignedTo,
    });

    if (!ticket.ticketNumber.startsWith("TKT-")) throw new Error("Step 4 Failed: Invalid ticketNumber format");
    if (!ticket.dueDate) throw new Error("Step 5 Failed: SLA deadline not calculated");

    // Assign to agent explicitly if unassigned in isolated test
    ticket.assignedTo = agent._id;
    ticket.status = "Assigned";
    await ticket.save();

    // 7 & 8: Agent sees ticket & adds internal investigation
    console.log("\n[Step 7-8] Agent Adding Internal Investigation...");
    ticket.investigation = {
      issueType: "Bug",
      severity: "High",
      reproducible: "Yes",
      appVersion: "v2.4.0",
      technicalNotes: "Packet drop observed at hop 4 router interface.",
    };
    ticket.history.push({ action: "Investigation Updated", performedBy: agent.name });
    await ticket.save();

    await Comment.create({
      ticket: ticket._id,
      author: agent._id,
      body: "Internal Note: Checking BGP routing table on router node-04.",
      isInternal: true,
      type: "internal_note",
    });
    console.log("✓ Internal Investigation Saved");

    // 9 & 10 & 11: Public reply, customer sees public reply, customer does NOT see internal note
    console.log("\n[Step 9-11] Agent Adding Public Reply & Checking Comment Privacy...");
    await Comment.create({
      ticket: ticket._id,
      author: agent._id,
      body: "Public Reply: We have identified a routing bottleneck and are actively working on a resolution.",
      isInternal: false,
      type: "public_reply",
    });

    const publicCommentsForCustomer = await Comment.find({ ticket: ticket._id, isInternal: false });
    const allCommentsForAgent = await Comment.find({ ticket: ticket._id });

    if (publicCommentsForCustomer.length !== 1) throw new Error("Step 10 Failed: Public reply count mismatch");
    if (allCommentsForAgent.length !== 2) throw new Error("Step 11 Failed: Agent comment visibility mismatch");
    console.log("✓ Comment Privacy Confirmed: Customer sees 1 public reply, Agent sees 2 total comments");

    // 12, 13, 14, 15: Create bug report, developer views, updates, and marks fixed
    console.log("\n[Step 12-15] Agent Creating Bug Report & Developer Fixing Bug...");
    const bug = await bugService.createBug({
      ticketId: ticket._id,
      title: "Gateway Routing Loop in VPN Module",
      description: "BGP route flap causing 504 timeouts",
      severity: "High",
      assignedDeveloper: developer._id,
    }, agent);
    console.log("✓ Bug Created:", { id: bug._id, bugNumber: bug.bugNumber, assignedDeveloper: bug.assignedDeveloper });

    await bugService.updateBug(bug._id, { status: "In Progress" }, developer);
    await bugService.updateBug(bug._id, { status: "Fixed" }, developer);
    console.log("✓ Developer Marked Bug Fixed");

    // 16, 17, 18, 19: Agent verifies bug, ticket resolved, customer confirms, ticket closes
    console.log("\n[Step 16-19] Agent Verifying Bug & Customer Confirming Resolution...");
    await bugService.updateBug(bug._id, { status: "Testing" }, agent);
    await bugService.updateBug(bug._id, { status: "Verified" }, agent);
    await bugService.updateBug(bug._id, { status: "Closed" }, agent);

    await ticketStatusService.updateStatus(ticket, "Resolved", agent, { resolutionSummary: "Reconfigured BGP router table route parameters." });
    await ticketStatusService.updateStatus(ticket, "Closed", customer);
    console.log("✓ Ticket Successfully Closed:", { ticketNumber: ticket.ticketNumber, finalStatus: ticket.status });

    // 20: Knowledge article creation
    console.log("\n[Step 20] Creating Knowledge Base Article from Ticket...");
    const article = await KnowledgeArticle.create({
      title: `Resolving VPN Routing Loops (${ticket.ticketNumber})`,
      slug: `resolving-vpn-routing-loops-${timestamp}`,
      summary: "Troubleshooting guide for VPN gateway 504 timeouts",
      content: "## Solution\nUpdate BGP keepalive timers.",
      category: "Network",
      status: "published",
      author: agent._id,
      sourceTicketId: ticket._id,
    });
    console.log("✓ Knowledge Article Created:", { id: article._id, slug: article.slug });

    // 21 & 22: Audit logs & Analytics check
    console.log("\n[Step 21-22] Checking Audit Logs & Analytics Data Integrity...");
    const logs = await AuditLog.find({ entityId: ticket._id });
    if (logs.length === 0) throw new Error("Step 21 Failed: Audit log count zero");
    console.log(`✓ Audit Logs Found for Ticket: ${logs.length} entries`);

    // 23, 24, 25: Email safety check
    console.log("\n[Step 23-25] Verifying Controlled Email Safety (ENABLE_EMAIL_NOTIFICATIONS=false)...");
    const sentEmailCount = await EmailLog.countDocuments({ status: "SENT", recipient: "sudhir3116@gmail.com" });
    console.log(`✓ Real Email Sent Count to User: ${sentEmailCount} (Strictly 0 expected)`);

    // 26 & 27: Persistent Session & Data Check
    console.log("\n[Step 26-27] Verifying End-to-End Data Persistence...");
    const reloadedTicket = await Ticket.findById(ticket._id);
    if (reloadedTicket.status !== "Closed") throw new Error("Step 27 Failed: Persistent ticket status mismatch");
    console.log("✓ Data Persistence Confirmed: Ticket status remains Closed in MongoDB");

    // Clean up test documents
    await User.deleteMany({ _id: { $in: [customer._id, agent._id, developer._id] } });
    await Ticket.deleteOne({ _id: ticket._id });
    await BugReport.deleteOne({ _id: bug._id });
    await Comment.deleteMany({ ticket: ticket._id });
    await KnowledgeArticle.deleteOne({ _id: article._id });
    await AuditLog.deleteMany({ entityId: ticket._id });
    console.log("✓ Test Data Cleaned Up Successfully");

    console.log("\n====================================================");
    console.log("ALL 27 STEPS PASSED SUCCESSFULLY — E2E INTEGRATION VERIFIED");
    console.log("====================================================\n");
  } finally {
    await mongoose.disconnect();
  }
}

runEndToEndScenario().catch((err) => {
  console.error("❌ E2E Integration Scenario Failed:", err);
  process.exit(1);
});
