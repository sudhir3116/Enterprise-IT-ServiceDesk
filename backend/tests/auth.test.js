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
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  test("POST /api/auth/login — Successful Login with valid credentials", async () => {
    const res = await request(app).post("/api/auth/login").send({
      email: "sudhir3116@gmail.com",
      password: "Password123!",
    });

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("accessToken");
    expect(res.body.user).toHaveProperty("role", "admin");
  });

  test("POST /api/auth/login — Rejects invalid credentials with 401/400", async () => {
    const res = await request(app).post("/api/auth/login").send({
      email: "sudhir3116@gmail.com",
      password: "WrongPassword123!",
    });

    expect(res.statusCode).toBeGreaterThanOrEqual(400);
    expect(res.body).toHaveProperty("message");
  });

  test("GET /api/auth/me — Rejects unauthenticated request with 401", async () => {
    const res = await request(app).get("/api/auth/me");
    expect(res.statusCode).toBe(401);
  });
});
