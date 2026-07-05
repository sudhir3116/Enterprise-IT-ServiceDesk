const express = require("express");
const router = express.Router();
const KnowledgeArticle = require("../models/KnowledgeArticle");
const { protect, requireRole } = require("../middleware/authMiddleware");

// ── GET /api/kb — list all articles (optionally filter by category/tag) ──────
router.get("/", protect, async (req, res, next) => {
  try {
    const { category, tag, search, limit = 20, page = 1 } = req.query;
    const filter = {};
    if (category) filter.category = category;
    if (tag)      filter.tags = tag;
    if (search)   filter.$or = [
      { title: { $regex: search, $options: "i" } },
      { body:  { $regex: search, $options: "i" } },
    ];

    const skip  = (parseInt(page) - 1) * parseInt(limit);
    const total = await KnowledgeArticle.countDocuments(filter);
    const articles = await KnowledgeArticle.find(filter, "-chunks")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    res.json({ articles, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/kb/:id — single article ─────────────────────────────────────────
router.get("/:id", protect, async (req, res, next) => {
  try {
    const article = await KnowledgeArticle.findById(req.params.id, "-chunks");
    if (!article) return res.status(404).json({ message: "Article not found" });
    res.json(article);
  } catch (err) {
    next(err);
  }
});

// ── POST /api/kb — create article (admin only) ────────────────────────────────
router.post("/", protect, requireRole("admin"), async (req, res, next) => {
  try {
    const { title, body, category, tags } = req.body;
    if (!title || !body || !category) {
      return res.status(400).json({ message: "title, body, and category are required" });
    }
    const article = await KnowledgeArticle.create({ title, body, category, tags: tags || [], chunks: [] });
    res.status(201).json(article);
  } catch (err) {
    next(err);
  }
});

// ── PUT /api/kb/:id — update article (admin only) ────────────────────────────
router.put("/:id", protect, requireRole("admin"), async (req, res, next) => {
  try {
    const { title, body, category, tags } = req.body;
    const article = await KnowledgeArticle.findByIdAndUpdate(
      req.params.id,
      { title, body, category, tags },
      { new: true, runValidators: true }
    );
    if (!article) return res.status(404).json({ message: "Article not found" });
    res.json(article);
  } catch (err) {
    next(err);
  }
});

// ── DELETE /api/kb/:id — delete article (admin only) ─────────────────────────
router.delete("/:id", protect, requireRole("admin"), async (req, res, next) => {
  try {
    const article = await KnowledgeArticle.findByIdAndDelete(req.params.id);
    if (!article) return res.status(404).json({ message: "Article not found" });
    res.json({ message: "Article deleted" });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
