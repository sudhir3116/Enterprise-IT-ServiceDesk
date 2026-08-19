const mongoose = require("mongoose");

const chunkSchema = new mongoose.Schema({
  text: {
    type: String,
    required: true,
  },
  embedding: {
    type: [Number],
    required: true,
  },
});

const knowledgeArticleSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      index: true,
    },
    title: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      index: true,
      lowercase: true,
      trim: true,
    },
    summary: {
      type: String,
      default: "",
    },
    content: {
      type: String,
      required: true,
    },
    body: {
      type: String, // Backwards compatibility getter
    },
    category: {
      type: String,
      required: true,
      default: "Getting Started",
      index: true,
    },
    tags: [
      {
        type: String,
        index: true,
      },
    ],
    visibility: {
      type: String,
      enum: ["public", "organization", "internal"],
      default: "public",
      index: true,
    },
    status: {
      type: String,
      enum: ["draft", "published", "archived"],
      default: "published",
      index: true,
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    viewsCount: {
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
    chunks: [chunkSchema],

    // Module 8 — linkage from ticket resolution workflow
    sourceTicketId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Ticket",
      index: true,
    },
    relatedBugIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "BugReport",
      },
    ],
  },
  {
    timestamps: true,
  }
);

knowledgeArticleSchema.index({ organizationId: 1, category: 1, status: 1 });
knowledgeArticleSchema.index({ title: "text", summary: "text", content: "text", tags: "text" });

module.exports = mongoose.model("KnowledgeArticle", knowledgeArticleSchema);
