const { body, validationResult } = require("express-validator");

// Middleware to format validation errors
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: "Validation Error",
      errors: errors.array().map((err) => ({ field: err.path, message: err.msg })),
    });
  }
  next();
};

const registerValidator = [
  body("name").trim().notEmpty().withMessage("Name is required").isLength({ min: 2, max: 50 }).withMessage("Name must be between 2 and 50 characters"),
  body("email").trim().isEmail().withMessage("Valid email is required").normalizeEmail(),
  body("mobileNumber").trim().notEmpty().withMessage("Mobile number is required").matches(/^[0-9+\-\s()]+$/).withMessage("Invalid mobile number format"),
  body("password")
    .isLength({ min: 8 }).withMessage("Password must be at least 8 characters long")
    .matches(/[A-Z]/).withMessage("Password must contain at least one uppercase letter")
    .matches(/[a-z]/).withMessage("Password must contain at least one lowercase letter")
    .matches(/[0-9]/).withMessage("Password must contain at least one number")
    .matches(/[\W_]/).withMessage("Password must contain at least one special character"),
  validate,
];

const loginValidator = [
  body("email").trim().isEmail().withMessage("Valid email is required").normalizeEmail(),
  body("password").notEmpty().withMessage("Password is required"),
  validate,
];

const forgotPasswordValidator = [
  body("email").trim().isEmail().withMessage("Valid email is required").normalizeEmail(),
  validate,
];

const resetPasswordValidator = [
  body("token").notEmpty().withMessage("Token is required"),
  body("password")
    .isLength({ min: 8 }).withMessage("Password must be at least 8 characters long")
    .matches(/[A-Z]/).withMessage("Password must contain at least one uppercase letter")
    .matches(/[a-z]/).withMessage("Password must contain at least one lowercase letter")
    .matches(/[0-9]/).withMessage("Password must contain at least one number")
    .matches(/[\W_]/).withMessage("Password must contain at least one special character"),
  validate,
];

const resendVerificationValidator = [
  body("email").trim().isEmail().withMessage("Valid email is required").normalizeEmail(),
  validate,
];

module.exports = {
  registerValidator,
  loginValidator,
  forgotPasswordValidator,
  resetPasswordValidator,
  resendVerificationValidator,
};
