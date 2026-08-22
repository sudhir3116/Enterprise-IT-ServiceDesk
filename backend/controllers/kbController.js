const KnowledgeArticle = require("../models/KnowledgeArticle");
const KnowledgeAnalytics = require("../models/KnowledgeAnalytics");
const aiService = require("../services/aiService");
const { logAudit } = require("../utils/auditLogger");

// Helper function to generate URL slug
function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w\-]+/g, "")
    .replace(/\-\-+/g, "-");
}

// ── GET /api/articles ─────────────────────────────────────────────────────────
const getArticles = async (req, res, next) => {
  try {
    const visibilityAllowed = ["public"];
    if (req.user && req.user.organizationId) {
      visibilityAllowed.push("organization");
    }
    if (req.user && ["admin", "support_engineer", "agent"].includes(req.user.role)) {
      visibilityAllowed.push("internal");
    }

    const filter = {
      status: "published",
      visibility: { $in: visibilityAllowed }
    };

    if (req.user && req.user.organizationId) {
      filter.$or = [
        { organizationId: req.user.organizationId?._id || req.user.organizationId },
        { organizationId: null },
        { visibility: "public" }
      ];
    }

    if (req.query.category) {
      filter.category = req.query.category;
    }

    if (req.query.q) {
      filter.$text = { $search: req.query.q };
    }

    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const skip = (page - 1) * limit;

    const [total, articles] = await Promise.all([
      KnowledgeArticle.countDocuments(filter),
      KnowledgeArticle.find(filter)
        .populate("author", "name email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
    ]);

    res.status(200).json({
      data: articles,
      articles,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasMore: page * limit < total,
    });
  } catch (error) {
    next(error);
  }
};

// ── GET /api/articles/search ──────────────────────────────────────────────────
const searchArticles = async (req, res, next) => {
  try {
    const query = req.query.q || "";
    const results = await aiService.searchSimilarArticles(query, req.user, 10);
    res.status(200).json({ success: true, count: results.length, articles: results });
  } catch (error) {
    next(error);
  }
};

// ── GET /api/articles/:slug ───────────────────────────────────────────────────
const getArticleBySlug = async (req, res, next) => {
  try {
    const { slug } = req.params;
    
    // Find by slug or ID
    let article = await KnowledgeArticle.findOne({ slug })
      .populate("author", "name email");

    if (!article && slug.match(/^[0-9a-fA-F]{24}$/)) {
      article = await KnowledgeArticle.findById(slug).populate("author", "name email");
    }

    if (!article) {
      return res.status(404).json({ message: "Knowledge article not found." });
    }

    // Access control verification
    if (article.visibility === "internal" && !["admin", "support_engineer", "agent"].includes(req.user?.role)) {
      return res.status(403).json({ message: "Access Forbidden: Internal article restricted to staff." });
    }

    if (article.visibility === "organization" && req.user?.organizationId) {
      const userOrg = req.user.organizationId?._id?.toString() || req.user.organizationId?.toString();
      const artOrg = article.organizationId?._id?.toString() || article.organizationId?.toString();
      if (artOrg && userOrg !== artOrg && req.user?.role !== "admin") {
        return res.status(403).json({ message: "Access Forbidden: Article restricted to organization members." });
      }
    }

    // Increment view count
    article.viewsCount = (article.viewsCount || 0) + 1;
    await article.save();

    res.status(200).json(article);
  } catch (error) {
    next(error);
  }
};

// ── POST /api/articles ────────────────────────────────────────────────────────
const createArticle = async (req, res, next) => {
  try {
    const { title, summary, content, body, category, tags, visibility, status } = req.body;

    const articleTitle = title || "Untitled Article";
    const articleSlug = slugify(articleTitle) + "-" + Date.now();
    const articleContent = content || body || "";

    const article = await KnowledgeArticle.create({
      organizationId: req.user.organizationId?._id || req.user.organizationId,
      title: articleTitle,
      slug: articleSlug,
      summary: summary || articleContent.substring(0, 150),
      content: articleContent,
      body: articleContent,
      category: category || "Getting Started",
      tags: Array.isArray(tags) ? tags : (tags ? tags.split(",").map(t => t.trim()) : []),
      visibility: visibility || "public",
      status: status || "published",
      author: req.user._id,
    });

    await logAudit({
      entity: "KnowledgeArticle",
      entityId: article._id,
      action: "ARTICLE_CREATED",
      performedBy: req.user._id,
      details: { title: article.title, visibility: article.visibility }
    }).catch(() => {});

    res.status(201).json({
      success: true,
      message: "Knowledge article published successfully.",
      article
    });
  } catch (error) {
    next(error);
  }
};

// ── PUT /api/articles/:id ─────────────────────────────────────────────────────
const updateArticle = async (req, res, next) => {
  try {
    const { id } = req.params;
    const article = await KnowledgeArticle.findById(id);

    if (!article) {
      return res.status(404).json({ message: "Article not found." });
    }

    if (req.body.title) {
      article.title = req.body.title;
      article.slug = slugify(req.body.title) + "-" + Date.now();
    }
    if (req.body.summary !== undefined) article.summary = req.body.summary;
    if (req.body.content !== undefined || req.body.body !== undefined) {
      article.content = req.body.content || req.body.body;
      article.body = req.body.content || req.body.body;
    }
    if (req.body.category) article.category = req.body.category;
    if (req.body.tags) article.tags = Array.isArray(req.body.tags) ? req.body.tags : req.body.tags.split(",").map(t => t.trim());
    if (req.body.visibility) article.visibility = req.body.visibility;
    if (req.body.status) article.status = req.body.status;

    await article.save();

    res.status(200).json({
      success: true,
      message: "Knowledge article updated successfully.",
      article
    });
  } catch (error) {
    next(error);
  }
};

// ── DELETE /api/articles/:id ──────────────────────────────────────────────────
const deleteArticle = async (req, res, next) => {
  try {
    const { id } = req.params;
    await KnowledgeArticle.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: "Knowledge article deleted successfully."
    });
  } catch (error) {
    next(error);
  }
};

// ── POST /api/articles/:id/vote ───────────────────────────────────────────────
const voteArticleHelpful = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { helpful } = req.body;

    const article = await KnowledgeArticle.findById(id);
    if (!article) {
      return res.status(404).json({ message: "Article not found." });
    }

    if (helpful) {
      article.helpfulCount = (article.helpfulCount || 0) + 1;
    } else {
      article.notHelpfulCount = (article.notHelpfulCount || 0) + 1;
    }

    await article.save();

    res.status(200).json({
      success: true,
      message: "Thank you for your feedback!",
      helpfulCount: article.helpfulCount,
      notHelpfulCount: article.notHelpfulCount
    });
  } catch (error) {
    next(error);
  }
};

// ── POST /api/ai/suggest ──────────────────────────────────────────────────────
const getAISuggestions = async (req, res, next) => {
  try {
    const { title, description } = req.body;
    const result = await aiService.suggestTicketSolutions(title, description, req.user);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

// ── POST /api/ai/ticket-assist ────────────────────────────────────────────────
const getAITicketAssistance = async (req, res, next) => {
  try {
    const { ticketId } = req.body;
    const result = await aiService.getTicketResolutionAssistance(ticketId, req.user);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getArticles,
  searchArticles,
  getArticleBySlug,
  createArticle,
  updateArticle,
  deleteArticle,
  voteArticleHelpful,
  getAISuggestions,
  getAITicketAssistance,
};
