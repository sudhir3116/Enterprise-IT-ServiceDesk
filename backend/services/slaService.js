const SlaPolicy = require("../models/SlaPolicy");
const Organization = require("../models/Organization");
const Ticket = require("../models/Ticket");
const { logAudit } = require("../utils/auditLogger");
const notificationService = require("./notificationService");

const DEFAULT_SLA_MATRIX = {
  enterprise: {
    Critical: { responseMinutes: 15, resolutionMinutes: 120 },   // 15m / 2h
    High:     { responseMinutes: 60, resolutionMinutes: 480 },   // 1h / 8h
    Medium:   { responseMinutes: 120, resolutionMinutes: 1440 }, // 2h / 24h
    Low:      { responseMinutes: 240, resolutionMinutes: 2880 }, // 4h / 48h
  },
  pro: {
    Critical: { responseMinutes: 30, resolutionMinutes: 240 },   // 30m / 4h
    High:     { responseMinutes: 120, resolutionMinutes: 720 },  // 2h / 12h
    Medium:   { responseMinutes: 240, resolutionMinutes: 2880 }, // 4h / 48h
    Low:      { responseMinutes: 480, resolutionMinutes: 4320 }, // 8h / 72h
  },
  free: {
    Critical: { responseMinutes: 240, resolutionMinutes: 1440 },  // 4h / 24h
    High:     { responseMinutes: 480, resolutionMinutes: 2880 },  // 8h / 48h
    Medium:   { responseMinutes: 1440, resolutionMinutes: 4320 }, // 24h / 72h
    Low:      { responseMinutes: 2880, resolutionMinutes: 7200 }, // 48h / 120h
  },
};

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/**
 * Calculates deadline Date by advancing forward through business hours schedule.
 * If businessHours disabled or not configured, falls back to 24/7 continuous minutes.
 */
function addMinutesWithBusinessHours(startDate, minutesToAdd, bhConfig) {
  if (!bhConfig || bhConfig.is247) {
    return new Date(startDate.getTime() + minutesToAdd * 60 * 1000);
  }

  const workingDays = new Set(
    (bhConfig.workingDays && bhConfig.workingDays.length > 0)
      ? bhConfig.workingDays
      : ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
  );

  const [startH, startM] = (bhConfig.startTime || "09:00").split(":").map(Number);
  const [endH, endM]     = (bhConfig.endTime || "17:00").split(":").map(Number);

  let current = new Date(startDate);
  let remainingMinutes = minutesToAdd;

  while (remainingMinutes > 0) {
    const dayName = DAY_NAMES[current.getDay()];

    // Check if today is a working day
    if (workingDays.has(dayName)) {
      const dayStart = new Date(current);
      dayStart.setHours(startH, startM, 0, 0);

      const dayEnd = new Date(current);
      dayEnd.setHours(endH, endM, 0, 0);

      if (current < dayStart) {
        current = dayStart; // Fast-forward to start of business day
      }

      if (current < dayEnd) {
        const availableInDay = Math.floor((dayEnd - current) / 60000);

        if (remainingMinutes <= availableInDay) {
          current = new Date(current.getTime() + remainingMinutes * 60000);
          remainingMinutes = 0;
          break;
        } else {
          remainingMinutes -= availableInDay;
          current = new Date(dayEnd);
        }
      }
    }

    // Advance to start of next calendar day (midnight)
    current.setHours(24, 0, 0, 0);
  }

  return current;
}

class SlaService {
  /**
   * Calculates SLA first response due & resolution due deadlines for a ticket.
   */
  async calculateDeadlines(organizationId, priority = "Medium") {
    let responseMinutes = 120;
    let resolutionMinutes = 1440;
    let useBusinessHours = false;
    let policyId = null;

    let org = null;
    if (organizationId) {
      org = await Organization.findById(organizationId);
    }

    // 1. Check custom SlaPolicy in DB
    const policyQuery = organizationId 
      ? { organizationId, priority, isActive: true } 
      : { priority, isActive: true };
      
    const customPolicy = await SlaPolicy.findOne(policyQuery);

    if (customPolicy) {
      policyId = customPolicy._id;
      responseMinutes = customPolicy.firstResponseTime;
      resolutionMinutes = customPolicy.resolutionTime;
      useBusinessHours = customPolicy.businessHours;
    }

    // 2. Fallback to plan defaults if no custom policy
    if (!policyId) {
      const plan = org?.plan?.toLowerCase() || "free";
      const planMatrix = DEFAULT_SLA_MATRIX[plan] || DEFAULT_SLA_MATRIX.free;
      const target = planMatrix[priority] || planMatrix.Medium;

      responseMinutes = target.responseMinutes;
      resolutionMinutes = target.resolutionMinutes;
      useBusinessHours = (plan === "enterprise"); // Enterprise defaults to business hours governance
    }

    const now = new Date();
    const bhConfig = {
      is247: !useBusinessHours,
      workingDays: org?.businessHours?.workingDays || ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      startTime: org?.businessHours?.startTime || "09:00",
      endTime: org?.businessHours?.endTime || "17:00",
    };

    const firstResponseDue = addMinutesWithBusinessHours(now, responseMinutes, bhConfig);
    const resolutionDue    = addMinutesWithBusinessHours(now, resolutionMinutes, bhConfig);

    return {
      policyId,
      firstResponseDue,
      resolutionDue,
      breached: false,
      responseBreached: false,
      resolutionBreached: false,
    };
  }

  /**
   * Periodically checks all open/assigned tickets for SLA breaches.
   */
  async evaluateBreaches() {
    try {
      const now = new Date();

      // Find tickets that are not resolved/closed
      const activeTickets = await Ticket.find({
        status: { $nin: ["Resolved", "Closed"] },
        isDeleted: false,
      }).populate("assignedTo createdBy organizationId");

      let breachesDetected = 0;

      for (const ticket of activeTickets) {
        let updated = false;

        if (!ticket.sla) {
          ticket.sla = { breached: false, responseBreached: false, resolutionBreached: false };
        }

        // Check Response Breach
        if (
          ticket.sla.firstResponseDue &&
          !ticket.sla.firstRespondedAt &&
          now > new Date(ticket.sla.firstResponseDue) &&
          !ticket.sla.responseBreached
        ) {
          ticket.sla.responseBreached = true;
          ticket.sla.breached = true;
          ticket.slaBreached = true;
          updated = true;

          // Dispatch SLA Response Breach Notification
          await notificationService.notifySlaBreach(ticket, "response");
        }

        // Check Resolution Breach
        if (
          ticket.sla.resolutionDue &&
          !ticket.resolvedAt &&
          now > new Date(ticket.sla.resolutionDue) &&
          !ticket.sla.resolutionBreached
        ) {
          ticket.sla.resolutionBreached = true;
          ticket.sla.breached = true;
          ticket.slaBreached = true;
          updated = true;

          // Dispatch SLA Resolution Breach Notification
          await notificationService.notifySlaBreach(ticket, "resolution");
        }

        if (updated) {
          await ticket.save();
          breachesDetected++;
          await logAudit({
            entity: "Ticket",
            entityId: ticket._id,
            action: "SLA_BREACHED",
            performedBy: ticket.assignedTo?._id || ticket.createdBy?._id,
            details: {
              ticketNumber: ticket.ticketNumber,
              responseBreached: ticket.sla.responseBreached,
              resolutionBreached: ticket.sla.resolutionBreached,
            },
          }).catch(() => {});
        }
      }

      if (breachesDetected > 0) {
        console.log(`[SLA Engine] Evaluated active tickets. Detected & updated ${breachesDetected} SLA breach events.`);
      }
    } catch (err) {
      console.error("[SLA Engine] Error evaluating SLA breaches:", err.message);
    }
  }
}

module.exports = new SlaService();
