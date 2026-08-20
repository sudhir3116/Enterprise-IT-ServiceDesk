const express = require("express");
const router = express.Router();

const {
  getArticles,
  searchArticles,
  getArticleBySlug,
  createArticle,
  updateArticle,
  deleteArticle,
  voteArticleHelpful,
} = require("../controllers/kbController");

const { protect, requireRole } = require("../middleware/authMiddleware");

// Public & Authenticated Article Routes
router.get("/", requireRole(), getArticles);
router.get("/search", requireRole(), searchArticles);
router.get("/:slug", requireRole(), getArticleBySlug);
router.post("/:id/vote", requireRole(), voteArticleHelpful);

// Staff & Admin Article Management
router.post("/", protect, requireRole("admin", "support_engineer", "agent"), createArticle);
router.put("/:id", protect, requireRole("admin", "support_engineer", "agent"), updateArticle);
router.delete("/:id", protect, requireRole("admin", "support_engineer", "agent"), deleteArticle);

module.exports = router;
