const Organization = require("../models/Organization");
const User = require("../models/User");

// Get current organization details
const getCurrentOrganization = async (req, res, next) => {
  try {
    const orgId = req.user?.organizationId;
    if (!orgId) {
      res.status(404);
      throw new Error("Organization context not found");
    }

    const organization = await Organization.findById(orgId);
    if (!organization) {
      res.status(404);
      throw new Error("Organization not found");
    }

    const totalUsers = await User.countDocuments({ organizationId: orgId });
    const totalAgents = await User.countDocuments({
      organizationId: orgId,
      role: { $in: ["support_engineer", "agent", "admin"] },
    });

    res.status(200).json({
      success: true,
      organization: {
        id: organization._id,
        name: organization.name,
        slug: organization.slug,
        domain: organization.domain,
        plan: organization.plan,
        status: organization.status,
        maxUsers: organization.maxUsers,
        maxAgents: organization.maxAgents,
        settings: organization.settings,
        stats: {
          totalUsers,
          totalAgents,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// Update current organization settings (Admin only)
const updateCurrentOrganization = async (req, res, next) => {
  try {
    const orgId = req.user?.organizationId;
    if (!orgId) {
      res.status(404);
      throw new Error("Organization context not found");
    }

    const organization = await Organization.findById(orgId);
    if (!organization) {
      res.status(404);
      throw new Error("Organization not found");
    }

    const { name, domain, plan, settings } = req.body;
    if (name) organization.name = name;
    if (domain) organization.domain = domain;
    if (plan && ["free", "pro", "enterprise"].includes(plan)) organization.plan = plan;
    if (settings) {
      organization.settings = {
        ...organization.settings.toObject(),
        ...settings,
      };
    }

    await organization.save();

    res.status(200).json({
      success: true,
      message: "Organization settings updated successfully",
      organization: {
        id: organization._id,
        name: organization.name,
        slug: organization.slug,
        domain: organization.domain,
        plan: organization.plan,
        status: organization.status,
        settings: organization.settings,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Create a new tenant organization (System Admin / Initial Provisioning)
const createOrganization = async (req, res, next) => {
  try {
    const { name, slug, domain, plan, maxUsers, maxAgents } = req.body;

    const slugExists = await Organization.findOne({ slug: slug.toLowerCase() });
    if (slugExists) {
      res.status(400);
      throw new Error("Organization slug already exists. Please choose another identifier.");
    }

    const organization = await Organization.create({
      name,
      slug: slug.toLowerCase(),
      domain: domain || "",
      plan: plan || "free",
      maxUsers: maxUsers || 25,
      maxAgents: maxAgents || 5,
    });

    res.status(201).json({
      success: true,
      message: "Organization created successfully",
      organization,
    });
  } catch (error) {
    next(error);
  }
};

// List all organizations (Admin)
const getAllOrganizations = async (req, res, next) => {
  try {
    const organizations = await Organization.find({}).sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      organizations,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCurrentOrganization,
  updateCurrentOrganization,
  createOrganization,
  getAllOrganizations,
};
