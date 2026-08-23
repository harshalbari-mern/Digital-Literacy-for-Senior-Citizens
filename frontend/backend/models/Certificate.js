const mongoose = require("mongoose");

const certificateSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true
    },
    certificateId: {
      type: String,
      required: true,
      unique: true,
      immutable: true
    },
    userName: {
      type: String,
      required: true,
      trim: true
    },
    quizScore: {
      type: Number,
      required: true,
      min: 12,
      max: 15
    },
    issuedAt: {
      type: Date,
      default: Date.now,
      immutable: true
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Certificate", certificateSchema);
