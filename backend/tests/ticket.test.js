const request = require("supertest");
const express = require("express");
const mongoose = require("mongoose");
require("dotenv").config();

const authRoutes = require("../routes/authRoutes");
const ticketRoutes = require("../routes/ticketRoutes");
const { errorHandler } = require("../middleware/errorMiddleware");

const app = express();
app.use(express.json());
app.use("/api/auth", authRoutes);
app.use("/api/tickets", ticketRoutes);
app.use(errorHandler);

describe("Ticket Lifecycle Integration Tests", () => {
  let adminToken = "";
  let createdTicketId = "";

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGO_URI);
    }
    const loginRes = await request(app).post("/api/auth/login").send({
      email: "sudhir3116@gmail.com",
      password: "Password123!",
    });
    adminToken = loginRes.body.accessToken;
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  test("POST /api/tickets — Create a new support ticket", async () => {
    const res = await request(app)
      .post("/api/tickets")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        title: "Jest Automated Integration Ticket",
        description: "Testing ticket creation workflow via Jest test runner.",
        category: "Software",
        priority: "High",
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.ticket).toHaveProperty("ticketNumber");
    createdTicketId = res.body.ticket._id || res.body.ticket.id;
  });

  test("GET /api/tickets — List tickets with pagination & role scope", async () => {
    const res = await request(app)
      .get("/api/tickets?page=1&limit=10")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test("PUT /api/tickets/:id/investigation — Save investigation details", async () => {
    const res = await request(app)
      .put(`/api/tickets/${createdTicketId}/investigation`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        issueType: "Bug",
        severity: "Critical",
        reproducible: "Yes",
        technicalNotes: "Investigated via Jest test suite.",
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.investigation).toHaveProperty("issueType", "Bug");
  });
});
