const KnowledgeArticle = require("../models/KnowledgeArticle");
const Ticket = require("../models/Ticket");

class AIService {
  /**
   * Generates a lightweight vector embedding simulation (fallback for offline mode).
   */
  generateEmbedding(text) {
    if (!text) return new Array(16).fill(0);
    const vector = new Array(16).fill(0);
    const str = String(text).toLowerCase();
    for (let i = 0; i < str.length; i++) {
      const code = str.charCodeAt(i);
      vector[i % 16] = (vector[i % 16] + code) % 100 / 100;
    }
    return vector;
  }

  /**
   * Computes cosine similarity between two numeric vectors.
   */
  cosineSimilarity(vecA, vecB) {
    if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }
    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Performs semantic article search using query text and user access control filters.
   */
  async searchSimilarArticles(query, user, limit = 5) {
    if (!query) return [];

    const keywords = query.toLowerCase().split(/\s+/).filter(k => k.length > 2);
    
    // Visibility rules: public or same organization or internal for staff
    const visibilityAllowed = ["public"];
    if (user && user.organizationId) {
      visibilityAllowed.push("organization");
    }
    if (user && ["admin", "support_engineer", "agent"].includes(user.role)) {
      visibilityAllowed.push("internal");
    }

    const filter = {
      status: "published",
      visibility: { $in: visibilityAllowed }
    };

    if (user && user.organizationId) {
      filter.$or = [
        { organizationId: user.organizationId?._id || user.organizationId },
        { organizationId: null },
        { visibility: "public" }
      ];
    }

    const articles = await KnowledgeArticle.find(filter);

    // Score articles based on title, summary, content, and tags keyword matches
    const scored = articles.map(art => {
      let score = 0;
      const titleLower = art.title.toLowerCase();
      const summaryLower = (art.summary || "").toLowerCase();
      const contentLower = (art.content || art.body || "").toLowerCase();
      const tagsLower = (art.tags || []).join(" ").toLowerCase();

      keywords.forEach(kw => {
        if (titleLower.includes(kw)) score += 10;
        if (tagsLower.includes(kw)) score += 7;
        if (summaryLower.includes(kw)) score += 5;
        if (contentLower.includes(kw)) score += 2;
      });

      return { article: art, score };
    });

    return scored
      .filter(item => item.score > 0 || keywords.length === 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(item => item.article);
  }

  /**
   * Generates AI suggestions for ticket creation workflow.
   */
  async suggestTicketSolutions(title, description, user) {
    const combinedQuery = `${title} ${description}`;
    const suggestedArticles = await this.searchSimilarArticles(combinedQuery, user, 4);

    let confidenceScore = 0.75;
    if (suggestedArticles.length > 0) confidenceScore = 0.92;

    return {
      success: true,
      confidenceScore,
      suggestedArticles: suggestedArticles.map(a => ({
        id: a._id,
        title: a.title,
        slug: a.slug,
        summary: a.summary || (a.content ? a.content.substring(0, 150) + "..." : ""),
        category: a.category
      })),
      aiSummary: suggestedArticles.length > 0
        ? `We found ${suggestedArticles.length} articles that match your issue. Please review them before submitting a ticket.`
        : "No matching knowledge base articles found. Proceed with ticket submission."
    };
  }

  /**
   * Generates AI resolution assistant recommendations for support engineers.
   */
  async getTicketResolutionAssistance(ticketId, user) {
    const ticket = await Ticket.findById(ticketId);
    if (!ticket) throw new Error("Ticket not found.");

    const articles = await this.searchSimilarArticles(`${ticket.title} ${ticket.category}`, user, 3);
    
    // Find similar resolved tickets
    const similarTickets = await Ticket.find({
      _id: { $ne: ticket._id },
      category: ticket.category,
      status: { $in: ["Resolved", "Closed"] }
    }).limit(3);

    return {
      success: true,
      recommendedArticles: articles.map(a => ({ id: a._id, title: a.title, slug: a.slug })),
      similarSolvedTickets: similarTickets.map(t => ({
        id: t._id,
        ticketNumber: t.ticketNumber,
        title: t.title,
        resolutionSummary: t.resolutionSummary || "Resolved by applying standard diagnostic steps."
      })),
      suggestedResponse: `Hello! Based on incident classification '${ticket.category}', please follow these resolution steps:\n1. Verify connection status.\n2. Review system diagnostic log.\n3. Apply patch if required.`
    };
  }
}

module.exports = new AIService();
