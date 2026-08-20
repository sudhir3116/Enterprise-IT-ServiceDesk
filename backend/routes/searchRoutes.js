const express = require("express");
const router = express.Router();
const Ticket = require("../models/Ticket");
const KnowledgeArticle = require("../models/KnowledgeArticle");
const User = require("../models/User");
const { protect, requireRole } = require("../middleware/authMiddleware");

/**
 * GET /api/search?q=<query>&type=all|tickets|kb|users&limit=10
 *
 * Global search endpoint.
 * - Admins/Engineers: search tickets, KB articles, users
 * - Employees: search only their own tickets + KB articles
 */
router.get("/", requireRole(), async (req, res, next) => {
  try {
    const { q, type = "all", limit = 10 } = req.query;
    if (!q || q.trim().length < 2) {
      return res.status(400).json({ message: "Search query must be at least 2 characters" });
    }

    const searchTerm  = q.trim();
    const maxResults  = Math.min(parseInt(limit) || 10, 30);
    const role        = req.user.role;
    const isStaff     = ["admin", "support_engineer"].includes(role);
    const regex       = { $regex: searchTerm, $options: "i" };

    const results = { tickets: [], kb: [], users: [] };

    // ── Tickets ────────────────────────────────────────────
    if (["all", "tickets"].includes(type)) {
      const ticketFilter = {
        isDeleted: false,
        $or: [{ title: regex }, { description: regex }, { ticketNumber: regex }],
      };
      if (!isStaff) ticketFilter.createdBy = req.user._id; // employees see only their own

      const tickets = await Ticket.find(ticketFilter, "ticketNumber title status priority category createdAt createdBy")
        .populate("createdBy", "name")
        .sort({ createdAt: -1 })
        .limit(maxResults);

      results.tickets = tickets.map(t => ({
        _id:          t._id,
        ticketNumber: t.ticketNumber,
        title:        t.title,
        status:       t.status,
        priority:     t.priority,
        category:     t.category,
        createdAt:    t.createdAt,
        requester:    t.createdBy?.name,
        type:         "ticket",
        url:          `/ticket/${t._id}`,
      }));
    }

    // ── Knowledge Base articles ────────────────────────────
    if (["all", "kb"].includes(type)) {
      const kbFilter = {
        $or: [{ title: regex }, { body: regex }],
      };
      const articles = await KnowledgeArticle.find(kbFilter, "-chunks")
        .sort({ createdAt: -1 })
        .limit(maxResults);

      results.kb = articles.map(a => ({
        _id:      a._id,
        title:    a.title,
        category: a.category,
        tags:     a.tags,
        type:     "kb",
        url:      `/kb/${a._id}`,
      }));
    }

    // ── Users (admin only) ─────────────────────────────────
    if (["all", "users"].includes(type) && role === "admin") {
      const userFilter = {
        $or: [{ name: regex }, { email: regex }, { employeeId: regex }],
      };
      const users = await User.find(userFilter, "name email role department employeeId")
        .limit(maxResults);

      results.users = users.map(u => ({
        _id:        u._id,
        name:       u.name,
        email:      u.email,
        role:       u.role,
        department: u.department,
        type:       "user",
        url:        `/admin/users`,
      }));
    }

    const totalCount = results.tickets.length + results.kb.length + results.users.length;
    res.json({ query: searchTerm, totalCount, results });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
