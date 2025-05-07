const mongoose = require("mongoose");

const reportSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: true,
      enum: ["Spam", "Inappropriate", "False Information", "Other"],
    },
    reportedItem: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Listing",
      required: true,
    },
    reason: {
      type: String,
      required: true,
    },
    reporter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "resolved", "dismissed"],
      default: "pending",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Report", reportSchema);
