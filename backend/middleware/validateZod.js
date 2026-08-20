/**
 * Zod request-body validator.
 * Returns 400 with field-level details on failure.
 */
const validateZod = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);
  if (result.success) {
    req.body = result.data;
    return next();
  }

  const errors = result.error.issues.map((issue) => ({
    field: issue.path.join(".") || "_root",
    message: issue.message,
  }));

  return res.status(400).json({
    success: false,
    message: "Validation Error",
    errors,
  });
};

module.exports = { validateZod };
