const mongoose = require("mongoose");

const internshipApplicationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },
    fullName: { type: String, required: true, trim: true, maxlength: 100 },
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 120 },
    mobileNumber: { type: String, required: true, trim: true, maxlength: 30 },
    collegeName: { type: String, required: true, trim: true, maxlength: 150 },
    domain: { type: String, required: true, trim: true, maxlength: 100 },
    skills: { type: String, trim: true, maxlength: 1000 },
    resumeFileName: { type: String, trim: true, maxlength: 255, default: null }
  },
  { timestamps: true }
);

module.exports = mongoose.model("InternshipApplication", internshipApplicationSchema);
