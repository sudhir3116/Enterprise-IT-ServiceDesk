const mongoose = require("mongoose");

const knowledgeAnalyticsSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      index: true,
    },
    articleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "KnowledgeArticle",
      required: true,
      index: true,
    },
    views: {
      type: Number,
      default: 0,
    },
    helpfulCount: {
      type: Number,
      default: 0,
    },
    notHelpfulCount: {
      type: Number,
      default: 0,
    },
    searchCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

knowledgeAnalyticsSchema.index({ organizationId: 1, articleId: 1 });

module.exports = mongoose.model("KnowledgeAnalytics", knowledgeAnalyticsSchema);
