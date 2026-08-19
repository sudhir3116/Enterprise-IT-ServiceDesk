const mongoose = require("mongoose");

const conditionSchema = new mongoose.Schema({
  field: {
    type: String,
    required: true,
  },
  operator: {
    type: String,
    enum: ["equals", "not_equals", "contains", "greater_than", "less_than"],
    default: "equals",
  },
  value: {
    type: String,
    required: true,
  },
});

const actionSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: [
      "assign_engineer",
      "change_priority",
      "change_status",
      "send_notification",
      "send_email",
      "add_tag",
      "escalate_ticket",
    ],
    required: true,
  },
  configuration: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
});

const automationRuleSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
    },
    trigger: {
      type: String,
      enum: [
        "ticket_created",
        "ticket_updated",
        "ticket_status_changed",
        "sla_warning",
        "sla_breached",
        "customer_replied",
        "ticket_unassigned",
      ],
      required: true,
      index: true,
    },
    conditions: [conditionSchema],
    actions: [actionSchema],
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

automationRuleSchema.index({ organizationId: 1, trigger: 1, status: 1 });

module.exports = mongoose.model("AutomationRule", automationRuleSchema);
