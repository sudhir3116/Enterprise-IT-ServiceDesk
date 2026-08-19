const AutomationRule = require("../models/AutomationRule");
const AutomationExecution = require("../models/AutomationExecution");
const Ticket = require("../models/Ticket");
const User = require("../models/User");
const { logAudit } = require("../utils/auditLogger");
const notificationService = require("./notificationService");

class AutomationService {
  /**
   * Evaluates a single condition rule against ticket properties.
   */
  evaluateCondition(ticket, condition) {
    if (!ticket || !condition) return false;

    const { field, operator, value } = condition;
    let actualValue = ticket[field];

    if (field === "category") actualValue = ticket.category;
    if (field === "priority") actualValue = ticket.priority;
    if (field === "status") actualValue = ticket.status;
    if (field === "title") actualValue = ticket.title;

    if (actualValue === undefined || actualValue === null) actualValue = "";

    const strActual = String(actualValue).toLowerCase();
    const strTarget = String(value).toLowerCase();

    switch (operator) {
      case "equals":
        return strActual === strTarget;
      case "not_equals":
        return strActual !== strTarget;
      case "contains":
        return strActual.includes(strTarget);
      case "greater_than":
        return Number(actualValue) > Number(value);
      case "less_than":
        return Number(actualValue) < Number(value);
      default:
        return strActual === strTarget;
    }
  }

  /**
   * Evaluates all conditions of an automation rule.
   */
  evaluateRule(ticket, rule) {
    if (!rule.conditions || rule.conditions.length === 0) return true;
    return rule.conditions.every(cond => this.evaluateCondition(ticket, cond));
  }

  /**
   * Executes configured workflow actions on a ticket.
   */
  async executeActions(ticket, actions, rule) {
    const executedActions = [];

    for (const act of actions) {
      const { type, configuration } = act;

      if (type === "change_priority" && configuration?.priority) {
        ticket.priority = configuration.priority;
        executedActions.push({ type, detail: `Changed priority to '${configuration.priority}'` });
      }

      if (type === "change_status" && configuration?.status) {
        ticket.status = configuration.status;
        executedActions.push({ type, detail: `Changed status to '${configuration.status}'` });
      }

      if (type === "add_tag" && configuration?.tag) {
        if (!ticket.tags) ticket.tags = [];
        if (!ticket.tags.includes(configuration.tag)) {
          ticket.tags.push(configuration.tag);
        }
        executedActions.push({ type, detail: `Added tag '${configuration.tag}'` });
      }

      if (type === "assign_engineer" && configuration?.engineerId) {
        const engineer = await User.findById(configuration.engineerId);
        if (engineer) {
          ticket.assignedTo = engineer._id;
          executedActions.push({ type, detail: `Assigned engineer '${engineer.name}'` });
        }
      }

      if (type === "escalate_ticket") {
        ticket.status = "Escalated";
        ticket.priority = "Critical";
        executedActions.push({ type, detail: "Escalated ticket priority to Critical and status to Escalated" });
      }

      if (type === "send_notification" && configuration?.message) {
        if (ticket.assignedTo) {
          await notificationService.createNotification({
            recipient: ticket.assignedTo,
            title: `Automation Alert: ${rule.name}`,
            message: configuration.message,
            ticketId: ticket._id
          }).catch(() => {});
        }
        executedActions.push({ type, detail: `Dispatched notification '${configuration.message}'` });
      }
    }

    if (!ticket.history) ticket.history = [];
    ticket.history.push({
      action: `Workflow Automation Executed: ${rule.name}`,
      performedBy: "Automation Engine",
      detail: executedActions.map(a => a.detail).join("; "),
      date: new Date()
    });

    await ticket.save();
    return executedActions;
  }

  /**
   * Main entry point: Triggers all matching active automation rules for a system event.
   */
  async triggerAutomations(triggerEvent, ticket, context = {}) {
    try {
      if (!ticket || !ticket.organizationId) return;

      const orgId = ticket.organizationId?._id || ticket.organizationId;

      const activeRules = await AutomationRule.find({
        $or: [{ organizationId: orgId }, { organizationId: null }],
        trigger: triggerEvent,
        status: "active"
      });

      if (!activeRules || activeRules.length === 0) return;

      for (const rule of activeRules) {
        const matches = this.evaluateRule(ticket, rule);
        if (matches) {
          try {
            const executedActions = await this.executeActions(ticket, rule.actions, rule);

            await AutomationExecution.create({
              organizationId: orgId,
              ruleId: rule._id,
              ticketId: ticket._id,
              status: "success",
              executedActions,
              success: true
            });

            await logAudit({
              entity: "AutomationRule",
              entityId: rule._id,
              action: "AUTOMATION_EXECUTED",
              performedBy: ticket.assignedTo || ticket.createdBy,
              details: { ruleName: rule.name, triggerEvent, ticketNumber: ticket.ticketNumber }
            }).catch(() => {});
          } catch (err) {
            console.error(`[Automation Engine] Error executing rule ${rule.name}:`, err.message);
            await AutomationExecution.create({
              organizationId: orgId,
              ruleId: rule._id,
              ticketId: ticket._id,
              status: "failed",
              success: false,
              errorMessage: err.message
            });
          }
        }
      }
    } catch (err) {
      console.error("[Automation Engine] Error in triggerAutomations:", err.message);
    }
  }
}

module.exports = new AutomationService();
