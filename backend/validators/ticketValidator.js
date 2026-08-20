const { body, validationResult } = require("express-validator");

const createTicketValidator = [
  body("title")
    .trim()
    .notEmpty()
    .withMessage("Ticket title is required")
    .isLength({ min: 5, max: 150 })
    .withMessage("Title must be between 5 and 150 characters long"),

  body("description")
    .trim()
    .notEmpty()
    .withMessage("Detailed description is required")
    .isLength({ min: 10 })
    .withMessage("Description must be at least 10 characters long"),

  body("category")
    .optional()
    .trim()
    .isIn(["General", "Hardware", "Software", "Network", "Security", "Access", "Access/Login", "Other"])
    .withMessage("Invalid ticket category"),

  body("impact")
    .optional()
    .isIn(["Low", "Medium", "High"])
    .withMessage("Invalid impact level"),

  body("urgency")
    .optional()
    .isIn(["Low", "Medium", "High"])
    .withMessage("Invalid urgency level"),

  body("environment")
    .optional()
    .isObject()
    .withMessage("Environment must be an object"),

  body("issueDetails")
    .optional()
    .isObject()
    .withMessage("Issue details must be an object"),

  body("tags")
    .optional()
    .isArray()
    .withMessage("Tags must be an array of strings"),

  body("attachments")
    .optional()
    .isArray()
    .withMessage("Attachments must be an array"),

  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: errors.array()[0].msg,
        errors: errors.array(),
      });
    }
    next();
  },
];

// Validator for updating ticket status/assignment
const updateTicketValidator = [
  body("status").optional().isString().withMessage("Invalid status value"),
  body("assignedTo").optional().isMongoId().withMessage("assignedTo must be a valid user id"),
  body("dueDate").optional().isISO8601().toDate().withMessage("Invalid dueDate"),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array()[0].msg, errors: errors.array() });
    }
    next();
  },
];

// Validator for adding comments
const addCommentValidator = [
  body("text").trim().notEmpty().withMessage("Comment text is required").isLength({ max: 5000 }).withMessage("Comment is too long"),
  body("isInternal").optional().isBoolean().withMessage("isInternal must be boolean"),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array()[0].msg, errors: errors.array() });
    }
    next();
  },
];

module.exports = {
  createTicketValidator,
  updateTicketValidator,
  addCommentValidator,
};
