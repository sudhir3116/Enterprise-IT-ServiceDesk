const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

const connectDB = require("./config/db");

const authRoutes = require("./routes/authRoutes");
const ticketRoutes = require("./routes/ticketRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const { errorHandler } = require("./middleware/errorMiddleware");

dotenv.config();

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

  // Security Middlewares
  app.use(helmet({
    contentSecurityPolicy: false, // Let Vite dev reload work if run on same domain
  }));

  // Middleware
  app.use(cors({
    origin: process.env.CLIENT_URL || "*",
    credentials: true
  }));
  app.use(express.json());

  const limiter = rateLimit({
    windowMs: sessionTimeoutMinutes * 60 * 1000,
    max: 200, // limit each IP to 200 requests per windowMs
    message: { message: `Too many requests from this IP, please try again after ${sessionTimeoutMinutes} minutes` },
  });
  app.use("/api", limiter);
  
  app.get("/", (req, res) => {
    res.send("Employee IT Helpdesk API Running...");
  });

  // Routes
  app.use("/api/auth", authRoutes);
  app.use("/api/tickets", ticketRoutes);
  app.use("/api/dashboard", dashboardRoutes);
  app.use("/api/notifications", require("./routes/notificationRoutes"));
  app.use("/api/users", require("./routes/userRoutes"));
  app.use("/api/audit-logs", require("./routes/auditLogRoutes"));
  app.use("/api/self-service", require("./routes/selfServiceRoutes"));
  app.use("/api/kb", require("./routes/kbRoutes"));
  app.use("/api/search", require("./routes/searchRoutes"));
  app.use("/api/departments", require("./routes/departmentRoutes"));
  app.use("/api/roles", require("./routes/roleRoutes"));
  app.use("/api/categories", require("./routes/categoryRoutes"));
  app.use("/api/slas", require("./routes/slaRoutes"));
  app.use("/api/settings", require("./routes/settingsRoutes"));

  // Global Error Handler Middleware
  app.use(errorHandler);

  // Server Port
  const PORT = process.env.PORT || 8000;

  // Start Server
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
});