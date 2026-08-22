const request = require("supertest");
const express = require("express");
const mongoose = require("mongoose");
require("dotenv").config();

// Require routes and middlewares directly to test Express handlers cleanly
const authRoutes = require("../routes/authRoutes");
const { errorHandler } = require("../middleware/errorMiddleware");

const app = express();
app.use(express.json());
app.use("/api/auth", authRoutes);
app.use(errorHandler);

describe("Authentication & RBAC Integration Tests", () => {
  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGO_URI);
    }
    const User = require("../models/User");
    const bcrypt = require("bcryptjs");
    let testAdmin = await User.findOne({ role: "admin", accountStatus: "active" });
    if (!testAdmin) {
      const hashedPassword = await bcrypt.hash("Password123!", 10);
      testAdmin = await User.create({
        name: "Test Admin",
        email: "test.admin@example.com",
        password: hashedPassword,
        role: "admin",
        accountStatus: "active",
        isApproved: true,
      });
    } else {
      testAdmin.password = await bcrypt.hash("Password123!", 10);
      await testAdmin.save();
    }
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  test("POST /api/auth/login — Successful Login with valid credentials", async () => {
    const User = require("../models/User");
    const adminUser = await User.findOne({ role: "admin", accountStatus: "active" });
    const res = await request(app).post("/api/auth/login").send({
      email: adminUser.email,
      password: "Password123!",
    });

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("accessToken");
    expect(res.body.user).toHaveProperty("role", "admin");
  });

  test("POST /api/auth/login — Rejects invalid credentials with 401/400", async () => {
    const res = await request(app).post("/api/auth/login").send({
      email: "test.admin@example.com",
      password: "WrongPassword123!",
    });

    expect(res.statusCode).toBeGreaterThanOrEqual(400);
    expect(res.body).toHaveProperty("message");
  });

  test("GET /api/auth/me — Rejects unauthenticated request with 401", async () => {
    const res = await request(app).get("/api/auth/me");
    expect(res.statusCode).toBe(401);
  });

  test("GET /api/auth/me — Returns user profile when valid token provided", async () => {
    const User = require("../models/User");
    const adminUser = await User.findOne({ role: "admin", accountStatus: "active" });
    const loginRes = await request(app).post("/api/auth/login").send({
      email: adminUser.email,
      password: "Password123!",
    });
    const token = loginRes.body.accessToken;

    const meRes = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${token}`);

    expect(meRes.statusCode).toBe(200);
    expect(meRes.body.user).toHaveProperty("email", adminUser.email);
    expect(meRes.body.user).toHaveProperty("role", "admin");
  });

  test("GET /api/auth/me — Rejects invalid token with 401", async () => {
    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", "Bearer invalid.jwt.token");
    expect(res.statusCode).toBe(401);
  });
});
