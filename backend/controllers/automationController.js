const AutomationRule = require("../models/AutomationRule");
const AutomationExecution = require("../models/AutomationExecution");
const { logAudit } = require("../utils/auditLogger");

// ── GET /api/automations ──────────────────────────────────────────────────────
const getRules = async (req, res, next) => {
  try {
    const filter = {};
    if (req.user.organizationId) {
      filter.organizationId = req.user.organizationId?._id || req.user.organizationId;
    }

    const rules = await AutomationRule.find(filter)
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 });

    res.status(200).json(rules);
  } catch (error) {
    next(error);
  }
};

// ── POST /api/automations ─────────────────────────────────────────────────────
const createRule = async (req, res, next) => {
  try {
    const { name, description, trigger, conditions, actions, status } = req.body;

    const rule = await AutomationRule.create({
      organizationId: req.user.organizationId?._id || req.user.organizationId,
      name: name || "New Automation Rule",
      description: description || "",
      trigger: trigger || "ticket_created",
      conditions: conditions || [],
      actions: actions || [],
      status: status || "active",
      createdBy: req.user._id,
    });

    await logAudit({
      entity: "AutomationRule",
      entityId: rule._id,
      action: "RULE_CREATED",
      performedBy: req.user._id,
      details: { name: rule.name, trigger: rule.trigger }
    }).catch(() => {});

    res.status(201).json({
      success: true,
      message: "Automation rule created successfully.",
      rule
    });
  } catch (error) {
    next(error);
  }
};

// ── PUT /api/automations/:id ──────────────────────────────────────────────────
const updateRule = async (req, res, next) => {
  try {
    const { id } = req.params;
    const rule = await AutomationRule.findById(id);

    if (!rule) {
      return res.status(404).json({ message: "Automation rule not found." });
    }

    if (req.body.name) rule.name = req.body.name;
    if (req.body.description !== undefined) rule.description = req.body.description;
    if (req.body.trigger) rule.trigger = req.body.trigger;
    if (req.body.conditions) rule.conditions = req.body.conditions;
    if (req.body.actions) rule.actions = req.body.actions;
    if (req.body.status) rule.status = req.body.status;

    await rule.save();

    res.status(200).json({
      success: true,
      message: "Automation rule updated successfully.",
      rule
    });
  } catch (error) {
    next(error);
  }
};

// ── DELETE /api/automations/:id ───────────────────────────────────────────────
const deleteRule = async (req, res, next) => {
  try {
    const { id } = req.params;
    await AutomationRule.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: "Automation rule deleted successfully."
    });
  } catch (error) {
    next(error);
  }
};

// ── GET /api/automations/history ──────────────────────────────────────────────
const getExecutionHistory = async (req, res, next) => {
  try {
    const filter = {};
    if (req.user.organizationId) {
      filter.organizationId = req.user.organizationId?._id || req.user.organizationId;
    }

    const history = await AutomationExecution.find(filter)
      .populate("ruleId", "name trigger")
      .populate("ticketId", "ticketNumber title priority status")
      .sort({ executedAt: -1 })
      .limit(100);

    res.status(200).json(history);
  } catch (error) {
    next(error);
  }
};

// ── POST /api/automations/ai-suggest ─────────────────────────────────────────
const getAIRuleSuggestions = async (req, res, next) => {
  try {
    const suggestions = [
      {
        name: "Auto-Escalate Critical Security Tickets",
        trigger: "ticket_created",
        conditions: [
          { field: "category", operator: "equals", value: "Security" },
          { field: "priority", operator: "equals", value: "Critical" }
        ],
        actions: [
          { type: "add_tag", configuration: { tag: "security-incident" } },
          { type: "send_notification", configuration: { message: "Security incident requiring immediate attention." } }
        ],
        aiReasoning: "High frequency of security incidents detected in past 30 days."
      },
      {
        name: "Auto-Tag Database Performance Bottlenecks",
        trigger: "ticket_created",
        conditions: [
          { field: "category", operator: "equals", value: "Database" }
        ],
        actions: [
          { type: "add_tag", configuration: { tag: "db-performance" } }
        ],
        aiReasoning: "Database latency incidents spike during peak hours."
      }
    ];

    res.status(200).json({ success: true, suggestions });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getRules,
  createRule,
  updateRule,
  deleteRule,
  getExecutionHistory,
  getAIRuleSuggestions,
};
