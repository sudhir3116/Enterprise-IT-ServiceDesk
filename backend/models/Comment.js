const mongoose = require("mongoose");

const commentSchema = new mongoose.Schema(
  {
    ticket: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Ticket",
      required: true,
      index: true,
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    body: {
      type: String,
      required: true,
    },
    isInternal: {
      type: Boolean,
      default: false,
      index: true,
    },
    type: {
      type: String,
      enum: ["public_reply", "internal_note", "system_update"],
      default: "public_reply",
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

commentSchema.index({ ticket: 1, isInternal: 1, createdAt: 1 });

module.exports = mongoose.model("Comment", commentSchema);
