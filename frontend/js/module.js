// ===============================
// LEARNING MODULE PROGRESS (MongoDB + Local Fallback)
// ===============================

const API_BASE_URL = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://127.0.0.1:5000"
    : "";

const ALL_MODULES = [
    { id: "smartphone", badgeId: "smartphoneStatus", path: "smartphone.html" },
    { id: "whatsapp", badgeId: "whatsappStatus", path: "whatsapp.html" },
    { id: "upi", badgeId: "upiStatus", path: "upi.html" },
    { id: "cyber", badgeId: "cyberStatus", path: "cyber.html" },
    { id: "internet", badgeId: "internetStatus", path: "internet.html" },
    { id: "video-call", badgeId: "videoCallStatus", path: "video-call.html" }
];

function getCurrentModuleId() {
    const path = window.location.pathname.toLowerCase();
    if (path.includes("smartphone")) return "smartphone";
    if (path.includes("whatsapp")) return "whatsapp";
    if (path.includes("upi")) return "upi";
    if (path.includes("cyber")) return "cyber";
    if (path.includes("internet")) return "internet";
    if (path.includes("video")) return "video-call";
    return "";
}

document.addEventListener("DOMContentLoaded", async () => {
    const totalModules = 6;
    const user = JSON.parse(localStorage.getItem("user") || "null");
    const token = localStorage.getItem("token");
    const userKey = user ? user.email : "guest";

    let completedModules = [];

    // Load from localStorage cache first for fast UI render
    try {
        const cached = JSON.parse(localStorage.getItem("userProgress") || "{}");
        if (Array.isArray(cached.completedModules)) {
            completedModules = cached.completedModules;
        }
    } catch (e) {}

    // Also check legacy localStorage keys
    ALL_MODULES.forEach(mod => {
        if (!completedModules.includes(mod.id)) {
            const legacyKey1 = `module_${userKey}_/frontend/modules/${mod.path}`;
            const legacyKey2 = `module_${userKey}_modules/${mod.path}`;
            if (localStorage.getItem(legacyKey1) === "completed" || localStorage.getItem(legacyKey2) === "completed") {
                completedModules.push(mod.id);
            }
        }
    });

    // If logged in, fetch authoritative progress from MongoDB
    if (token) {
        try {
            const res = await fetch(`${API_BASE_URL}/api/progress`, {
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            });
            if (res.ok) {
                const data = await res.json();
                if (Array.isArray(data.completedModules)) {
                    completedModules = data.completedModules;
                    localStorage.setItem("userProgress", JSON.stringify(data));

                    // Sync legacy keys
                    completedModules.forEach(modId => {
                        const m = ALL_MODULES.find(x => x.id === modId);
                        if (m) {
                            localStorage.setItem(`module_${userKey}_/frontend/modules/${m.path}`, "completed");
                            localStorage.setItem(`module_${userKey}_modules/${m.path}`, "completed");
                        }
                    });
                }
            }
        } catch (error) {
            console.warn("Could not fetch remote progress, using local cache:", error);
        }
    }

    // ===============================
    // 1. INDIVIDUAL MODULE PAGE
    // ===============================
    const completeBtn = document.getElementById("completeBtn");
    const currentModuleId = getCurrentModuleId();

    if (completeBtn && currentModuleId) {
        // Check if already completed
        if (completedModules.includes(currentModuleId)) {
            completeBtn.innerHTML = "✅ Completed";
            completeBtn.disabled = true;
        }

        completeBtn.addEventListener("click", async () => {
            completeBtn.disabled = true;
            completeBtn.innerHTML = "Saving...";

            let savedToMongo = false;

            if (token) {
                try {
                    const response = await fetch(`${API_BASE_URL}/api/progress`, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "Authorization": `Bearer ${token}`
                        },
                        body: JSON.stringify({ moduleId: currentModuleId })
                    });

                    if (response.ok) {
                        const data = await response.json();
                        savedToMongo = true;
                        if (Array.isArray(data.completedModules)) {
                            completedModules = data.completedModules;
                        } else if (!completedModules.includes(currentModuleId)) {
                            completedModules.push(currentModuleId);
                        }
                        localStorage.setItem("userProgress", JSON.stringify({
                            completedModules,
                            progressPercentage: Math.round((completedModules.length / totalModules) * 100)
                        }));
                    }
                } catch (err) {
                    console.warn("Backend save failed, fallback to local:", err);
                }
            }

            if (!savedToMongo && !completedModules.includes(currentModuleId)) {
                completedModules.push(currentModuleId);
                localStorage.setItem("userProgress", JSON.stringify({
                    completedModules,
                    progressPercentage: Math.round((completedModules.length / totalModules) * 100)
                }));
            }

            // Sync legacy storage
            const currentMod = ALL_MODULES.find(x => x.id === currentModuleId);
            if (currentMod) {
                localStorage.setItem(`module_${userKey}_/frontend/modules/${currentMod.path}`, "completed");
                localStorage.setItem(`module_${userKey}_modules/${currentMod.path}`, "completed");
            }

            alert("🎉 Module Completed Successfully!");
            completeBtn.innerHTML = "✅ Completed";
            completeBtn.disabled = true;
        });
    }

    // ===============================
    // 2. LEARN PAGE PROGRESS & BADGES
    // ===============================
    const progressText = document.getElementById("progressText");
    const progressFill = document.getElementById("overallProgressFill");

    // Update badges
    ALL_MODULES.forEach(mod => {
        const badge = document.getElementById(mod.badgeId);
        if (badge && completedModules.includes(mod.id)) {
            badge.textContent = "✓ Completed";
        }
    });

    // Update progress bar
    if (progressText && progressFill) {
        const percentage = Math.round((completedModules.length / totalModules) * 100);
        progressText.innerText = `${completedModules.length} / ${totalModules} Completed`;
        progressFill.style.width = percentage + "%";
    }
});
