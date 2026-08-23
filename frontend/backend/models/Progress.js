const mongoose = require("mongoose");

const progressSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true
    },

    completedModules: {
      type: [String],
      default: []
    },

    progressPercentage: {
      type: Number,
      default: 0
    },

    quizScore: {
      type: Number,
      min: 0,
      max: 15,
      default: null
    },

    quizPassed: {
      type: Boolean,
      default: false
    },

    certificateId: {
      type: String,
      default: null
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("Progress", progressSchema);
