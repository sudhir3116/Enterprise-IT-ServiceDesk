require("/Users/sudhir31/Documents/VSCode/Projects/Product Support Portal/backend/node_modules/dotenv").config({
  path: "/Users/sudhir31/Documents/VSCode/Projects/Product Support Portal/backend/.env",
});

const mongoose = require("/Users/sudhir31/Documents/VSCode/Projects/Product Support Portal/backend/node_modules/mongoose");
const bcrypt = require("/Users/sudhir31/Documents/VSCode/Projects/Product Support Portal/backend/node_modules/bcryptjs");

const User = require("../models/User");
const Organization = require("../models/Organization");
const Ticket = require("../models/Ticket");
const SlaPolicy = require("../models/SlaPolicy");
const BugReport = require("../models/BugReport");
const ProductFeedback = require("../models/ProductFeedback");
const KnowledgeArticle = require("../models/KnowledgeArticle");

async function seedDemoData() {
  console.log("=== SEEDING CARTRABBIT COMMERCE DEMO ENVIRONMENT ===");

  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB Atlas.");

    // 1. Create or Find Organization: Cartrabbit Commerce
    let org = await Organization.findOne({ slug: "cartrabbit-commerce" });
    if (!org) {
      org = await Organization.create({
        name: "Cartrabbit Commerce",
        slug: "cartrabbit-commerce",
        domain: "cartrabbit.com",
        plan: "enterprise",
        maxUsers: 100,
        status: "active",
      });
      console.log("  -> Organization created: Cartrabbit Commerce");
    } else {
      console.log("  -> Found existing Organization: Cartrabbit Commerce");
    }

    const hashedPassword = await bcrypt.hash("Password123!", 10);

    // 2. Seed Core Users
    const usersData = [
      {
        name: "Cartrabbit Admin",
        email: "demo.admin@example.com",
        mobileNumber: "9876543210",
        password: hashedPassword,
        role: "admin",
        accountStatus: "active",
        isApproved: true,
        department: "Engineering Leadership",
        designation: "VP of Product Support",
        organizationId: org._id,
      },
      {
        name: "Support Engineer Alex",
        email: "demo.agent@example.com",
        mobileNumber: "9876543211",
        password: hashedPassword,
        role: "support_engineer",
        accountStatus: "active",
        isApproved: true,
        department: "Product Support",
        designation: "Senior Support Engineer",
        team: "Software",
        organizationId: org._id,
      },
      {
        name: "Developer Chris",
        email: "demo.dev@example.com",
        mobileNumber: "9876543212",
        password: hashedPassword,
        role: "developer",
        accountStatus: "active",
        isApproved: true,
        department: "Platform Engineering",
        designation: "Lead Backend Developer",
        organizationId: org._id,
      },
      {
        name: "Merchant User (Shopify Store)",
        email: "demo.requester@example.com",
        mobileNumber: "9876543213",
        password: hashedPassword,
        role: "customer",
        accountStatus: "active",
        isApproved: true,
        department: "E-commerce Operations",
        designation: "Store Owner",
        organizationId: org._id,
      },
    ];

    const seededUsers = {};
    for (const uData of usersData) {
      let user = await User.findOne({ email: uData.email });
      if (!user) {
        user = await User.create(uData);
      } else {
        user.organizationId = org._id;
        user.role = uData.role;
        user.accountStatus = "active";
        user.isApproved = true;
        await user.save();
      }
      seededUsers[uData.role] = user;
      console.log(`  -> User ready: ${uData.email} (${uData.role})`);
    }

    // 3. Seed SLA Policy
    let sla = await SlaPolicy.findOne({ organizationId: org._id, name: "Enterprise Critical SLA" });
    if (!sla) {
      sla = await SlaPolicy.create({
        organizationId: org._id,
        name: "Enterprise Critical SLA",
        priority: "Critical",
        firstResponseTime: 30, // 30 minutes
        resolutionTime: 240, // 4 hours
        businessHours: false, // 24/7
        isActive: true,
        createdBy: seededUsers.admin._id,
      });
      console.log("  -> SLA Policy created: Enterprise Critical SLA");
    }

    // 4. Seed Knowledge Articles
    let article1 = await KnowledgeArticle.findOne({ organizationId: org._id, title: "Troubleshooting WooCommerce Sync Failures" });
    if (!article1) {
      article1 = await KnowledgeArticle.create({
        organizationId: org._id,
        title: "Troubleshooting WooCommerce Sync Failures",
        slug: `troubleshooting-woocommerce-sync-failures-${Date.now()}`,
        summary: "Step-by-step resolution guide for webhook sync delays between WooCommerce and Cartrabbit Commerce.",
        content: `## Issue Overview\nWhen high transaction volume occurs on WooCommerce stores, webhook delivery timeouts can lead to inventory sync delays.\n\n## Root Cause\nPHP execution limits on WooCommerce servers timing out during batch payload posts.\n\n## Solution Steps\n1. Increase PHP \`max_execution_time\` to 60s.\n2. Enable HTTP/2 multiplexing in Cartrabbit integration settings.\n3. Verify API Secret Key in Cartrabbit Dashboard.`,
        category: "Troubleshooting",
        visibility: "public",
        status: "published",
        author: seededUsers.admin._id,
        tags: ["WooCommerce", "Sync", "Webhooks"],
      });
      console.log("  -> Knowledge Article created: Troubleshooting WooCommerce Sync Failures");
    }

    // 5. Seed Realistic eCommerce Tickets
    const ticket1 = await Ticket.create({
      ticketNumber: `TKT-${Math.floor(1000 + Math.random() * 9000)}`,
      organizationId: org._id,
      createdBy: seededUsers.customer._id,
      title: "Shopify Checkout Webhook Sync Failing on High Volume",
      description: "During our weekend flash sale, several checkout payload webhooks returned 500 error codes. Inventory count failed to decrement in real-time.",
      category: "Software",
      priority: "Critical",
      impact: "High",
      urgency: "High",
      status: "In Progress",
      assignedTo: seededUsers.support_engineer._id,
      environment: {
        browser: "Chrome 122.0",
        OS: "macOS Sonoma",
        device: "Desktop",
      },
      issueDetails: {
        stepsToReproduce: "1. Trigger 500 parallel checkout webhooks\n2. Observe response payload\n3. 500 Server Error displayed",
        expectedBehavior: "All webhooks should process within 200ms.",
        actualBehavior: "Queue worker memory leak causing timeout after 50 requests.",
      },
      investigation: {
        issueType: "Bug",
        severity: "Critical",
        reproducible: "Yes",
        appVersion: "v3.4.2",
        technicalNotes: "Stack trace shows unhandled promise rejection in Redis queue consumer batch handler.",
        investigatedBy: seededUsers.support_engineer._id,
        investigatedAt: new Date(),
      },
    });
    console.log(`  -> Ticket created: ${ticket1.ticketNumber} (Critical)`);

    const ticket2 = await Ticket.create({
      ticketNumber: `TKT-${Math.floor(1000 + Math.random() * 9000)}`,
      organizationId: org._id,
      createdBy: seededUsers.customer._id,
      title: "Cartrabbit API Rate Limit Exceeded during Flash Sale",
      description: "API returns 429 Too Many Requests response code when triggering store inventory batch update endpoint.",
      category: "Software",
      priority: "High",
      impact: "High",
      urgency: "Medium",
      status: "Resolved",
      assignedTo: seededUsers.support_engineer._id,
      resolutionSummary: "Increased enterprise burst quota limit to 500 req/min for merchant account.",
      resolvedAt: new Date(),
    });
    console.log(`  -> Ticket created: ${ticket2.ticketNumber} (Resolved)`);

    // 6. Seed Linked Bug Report
    const bug = await BugReport.create({
      bugNumber: `BUG-${Math.floor(1000 + Math.random() * 9000)}`,
      ticketId: ticket1._id,
      organizationId: org._id,
      createdBy: seededUsers.support_engineer._id,
      title: "Async Redis queue memory leak during webhook batch ingestion",
      description: "Batch handler leaks unclosed socket connections during peak throughput exceeding 50 req/sec.",
      severity: "Critical",
      reproductionSteps: "1. Trigger 500 concurrent webhooks\n2. Monitor Redis memory pool\n3. Memory leaks at 100MB/min",
      expectedBehaviour: "Memory should stay flat under constant throughput.",
      actualBehaviour: "Redis worker process crashes after 5 minutes.",
      assignedDeveloper: seededUsers.developer._id,
      status: "In Progress",
      comments: [
        {
          text: "Isolated memory leakage to socket connection pool reuse in queueWorker.js line 84.",
          author: seededUsers.developer._id,
          authorName: seededUsers.developer.name,
          isInternal: true,
        },
      ],
    });

    // Link bug to ticket
    ticket1.bugReportIds = [bug._id];
    await ticket1.save();
    console.log(`  -> Bug Report created: ${bug.bugNumber} (Linked to ${ticket1.ticketNumber})`);

    // 7. Seed Product Feedback Request
    const feedback = await ProductFeedback.create({
      organizationId: org._id,
      createdBy: seededUsers.customer._id,
      title: "Support GraphQL Subscriptions for Real-Time Inventory Updates",
      description: "Webhooks introduce HTTP overhead. GraphQL WebSocket subscriptions would enable instant stock updates on storefronts.",
      category: "Feature Request",
      votes: [seededUsers.customer._id, seededUsers.support_engineer._id, seededUsers.admin._id],
      status: "Planned",
      adminResponse: "Great idea! GraphQL WebSocket subscriptions are scheduled for Cartrabbit Platform v3.6 release.",
      respondedBy: seededUsers.admin._id,
      respondedAt: new Date(),
    });
    console.log(`  -> Product Feedback created: "${feedback.title}" (3 votes, Status: Planned)`);

    console.log("\n=== CARTRABBIT COMMERCE DEMO DATA SEEDED SUCCESSFULLY! ===");
    console.log("\nDemo Credentials:");
    console.log("  Admin:     demo.admin@gmail.com / Password123!");
    console.log("  Engineer:  demo.agent@gmail.com / Password123!");
    console.log("  Developer: demo.dev@gmail.com / Password123!");
    console.log("  Customer:  demo.requester@gmail.com / Password123!");

    process.exit(0);
  } catch (err) {
    console.error("❌ Seed Error:", err);
    process.exit(1);
  }
}

seedDemoData();
