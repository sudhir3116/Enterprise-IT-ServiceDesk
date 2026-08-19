const User = require("../models/User");
const { logAudit } = require("../utils/auditLogger");
const notificationService = require("./notificationService");

class RoutingService {
  /**
   * Automatically routes and assigns an unassigned ticket to an optimal support engineer.
   */
  async autoAssignTicket(ticket) {
    try {
      if (!ticket || ticket.assignedTo) {
        return ticket; // Already assigned
      }

      // Find active support engineers who are not offline
      const candidates = await User.find({
        role: { $in: ["support_engineer", "agent"] },
        accountStatus: "active",
        isApproved: true,
        availability: { $ne: "offline" }
      });

      if (!candidates || candidates.length === 0) {
        console.warn(`[Routing Engine] No active support engineers available to route ticket ${ticket.ticketNumber}`);
        return ticket;
      }

      // Filter candidates with available capacity (currentWorkload < maxCapacity) and availability !== 'busy'
      const availableCandidates = candidates.filter(
        c => (c.availability === "available" || !c.availability) && ((c.currentWorkload || 0) < (c.maxCapacity || 10))
      );

      const pool = availableCandidates.length > 0 ? availableCandidates : candidates;

      // 1. Skill-based matching (category matches engineer skills)
      const ticketCategory = ticket.category || "General";
      let matchedEngineer = pool.find(
        c => Array.isArray(c.skills) && c.skills.includes(ticketCategory)
      );

      // 2. Workload-based selection (if multiple or no skill match, pick engineer with lowest workload)
      if (!matchedEngineer) {
        pool.sort((a, b) => (a.currentWorkload || 0) - (b.currentWorkload || 0));
        matchedEngineer = pool[0];
      }

      if (matchedEngineer) {
        ticket.assignedTo = matchedEngineer._id;
        ticket.status = "Assigned";

        // Increment engineer workload
        matchedEngineer.currentWorkload = (matchedEngineer.currentWorkload || 0) + 1;
        await matchedEngineer.save();

        // Add history entry
        if (!ticket.history) ticket.history = [];
        ticket.history.push({
          action: "Ticket Auto-Assigned",
          performedBy: "Routing Engine",
          detail: `Assigned to ${matchedEngineer.name} (${matchedEngineer.email}) based on category '${ticketCategory}' & workload balancing.`,
          date: new Date(),
        });

        await ticket.save();

        console.log(`[Routing Engine] Ticket ${ticket.ticketNumber} auto-assigned to ${matchedEngineer.name}`);

        // Create audit log
        await logAudit({
          entity: "Ticket",
          entityId: ticket._id,
          action: "Ticket Auto-Assigned",
          performedBy: matchedEngineer._id,
          details: { engineerName: matchedEngineer.name, category: ticketCategory },
        }).catch(() => {});

        // Dispatch notification
        await notificationService.notifyTicketAssigned(ticket, matchedEngineer).catch(() => {});
      }

      return ticket;
    } catch (err) {
      console.error("[Routing Engine] Error in autoAssignTicket:", err.message);
      return ticket;
    }
  }

  /**
   * Recalculates currentWorkload for an engineer based on open/assigned tickets in DB.
   */
  async syncEngineerWorkload(engineerId) {
    try {
      const Ticket = require("../models/Ticket");
      const openCount = await Ticket.countDocuments({
        assignedTo: engineerId,
        status: { $nin: ["Resolved", "Closed"] },
        isDeleted: false,
      });

      await User.findByIdAndUpdate(engineerId, { 
        currentWorkload: openCount,
        currentTicketCount: openCount
      });
    } catch (err) {
      console.error("[Routing Engine] Error syncing engineer workload:", err.message);
    }
  }
}

module.exports = new RoutingService();
