const swaggerJsdoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Product Support Portal API Documentation",
      version: "1.0.0",
      description:
        "Enterprise IT Service Desk & Support Portal REST API specification covering Authentication, Tickets, SLA Engine, Automations, Knowledge Base, AI Assistant, Bug Management, and Product Feedback.",
      contact: {
        name: "Enterprise Product Support Engineering",
        email: "support@productportal.com",
      },
    },
    servers: [
      {
        url: "http://localhost:8001/api",
        description: "Local Development Server",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "Enter your JWT Bearer token in the format: Bearer <token>",
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: [], // We define tags & inline schemas dynamically for performance
};

const swaggerSpec = swaggerJsdoc(options);

// Custom UI styling for enterprise dark/light theme alignment
const swaggerUiOptions = {
  customCss: `
    .swagger-ui .topbar { background-color: #0f172a; }
    .swagger-ui .info .title { font-family: 'Inter', sans-serif; color: #1e293b; }
  `,
  customSiteTitle: "Product Support Portal API Docs",
};

const setupSwagger = (app) => {
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec, swaggerUiOptions));
  app.get("/api-docs.json", (req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.send(swaggerSpec);
  });
};

module.exports = setupSwagger;
