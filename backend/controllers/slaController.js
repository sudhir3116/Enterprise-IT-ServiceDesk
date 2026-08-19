const SlaPolicy = require("../models/SlaPolicy");
const { logAudit } = require("../utils/auditLogger");

// GET /api/slas — Get all SLA policies
const getSlaPolicies = async (req, res, next) => {
  try {
    const orgId = req.organizationId || req.user?.organizationId?._id || req.user?.organizationId;
    const filter = {};
    if (orgId) {
      filter.organizationId = orgId;
    }

    const policies = await SlaPolicy.find(filter)
      .populate("organizationId", "name slug plan")
      .populate("createdBy", "name email")
      .sort({ priority: 1, createdAt: -1 });

    res.status(200).json(policies);
  } catch (error) {
    next(error);
  }
};

// POST /api/slas — Create custom SLA policy
const createSlaPolicy = async (req, res, next) => {
  try {
    const { name, priority, firstResponseTime, resolutionTime, businessHours } = req.body;
    const orgId = req.organizationId || req.user?.organizationId?._id || req.user?.organizationId;

    if (!name || !priority || !firstResponseTime || !resolutionTime) {
      res.status(400);
      throw new Error("Missing required SLA policy fields (name, priority, firstResponseTime, resolutionTime).");
    }

    const existing = await SlaPolicy.findOne({ organizationId: orgId, priority });
    if (existing) {
      // Deactivate older policy for same priority if exists
      existing.isActive = false;
      await existing.save();
    }

    const policy = await SlaPolicy.create({
      organizationId: orgId,
      name,
      priority,
      firstResponseTime: Number(firstResponseTime),
      resolutionTime: Number(resolutionTime),
      businessHours: !!businessHours,
      createdBy: req.user._id,
    });

    await logAudit({
      entity: "SlaPolicy",
      entityId: policy._id,
      action: "SLA Policy Created",
      performedBy: req.user._id,
      details: { name, priority, firstResponseTime, resolutionTime },
    }).catch(() => {});

    res.status(201).json(policy);
  } catch (error) {
    next(error);
  }
};

// PUT /api/slas/:id — Update SLA policy
const updateSlaPolicy = async (req, res, next) => {
  try {
    const { id } = req.params;
    const policy = await SlaPolicy.findById(id);
    if (!policy) {
      res.status(404);
      throw new Error("SLA Policy Not Found");
    }

    const { name, priority, firstResponseTime, resolutionTime, businessHours, isActive } = req.body;

    if (name !== undefined) policy.name = name;
    if (priority !== undefined) policy.priority = priority;
    if (firstResponseTime !== undefined) policy.firstResponseTime = Number(firstResponseTime);
    if (resolutionTime !== undefined) policy.resolutionTime = Number(resolutionTime);
    if (businessHours !== undefined) policy.businessHours = !!businessHours;
    if (isActive !== undefined) policy.isActive = !!isActive;

    await policy.save();

    await logAudit({
      entity: "SlaPolicy",
      entityId: policy._id,
      action: "SLA Policy Updated",
      performedBy: req.user._id,
      details: { name: policy.name, priority: policy.priority },
    }).catch(() => {});

    res.status(200).json(policy);
  } catch (error) {
    next(error);
  }
};

// DELETE /api/slas/:id — Delete SLA policy
const deleteSlaPolicy = async (req, res, next) => {
  try {
    const { id } = req.params;
    const policy = await SlaPolicy.findByIdAndDelete(id);
    if (!policy) {
      res.status(404);
      throw new Error("SLA Policy Not Found");
    }

    res.status(200).json({ message: "SLA Policy Deleted Successfully" });
  } catch (error) {
    next(error);
  }
};

// POST /api/slas/seed-defaults — Provision default SLA policies
const seedDefaultSlaPolicies = async (req, res, next) => {
  try {
    const orgId = req.organizationId || req.user?.organizationId?._id || req.user?.organizationId;

    const defaults = [
      { name: "Enterprise Critical Tier", priority: "Critical", firstResponseTime: 15, resolutionTime: 120, businessHours: false },
      { name: "Enterprise High Tier", priority: "High", firstResponseTime: 60, resolutionTime: 480, businessHours: true },
      { name: "Enterprise Medium Tier", priority: "Medium", firstResponseTime: 120, resolutionTime: 1440, businessHours: true },
      { name: "Enterprise Low Tier", priority: "Low", firstResponseTime: 240, resolutionTime: 2880, businessHours: true },
    ];

    const created = [];
    for (const d of defaults) {
      let p = await SlaPolicy.findOne({ organizationId: orgId, priority: d.priority });
      if (!p) {
        p = await SlaPolicy.create({
          ...d,
          organizationId: orgId,
          createdBy: req.user._id,
        });
      }
      created.push(p);
    }

    res.status(200).json({ message: "Default SLA policies provisioned", policies: created });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getSlaPolicies,
  createSlaPolicy,
  updateSlaPolicy,
  deleteSlaPolicy,
  seedDefaultSlaPolicies,
};
