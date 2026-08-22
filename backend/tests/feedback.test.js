const request = require("supertest");
const express = require("express");
const mongoose = require("mongoose");
require("dotenv").config();

const authRoutes = require("../routes/authRoutes");
const feedbackRoutes = require("../routes/feedbackRoutes");
const { errorHandler } = require("../middleware/errorMiddleware");

const app = express();
app.use(express.json());
app.use("/api/auth", authRoutes);
app.use("/api/feedback", feedbackRoutes);
app.use(errorHandler);

describe("Product Feedback Integration Tests", () => {
  let adminToken = "";
  let feedbackId = "";

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGO_URI);
    }
    const User = require("../models/User");
    const bcrypt = require("bcryptjs");
    let testAdmin = await User.findOne({ role: "admin", accountStatus: "active" });
    if (!testAdmin) {
      testAdmin = await User.create({
        name: "Test Admin",
        email: "test.admin@example.com",
        password: await bcrypt.hash("Password123!", 10),
        role: "admin",
        accountStatus: "active",
        isApproved: true,
      });
    } else {
      testAdmin.password = await bcrypt.hash("Password123!", 10);
      await testAdmin.save();
    }
    const loginRes = await request(app).post("/api/auth/login").send({
      email: testAdmin.email,
      password: "Password123!",
    });
    adminToken = loginRes.body.accessToken;
  });

  afterAll(async () => {
    if (feedbackId) {
      const ProductFeedback = require("../models/ProductFeedback");
      await ProductFeedback.deleteOne({ _id: feedbackId });
    }
    await mongoose.connection.close();
  });

  test("POST /api/feedback — Submit a feature request", async () => {
    const res = await request(app)
      .post("/api/feedback")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        title: "Jest Feature Request Test",
        description: "Testing product feedback submission.",
        category: "UI/UX",
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.feedback).toHaveProperty("title", "Jest Feature Request Test");
    feedbackId = res.body.feedback._id;
  });

  test("POST /api/feedback/:id/vote — Toggle vote on feedback", async () => {
    const res = await request(app)
      .post(`/api/feedback/${feedbackId}/vote`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("hasVoted", true);
  });
});
