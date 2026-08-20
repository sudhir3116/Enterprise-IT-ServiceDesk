const { z } = require("zod");

const PRIORITY_ENUM = ["low", "medium", "high", "critical", "Low", "Medium", "High", "Critical"];
const CATEGORY_ENUM = [
  "hardware", "software", "network", "access", "other", "general", "security",
  "Hardware", "Software", "Network", "Access", "Other", "General", "Security", "Access/Login",
];

const titleCase = (value) => {
  if (!value || typeof value !== "string") return value;
  const lower = value.toLowerCase();
  if (lower === "access/login") return "Access";
  return lower.charAt(0).toUpperCase() + lower.slice(1);
};

const registerSchema = z.object({
  name: z.string().trim().min(2, "Name must be between 2 and 50 characters").max(50, "Name must be between 2 and 50 characters"),
  email: z.string().trim().email("Valid email is required"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/\d/, "Password must contain at least 1 number"),
  mobileNumber: z.string().trim().min(1, "Mobile number is required"),
  department: z.string().optional(),
  designation: z.string().optional(),
  requestedRole: z.string().optional(),
  organizationId: z.any().optional(),
}).passthrough();

const loginSchema = z.object({
  email: z.string().trim().min(1, "Email is required").email("Valid email is required"),
  password: z.string().min(1, "Password is required"),
  rememberMe: z.boolean().optional(),
});

const createTicketSchema = z.object({
  title: z.string().trim().min(5, "Title must be between 5 and 200 characters").max(200, "Title must be between 5 and 200 characters"),
  description: z.string().trim().min(10, "Description must be between 10 and 5000 characters").max(5000, "Description must be between 10 and 5000 characters"),
  category: z.enum(CATEGORY_ENUM, { message: "Invalid ticket category" }).transform(titleCase),
  priority: z.enum(PRIORITY_ENUM).transform(titleCase).optional(),
  impact: z.enum(["Low", "Medium", "High"]).optional(),
  urgency: z.enum(["Low", "Medium", "High"]).optional(),
  department: z.string().optional(),
  tags: z.array(z.string()).optional(),
  environment: z.record(z.string(), z.any()).optional(),
  issueDetails: z.record(z.string(), z.any()).optional(),
  attachments: z.array(z.any()).optional(),
}).passthrough();

const updateTicketSchema = z.object({
  title: z.string().trim().min(5).max(200).optional(),
  description: z.string().trim().min(10).max(5000).optional(),
  status: z.string().optional(),
  priority: z.enum(PRIORITY_ENUM).transform(titleCase).optional(),
  category: z.enum(CATEGORY_ENUM).transform(titleCase).optional(),
  assignedTo: z.union([z.string(), z.null()]).optional(),
  assignedAgent: z.union([z.string(), z.null()]).optional(),
  dueDate: z.any().optional(),
  slaDeadline: z.any().optional(),
  impact: z.string().optional(),
  urgency: z.string().optional(),
  tags: z.array(z.string()).optional(),
  resolutionSummary: z.string().optional(),
}).passthrough().refine(
  (data) => Object.keys(data).length > 0,
  { message: "At least one field is required" }
);

const addCommentSchema = z.object({
  body: z.string().trim().min(1).max(5000).optional(),
  text: z.string().trim().min(1).max(5000).optional(),
  isInternal: z.boolean().optional(),
}).refine((data) => !!(data.body || data.text), {
  message: "Comment body is required",
  path: ["body"],
});

module.exports = {
  registerSchema,
  loginSchema,
  createTicketSchema,
  updateTicketSchema,
  addCommentSchema,
};
