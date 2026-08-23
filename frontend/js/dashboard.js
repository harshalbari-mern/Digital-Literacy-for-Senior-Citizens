// ==========================================
// USER DASHBOARD (MongoDB Backend Integration)
// ==========================================

const API_BASE_URL = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://127.0.0.1:5000"
    : "";

const DASHBOARD_MODULES = [
    { id: "smartphone", statusId: "status-smartphone", path: "smartphone.html" },
    { id: "whatsapp", statusId: "status-whatsapp", path: "whatsapp.html" },
    { id: "upi", statusId: "status-upi", path: "upi.html" },
    { id: "cyber", statusId: "status-cyber", path: "cyber.html" },
    { id: "internet", statusId: "status-internet", path: "internet.html" },
    { id: "video-call", statusId: "status-video", path: "video-call.html" }
];

document.addEventListener("DOMContentLoaded", async function () {
    // 1. Check Authentication
    const token = localStorage.getItem("token");
    const cachedUser = JSON.parse(localStorage.getItem("user") || "null");

    if (!token || !cachedUser) {
        localStorage.setItem("redirectAfterLogin", "dashboard.html");
        window.location.href = "login.html";
        return;
    }

    const userName = document.getElementById("userName");
    const progressText = document.getElementById("dashboardProgressText");
    const progressFill = document.getElementById("dashboardProgressFill");
    const completedModulesElem = document.getElementById("completedModules");
    const quizScoreElement = document.getElementById("quizScore");
    const certificateStatus = document.getElementById("certificateStatus");
    const certificateBtn = document.getElementById("certificateBtn");

    // Show instant cached name
    if (userName) {
        userName.textContent = cachedUser.name || cachedUser.email;
    }

    // 2. Fetch authoritative data from MongoDB
    try {
        const response = await fetch(`${API_BASE_URL}/api/dashboard/stats`, {
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        if (response.ok) {
            const data = await response.json();

            // Update user info
            if (userName && data.user && data.user.name) {
                userName.textContent = data.user.name;
            }

            const stats = data.stats;

            // Update progress text & bars
            if (progressText) {
                progressText.textContent = `${stats.completedCount} / ${stats.totalModules} Completed`;
            }
            if (completedModulesElem) {
                completedModulesElem.textContent = `${stats.completedCount} / ${stats.totalModules}`;
            }
            if (progressFill) {
                progressFill.style.width = `${stats.progressPercentage}%`;
            }

            // Update Quiz Score
            if (quizScoreElement) {
                if (stats.quiz && stats.quiz.score !== null && stats.quiz.score !== undefined) {
                    quizScoreElement.textContent = `${stats.quiz.score} / 15`;
                } else {
                    quizScoreElement.textContent = "Not Attempted";
                }
            }

            // Update Certificate Status
            const isCertUnlocked = Boolean(stats.certificate && stats.certificate.eligible);
            if (certificateStatus) {
                certificateStatus.textContent = isCertUnlocked ? "Unlocked 🎓" : "Locked 🔒";
            }
            if (certificateBtn) {
                certificateBtn.disabled = !isCertUnlocked;
            }

            // Update 6 Module Cards
            DASHBOARD_MODULES.forEach(mod => {
                const element = document.getElementById(mod.statusId);
                if (element) {
                    const isDone = stats.moduleDetails && stats.moduleDetails[mod.id];
                    const statusText = element.querySelector(".module-status-text");

                    if (isDone) {
                        element.classList.add("completed");
                        if (statusText) statusText.textContent = "✓ Completed";
                    } else {
                        element.classList.remove("completed");
                        if (statusText) statusText.textContent = "Not Completed";
                    }
                }
            });

            // Update local cache
            localStorage.setItem("userProgress", JSON.stringify({
                completedModules: stats.completedModules,
                progressPercentage: stats.progressPercentage
            }));

            return;
        } else if (response.status === 401) {
            // Token expired or invalid
            localStorage.removeItem("token");
            localStorage.removeItem("user");
            window.location.href = "login.html";
            return;
        }
    } catch (error) {
        console.warn("Could not load dashboard stats from backend, using local fallback:", error);
    }

    // 3. Fallback to local cache if offline or network error
    const cachedProgress = JSON.parse(localStorage.getItem("userProgress") || "{}");
    const completedList = Array.isArray(cachedProgress.completedModules) ? cachedProgress.completedModules : [];
    const count = completedList.length;
    const percentage = Math.round((count / 6) * 100);

    if (progressText) progressText.textContent = `${count} / 6 Completed`;
    if (completedModulesElem) completedModulesElem.textContent = `${count} / 6`;
    if (progressFill) progressFill.style.width = `${percentage}%`;

    if (quizScoreElement) {
        quizScoreElement.textContent = "Not Attempted";
    }

    if (certificateStatus) {
        certificateStatus.textContent = "Locked 🔒";
    }
    if (certificateBtn) {
        certificateBtn.disabled = true;
    }

    DASHBOARD_MODULES.forEach(mod => {
        const element = document.getElementById(mod.statusId);
        if (element) {
            const isDone = completedList.includes(mod.id);
            const statusText = element.querySelector(".module-status-text");
            if (isDone) {
                element.classList.add("completed");
                if (statusText) statusText.textContent = "✓ Completed";
            } else {
                element.classList.remove("completed");
                if (statusText) statusText.textContent = "Not Completed";
            }
        }
    });
});

// ==========================================
// LOGOUT
// ==========================================

function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("userProgress");
    localStorage.removeItem("quizPassed");
    localStorage.removeItem("quizScore");
    window.location.href = "login.html";
}
