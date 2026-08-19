const Organization = require("../models/Organization");

const tenantMiddleware = async (req, res, next) => {
  try {
    // 1. If user is authenticated, resolve organization from req.user
    if (req.user && req.user.organizationId) {
      req.organizationId = req.user.organizationId;
      return next();
    }

    // 2. Check X-Organization-Id header
    const headerOrgId = req.headers["x-organization-id"];
    if (headerOrgId) {
      req.organizationId = headerOrgId;
      return next();
    }

    // 3. Check X-Tenant-Slug header
    const headerSlug = req.headers["x-tenant-slug"];
    if (headerSlug) {
      const org = await Organization.findOne({ slug: headerSlug });
      if (org) {
        req.organizationId = org._id;
        return next();
      }
    }

    return next();
  } catch (error) {
    next(error);
  }
};

module.exports = tenantMiddleware;
