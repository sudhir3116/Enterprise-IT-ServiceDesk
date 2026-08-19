require("dotenv").config(); // ← MUST be first: populates process.env before any other require()

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const cookieParser = require("cookie-parser");

const connectDB = require("./config/db");

const authRoutes = require("./routes/authRoutes");
const oauthRoutes = require("./routes/oauthRoutes");
const ticketRoutes = require("./routes/ticketRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const { errorHandler } = require("./middleware/errorMiddleware");

// Initialize Passport strategies (must be required before routes)
require("./config/passportSetup");


// Connect Database
connectDB().then(async () => {
  const Settings = require("./models/Settings");
  let sessionTimeoutMinutes = 60;
  try {
    const settings = await Settings.findOne();
    if (settings && settings.sessionTimeoutMinutes) {
      sessionTimeoutMinutes = settings.sessionTimeoutMinutes;
    }
  } catch (err) {
    console.error("Failed to load settings for rate limiter:", err.message);
  }

  const app = express();

  // Express Proxy Configuration for Render / Cloudflare reverse proxies
  app.set("trust proxy", 1);

  // Security Middlewares
  app.use(helmet({
    contentSecurityPolicy: false, // Let Vite dev reload work if run on same domain
  }));

  // Middleware
  const clientUrls = (process.env.CLIENT_URL || "http://localhost:5173").split(",").map(u => u.trim());
  app.use(cors({
    origin: (origin, callback) => {
      if (!origin || clientUrls.includes(origin) || process.env.NODE_ENV !== "production") {
        callback(null, true);
      } else {
        callback(null, true);
      }
    },
    credentials: true
  }));
  app.use(express.json());
  app.use(cookieParser());

  // Passport (session-less; no express-session needed)
  const passport = require("passport");
  app.use(passport.initialize());

  // Mount API Documentation (/api-docs)
  const setupSwagger = require("./config/swagger");
  setupSwagger(app);

  // Winston HTTP Logger Middleware
  const logger = require("./utils/logger");
  app.use((req, res, next) => {
    logger.info(`${req.method} ${req.originalUrl} - IP: ${req.ip}`);
    next();
  });

  // General API Rate Limiter
  const { apiLimiter } = require("./middleware/rateLimiter");
  app.use("/api", apiLimiter);
  
  // Health Check Endpoint
  app.get("/api/health", (req, res) => {
    res.status(200).json({
      status: "ok",
      environment: process.env.NODE_ENV || "development",
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    });
  });

  app.get("/", (req, res) => {
    res.json({ message: "Product Support Portal Enterprise API Running", docs: "/api-docs", health: "/api/health" });
  });

  // Routes
  app.use("/api/auth", authRoutes);
  app.use("/api/auth", oauthRoutes);  // SSO: Google & Microsoft
  app.use("/api/organization", require("./routes/organizationRoutes"));
  app.use("/api/organizations", require("./routes/organizationRoutes"));
  app.use("/api/tickets", ticketRoutes);
  app.use("/api/dashboard", dashboardRoutes);
  app.use("/api/notifications", require("./routes/notificationRoutes"));
  app.use("/api/users", require("./routes/userRoutes"));
  app.use("/api/audit-logs", require("./routes/auditLogRoutes"));
  app.use("/api/self-service", require("./routes/selfServiceRoutes"));
  app.use("/api/kb", require("./routes/kbRoutes"));
  app.use("/api/articles", require("./routes/kbRoutes"));
  app.use("/api/ai", require("./routes/aiRoutes"));
  app.use("/api/search", require("./routes/searchRoutes"));
  app.use("/api/departments", require("./routes/departmentRoutes"));
  app.use("/api/roles", require("./routes/roleRoutes"));
  app.use("/api/categories", require("./routes/categoryRoutes"));
  app.use("/api/slas", require("./routes/slaRoutes"));
  app.use("/api/automations", require("./routes/automationRoutes"));
  app.use("/api/analytics", require("./routes/analyticsRoutes"));
  app.use("/api/reports", require("./routes/analyticsRoutes"));
  app.use("/api/email", require("./routes/emailRoutes"));
  app.use("/api/settings", require("./routes/settingsRoutes"));

  // Module 8 — Bug Investigation & Product Feedback
  app.use("/api/bugs",     require("./routes/bugRoutes"));
  app.use("/api/feedback", require("./routes/feedbackRoutes"));

  // Global Error Handler Middleware
  app.use(errorHandler);

  // Server Port
  const PORT = process.env.PORT || 8000;

  // Start Server
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    const { startSlaMonitor } = require("./jobs/slaMonitor");
    startSlaMonitor();
  });
});