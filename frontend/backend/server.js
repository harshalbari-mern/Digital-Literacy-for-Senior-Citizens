const cors = require("cors");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const User = require("./models/User");
const Progress = require("./models/Progress");
const Certificate = require("./models/Certificate");
const InternshipApplication = require("./models/InternshipApplication");
const crypto = require("crypto");
const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");

dotenv.config(); 

const app = express();
const PORT = process.env.PORT || 5000;
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();
app.use(cors());
app.use(express.json());

// MongoDB connect
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log("MongoDB connected successfully!"))
  .catch((err) => console.error("MongoDB connection error:", err));

app.get("/", (req, res) => {
  res.send("Backend server is running!");
});
app.use(express.json());

app.post("/api/signup", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        message: "All fields are required"
      });
    }

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(400).json({
        message: "Email already registered"
      });
    }
const hashedPassword = await bcrypt.hash(password, 10);

const user = await User.create({
  name,
  email,
  password: hashedPassword,
  role: ADMIN_EMAIL && email.trim().toLowerCase() === ADMIN_EMAIL ? "admin" : "user"
});

    res.status(201).json({
      message: "Signup successful",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });

  } catch (error) {
    console.error("Signup error:", error);

    res.status(500).json({
      message: "Server error"
    });
  }
});
app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required"
      });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({
        message: "Invalid email or password"
      });
    }

    const isPasswordCorrect = await bcrypt.compare(
      password,
      user.password
    );

    if (!isPasswordCorrect) {
      return res.status(401).json({
        message: "Invalid email or password"
      });
    }

    const token = jwt.sign(
      {
        userId: user._id,
        name: user.name,
        email: user.email,
        role: user.role || "user"
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "7d"
      }
    );

    const userProgress = await Progress.findOne({ userId: user._id });

    res.json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role || "user"
      },
      progress: userProgress
        ? {
            completedModules: userProgress.completedModules,
            progressPercentage: userProgress.progressPercentage
          }
        : {
            completedModules: [],
            progressPercentage: 0
          }
    });

  } catch (error) {
    console.error("Login error:", error);

    res.status(500).json({
      message: "Server error"
    });
  }
});

// ===============================
// AUTH MIDDLEWARE & HELPERS
// ===============================

const authMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Authentication required" });
    }
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

const normalizeModuleId = (id) => {
  if (!id) return "";
  const cleaned = String(id).split("/").pop().replace(".html", "").toLowerCase().trim();
  if (cleaned.includes("smartphone")) return "smartphone";
  if (cleaned.includes("whatsapp")) return "whatsapp";
  if (cleaned.includes("upi")) return "upi";
  if (cleaned.includes("cyber")) return "cyber";
  if (cleaned.includes("internet")) return "internet";
  if (cleaned.includes("video")) return "video-call";
  return cleaned;
};

const adminMiddleware = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.userId).select("role");
    if (!user || user.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }
    req.admin = user;
    next();
  } catch (error) {
    return res.status(500).json({ message: "Unable to verify admin access" });
  }
};

const REQUIRED_MODULES = ["smartphone", "whatsapp", "upi", "cyber", "internet", "video-call"];
const QUIZ_TOTAL_QUESTIONS = 15;
const QUIZ_PASSING_SCORE = 12;
const QUIZ_ANSWER_KEY = [0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

const isCertificateEligible = (progress) => {
  const completedModules = progress ? progress.completedModules : [];
  return Boolean(
    progress &&
    progress.quizScore >= QUIZ_PASSING_SCORE &&
    REQUIRED_MODULES.every(moduleId => completedModules.includes(moduleId))
  );
};

const createCertificateId = () =>
  `DLSC-${new Date().getUTCFullYear()}-${crypto.randomBytes(6).toString("hex").toUpperCase()}`;

const getOrCreateCertificate = async (user, progress) => {
  if (!isCertificateEligible(progress)) return null;

  const existingCertificate = await Certificate.findOne({ userId: user._id });
  if (existingCertificate) return existingCertificate;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const certificate = await Certificate.create({
        userId: user._id,
        certificateId: createCertificateId(),
        userName: user.name,
        quizScore: progress.quizScore
      });
      progress.certificateId = certificate.certificateId;
      await progress.save();
      return certificate;
    } catch (error) {
      if (error && error.code === 11000) {
        const concurrentCertificate = await Certificate.findOne({ userId: user._id });
        if (concurrentCertificate) return concurrentCertificate;
        continue;
      }
      throw error;
    }
  }

  throw new Error("Unable to generate a unique certificate ID");
};

// ===============================
// MODULE PROGRESS API
// ===============================

// Save module completion
app.post("/api/progress", async (req, res) => {
  try {
    let userId = null;

    // First check Authorization header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      try {
        const token = authHeader.split(" ")[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        userId = decoded.userId;
      } catch (err) {
        return res.status(401).json({ message: "Invalid or expired token" });
      }
    } else if (req.body.userId) {
      userId = req.body.userId;
    }

    if (!userId) {
      return res.status(401).json({
        message: "Authentication required to save progress"
      });
    }

    const { moduleId } = req.body;
    const normalizedModuleId = normalizeModuleId(moduleId);

    if (!normalizedModuleId) {
      return res.status(400).json({
        message: "Valid moduleId is required"
      });
    }

    let progress = await Progress.findOne({ userId });

    if (!progress) {
      progress = await Progress.create({
        userId,
        completedModules: [normalizedModuleId],
        progressPercentage: Math.round((1 / 6) * 100)
      });
    } else {
      if (!progress.completedModules.includes(normalizedModuleId)) {
        progress.completedModules.push(normalizedModuleId);
      }
      progress.progressPercentage = Math.min(
        100,
        Math.round((progress.completedModules.length / 6) * 100)
      );
      await progress.save();
    }

    res.json({
      message: "Module progress saved",
      completedModules: progress.completedModules,
      progressPercentage: progress.progressPercentage
    });

  } catch (error) {
    console.error("Progress save error:", error);

    res.status(500).json({
      message: "Server error saving progress"
    });
  }
});

// Get authenticated user's progress
app.get("/api/progress", authMiddleware, async (req, res) => {
  try {
    const progress = await Progress.findOne({
      userId: req.user.userId
    });

    if (!progress) {
      return res.json({
        completedModules: [],
        progressPercentage: 0
      });
    }

    res.json({
      completedModules: progress.completedModules,
      progressPercentage: progress.progressPercentage
    });

  } catch (error) {
    console.error("Progress fetch error:", error);

    res.status(500).json({
      message: "Server error fetching progress"
    });
  }
});

// Get user's progress by userId (backward compatibility)
app.get("/api/progress/:userId", async (req, res) => {
  try {
    const progress = await Progress.findOne({
      userId: req.params.userId
    });

    if (!progress) {
      return res.json({
        completedModules: [],
        progressPercentage: 0
      });
    }

    res.json({
      completedModules: progress.completedModules,
      progressPercentage: progress.progressPercentage
    });

  } catch (error) {
    console.error("Progress fetch error:", error);

    res.status(500).json({
      message: "Server error"
    });
  }
});

// ===============================
// DASHBOARD STATS API (Authenticated)
// ===============================

app.get("/api/dashboard/stats", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const progress = await Progress.findOne({ userId: user._id });

    const storedModules = progress ? progress.completedModules : [];
    const completedModules = REQUIRED_MODULES.filter(m => storedModules.includes(m));
    const remainingModules = REQUIRED_MODULES.filter(m => !completedModules.includes(m));
    const completedCount = completedModules.length;
    const remainingCount = remainingModules.length;
    const progressPercentage = progress
      ? Math.round((completedCount / REQUIRED_MODULES.length) * 100)
      : Math.round((completedCount / 6) * 100);

    const moduleDetails = {
      smartphone: completedModules.includes("smartphone"),
      whatsapp: completedModules.includes("whatsapp"),
      upi: completedModules.includes("upi"),
      cyber: completedModules.includes("cyber"),
      internet: completedModules.includes("internet"),
      "video-call": completedModules.includes("video-call")
    };

    const quizAttempted = progress && progress.quizScore !== null && progress.quizScore !== undefined;
    const quizScore = quizAttempted ? progress.quizScore : null;
    const quizPassed = progress ? Boolean(progress.quizPassed) : false;
    const certificateEligible = isCertificateEligible(progress);

    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt
      },
      stats: {
        totalModules: 6,
        completedCount,
        remainingCount,
        progressPercentage,
        completedModules,
        remainingModules,
        moduleDetails,
        quiz: {
          attempted: quizAttempted,
          score: quizScore,
          passed: quizPassed
        },
        certificate: {
          eligible: certificateEligible,
          status: certificateEligible ? "Unlocked 🎓" : "Locked 🔒",
          certificateId: progress ? progress.certificateId : null
        }
      }
    });

  } catch (error) {
    console.error("Dashboard stats fetch error:", error);
    res.status(500).json({
      message: "Server error fetching dashboard statistics"
    });
  }
});

app.get("/api/dashboard", authMiddleware, async (req, res) => {
  res.redirect(307, "/api/dashboard/stats");
});

// ===============================
// INTERNSHIP APPLICATION API
// ===============================

app.post("/api/internships", async (req, res) => {
  try {
    const { fullName, email, mobileNumber, collegeName, domain, skills, resumeFileName } = req.body || {};
    if (![fullName, email, mobileNumber, collegeName, domain].every(value => typeof value === "string" && value.trim())) {
      return res.status(400).json({ message: "Please complete all required internship application fields" });
    }

    let userId = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const decoded = jwt.verify(authHeader.split(" ")[1], process.env.JWT_SECRET);
      userId = decoded.userId;
    }

    const application = await InternshipApplication.create({
      userId,
      fullName,
      email,
      mobileNumber,
      collegeName,
      domain,
      skills,
      resumeFileName
    });

    res.status(201).json({ message: "Internship application submitted successfully", applicationId: application._id });
  } catch (error) {
    if (error.name === "JsonWebTokenError" || error.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Invalid or expired token" });
    }
    console.error("Internship application error:", error);
    res.status(500).json({ message: "Server error submitting internship application" });
  }
});

// ===============================
// ADMIN API (Authenticated + Authorized)
// ===============================

app.get("/api/admin/dashboard", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const [users, progressRecords, certificates, internships, totalUsers] = await Promise.all([
      User.find().select("name email role createdAt").sort({ createdAt: -1 }).lean(),
      Progress.find().select("userId completedModules progressPercentage quizScore quizPassed certificateId").lean(),
      Certificate.find().select("userId certificateId userName quizScore issuedAt").sort({ issuedAt: -1 }).lean(),
      InternshipApplication.find().select("fullName email mobileNumber collegeName domain skills resumeFileName userId createdAt").sort({ createdAt: -1 }).lean(),
      User.countDocuments()
    ]);

    const progressByUserId = new Map(progressRecords.map(progress => [String(progress.userId), progress]));
    const certificateByUserId = new Map(certificates.map(certificate => [String(certificate.userId), certificate]));
    const userSummaries = users.map(user => {
      const progress = progressByUserId.get(String(user._id));
      const certificate = certificateByUserId.get(String(user._id));
      return {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role || "user",
        createdAt: user.createdAt,
        progress: {
          completedModules: progress ? progress.completedModules : [],
          progressPercentage: progress ? progress.progressPercentage : 0
        },
        quiz: {
          score: progress && progress.quizScore !== null ? progress.quizScore : null,
          passed: progress ? Boolean(progress.quizPassed) : false
        },
        certificate: certificate ? {
          certificateId: certificate.certificateId,
          quizScore: certificate.quizScore,
          issuedAt: certificate.issuedAt
        } : null
      };
    });

    res.json({
      totals: {
        users: totalUsers,
        certificates: certificates.length,
        internships: internships.length
      },
      users: userSummaries,
      certificates,
      internships
    });
  } catch (error) {
    console.error("Admin dashboard error:", error);
    res.status(500).json({ message: "Server error fetching admin dashboard" });
  }
});

// ===============================
// CERTIFICATE API
// ===============================

app.get("/api/certificate", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select("name");
    const progress = await Progress.findOne({ userId: req.user.userId });

    if (!user) return res.status(404).json({ message: "User not found" });
    if (!isCertificateEligible(progress)) {
      return res.status(403).json({
        message: "Certificate is locked. Complete all 6 modules and score at least 12 out of 15 in the quiz.",
        eligible: false
      });
    }

    const certificate = await getOrCreateCertificate(user, progress);
    res.json({
      eligible: true,
      certificate: {
        userName: certificate.userName,
        certificateId: certificate.certificateId,
        quizScore: certificate.quizScore,
        issuedAt: certificate.issuedAt
      }
    });
  } catch (error) {
    console.error("Certificate fetch error:", error);
    res.status(500).json({ message: "Server error fetching certificate" });
  }
});

// Public verification exposes only certificate-safe information, never account data.
app.get("/api/certificates/verify/:certificateId", async (req, res) => {
  try {
    const certificateId = String(req.params.certificateId || "").trim().toUpperCase();
    if (!/^DLSC-\d{4}-[A-F0-9]{12}$/.test(certificateId)) {
      return res.status(400).json({ valid: false, message: "Invalid certificate ID format" });
    }

    const certificate = await Certificate.findOne({ certificateId });
    if (!certificate) {
      return res.status(404).json({ valid: false, message: "Certificate not found" });
    }

    res.json({
      valid: true,
      certificate: {
        userName: certificate.userName,
        certificateId: certificate.certificateId,
        quizScore: certificate.quizScore,
        issuedAt: certificate.issuedAt,
        course: "Digital Literacy for Senior Citizens"
      }
    });
  } catch (error) {
    console.error("Certificate verification error:", error);
    res.status(500).json({ valid: false, message: "Server error verifying certificate" });
  }
});
// ===============================
// QUIZ EVALUATION & SUBMISSION API (Authenticated)
// ===============================

// Check if user is eligible to take quiz
app.get("/api/quiz/status", authMiddleware, async (req, res) => {
  try {
    const progress = await Progress.findOne({ userId: req.user.userId });
    const storedModules = progress ? progress.completedModules : [];
    const completedModules = REQUIRED_MODULES.filter(m => storedModules.includes(m));
    const completedCount = completedModules.length;
    const canAttempt = completedCount === REQUIRED_MODULES.length;

    res.json({
      canAttempt,
      completedCount,
      totalModules: 6,
      completedModules,
      quizScore: progress ? progress.quizScore : null,
      quizPassed: progress ? Boolean(progress.quizPassed) : false
    });
  } catch (error) {
    console.error("Quiz status error:", error);
    res.status(500).json({ message: "Server error fetching quiz status" });
  }
});

function calculateQuizScore(answers) {
  if (!answers || typeof answers !== "object" || Array.isArray(answers)) {
    return null;
  }

  let score = 0;
  for (let i = 1; i <= QUIZ_TOTAL_QUESTIONS; i++) {
    const answer = answers[`q${i}`];
    if (!Number.isInteger(answer) || answer < 0 || answer > 3) return null;
    if (answer === QUIZ_ANSWER_KEY[i - 1]) {
      score += 1;
    }
  }

  return Math.max(0, Math.min(QUIZ_TOTAL_QUESTIONS, score));
}

// Securely evaluate quiz answers and save score in MongoDB
app.post("/api/quiz/submit", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    const requestedUserId = req.body && req.body.userId;

    if (requestedUserId && String(requestedUserId) !== String(userId)) {
      return res.status(403).json({
        message: "You are not allowed to submit a quiz for another user."
      });
    }

    let progress = await Progress.findOne({ userId });
    const completedModules = progress ? progress.completedModules : [];
    const allCompleted = REQUIRED_MODULES.every(m => completedModules.includes(m));

    if (!allCompleted) {
      return res.status(403).json({
        message: "Quiz is locked! You must complete all 6 learning modules before taking the quiz.",
        completedCount: completedModules.length,
        totalModules: REQUIRED_MODULES.length,
        canAttempt: false
      });
    }

    const { answers } = req.body;
    if (!answers || typeof answers !== "object" || Array.isArray(answers)) {
      return res.status(400).json({
        message: "Quiz answers are required to evaluate the assessment."
      });
    }

    const expectedAnswerKeys = Array.from({ length: QUIZ_TOTAL_QUESTIONS }, (_, index) => `q${index + 1}`);
    if (Object.keys(answers).length !== QUIZ_TOTAL_QUESTIONS || !expectedAnswerKeys.every(key => Object.prototype.hasOwnProperty.call(answers, key))) {
      return res.status(400).json({
        message: `Please answer all ${QUIZ_TOTAL_QUESTIONS} quiz questions before submitting.`
      });
    }

    const finalScore = calculateQuizScore(answers);
    if (finalScore === null) {
      return res.status(400).json({
        message: "Invalid quiz answer format."
      });
    }

    const passed = finalScore >= QUIZ_PASSING_SCORE;

    if (!progress) {
      progress = new Progress({
        userId,
        completedModules,
        progressPercentage: 100
      });
    }

    progress.quizScore = finalScore;
    progress.quizPassed = passed;
    await progress.save();

    const user = passed ? await User.findById(userId).select("name") : null;
    const certificate = passed ? await getOrCreateCertificate(user, progress) : null;

    res.json({
      message: passed
        ? "🎉 Congratulations! You passed the quiz."
        : `❌ You scored ${finalScore} / ${QUIZ_TOTAL_QUESTIONS}. Passing marks: ${QUIZ_PASSING_SCORE} / ${QUIZ_TOTAL_QUESTIONS}. Please review and try again.`,
      score: finalScore,
      total: QUIZ_TOTAL_QUESTIONS,
      passingScore: QUIZ_PASSING_SCORE,
      passed,
      certificateEligible: Boolean(certificate),
      certificateId: certificate ? certificate.certificateId : null
    });

  } catch (error) {
    console.error("Quiz submission error:", error);
    res.status(500).json({
      message: "Server error evaluating quiz"
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
