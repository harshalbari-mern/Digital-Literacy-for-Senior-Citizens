// ==========================================
// SHOW / HIDE PASSWORD (LOGIN & REGISTER)
// ==========================================

const showPassword = document.getElementById("showPassword");
const password = document.getElementById("password");

if (showPassword && password) {
    showPassword.addEventListener("change", function () {
        password.type = this.checked ? "text" : "password";
    });
}

const showRegisterPassword = document.getElementById("showRegisterPassword");
const regPassword = document.getElementById("regPassword");
const confirmPassword = document.getElementById("confirmPassword");

if (showRegisterPassword && regPassword) {
    showRegisterPassword.addEventListener("change", function () {
        const type = this.checked ? "text" : "password";
        regPassword.type = type;
        if (confirmPassword) confirmPassword.type = type;
    });
}

// ==========================================
// QUIZ PASSING EVALUATION (Backend Integrated)
// ==========================================

async function checkQuiz() {
    const answers = {};
    let unanswered = [];

    // Collect and validate all 15 questions
    for (let i = 1; i <= 15; i++) {
        const answer = document.querySelector('input[name="q' + i + '"]:checked');
        if (answer) {
            answers['q' + i] = Number(answer.value);
        } else {
            unanswered.push(i);
        }
    }

    if (unanswered.length > 0) {
        alert("⚠️ Please answer Question " + unanswered[0] + " before submitting the quiz.");
        const qElem = document.querySelector('input[name="q' + unanswered[0] + '"]');
        if (qElem) {
            qElem.scrollIntoView({ behavior: "smooth", block: "center" });
        }
        return;
    }

    const submitBtn = document.querySelector(".quiz-page button.login-btn, button[onclick='checkQuiz()']");
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = "Evaluating Quiz...";
    }

    const token = localStorage.getItem("token");
    const result = document.getElementById("result");
    const API_BASE = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
        ? "http://127.0.0.1:5000"
        : "";

    if (token) {
        try {
            const response = await fetch(`${API_BASE}/api/quiz/submit`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({ answers })
            });

            const data = await response.json();

            if (response.ok) {
                const score = data.score;
                if (result) {
                    result.innerHTML = `✅ Your Score : ${score} / 15`;
                }

                if (data.passed) {
                    localStorage.setItem("quizPassed", "true");
                    localStorage.setItem("quizScore", score);

                    alert(
                        "🎉 Congratulations!\n\n" +
                        `You Passed the Quiz with ${score} / 15.\n\n` +
                        "Your Certificate is now unlocked!"
                    );

                    window.location.href = "certificate.html";
                } else {
                    localStorage.removeItem("quizPassed");
                    localStorage.setItem("quizScore", score);

                    alert(
                        `❌ You Scored ${score} / 15\n\n` +
                        "Minimum Passing Marks = 12\n\n" +
                        "Please complete the learning modules and try again."
                    );
                }
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = "Submit Quiz";
                }
                return;
            } else if (response.status === 403) {
                alert(`🔒 ${data.message || "Please complete all 6 learning modules first."}`);
                window.location.href = "learn.html";
                return;
            }
        } catch (error) {
            console.warn("Backend quiz evaluation failed, using local calculation fallback:", error);
        }
    }

    if (result) {
        result.textContent = "Unable to submit your quiz. Please check your connection and try again.";
    }
    alert("Unable to submit your quiz. Please try again.");
    if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = "Submit Quiz";
    }
    return;

    // Local calculation fallback
    let localScore = 0;
    for (let i = 1; i <= 15; i++) {
        if (answers['q' + i] === "1" || answers['q' + i] === 1) {
            localScore += 1;
        }
    }

    if (result) {
        result.innerHTML = "✅ Your Score : " + localScore + " / 15";
    }

    if (localScore >= 12) {
        localStorage.setItem("quizPassed", "true");
        localStorage.setItem("quizScore", localScore);

        alert(
            "🎉 Congratulations!\n\n" +
            `You Passed the Quiz with ${localScore} / 15.\n\n` +
            "Your Certificate is now unlocked!"
        );

        window.location.href = "certificate.html";
    } else {
        localStorage.removeItem("quizPassed");
        localStorage.setItem("quizScore", localScore);

        alert(
            `❌ You Scored ${localScore} / 15\n\n` +
            "Minimum Passing Marks = 12\n\n" +
            "Please complete the learning modules and try again."
        );
    }

    if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = "Submit Quiz";
    }
}

// ==========================================
// ANIMATED COUNTERS
// ==========================================

const counters = document.querySelectorAll(".counter");

const startCounter = () => {
    counters.forEach(counter => {
        const target = +counter.getAttribute("data-target");
        let count = 0;
        const speed = target / 100;

        const updateCounter = () => {
            count += speed;
            if (count < target) {
                counter.innerText = Math.ceil(count);
                requestAnimationFrame(updateCounter);
            } else {
                if (target === 24) {
                    counter.innerText = "24/7";
                } else if (target === 500) {
                    counter.innerText = "500+";
                } else if (target === 100) {
                    counter.innerText = "100+";
                } else {
                    counter.innerText = target;
                }
            }
        };

        updateCounter();
    });
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            startCounter();
            observer.disconnect();
        }
    });
});

const statsSection = document.querySelector(".stats");
if (statsSection && counters.length > 0) {
    observer.observe(statsSection);
}

// ==========================================
// BACK TO TOP BUTTON
// ==========================================

const topButton = document.getElementById("topBtn");

window.addEventListener("scroll", function () {
    if (topButton) {
        if (document.body.scrollTop > 50 || document.documentElement.scrollTop > 50) {
            topButton.style.display = "block";
        } else {
            topButton.style.display = "none";
        }
    }
});

function topFunction() {
    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}

// ==========================================
// TYPING ANIMATION
// ==========================================

const words = [
    "Learn Smartphones",
    "Learn WhatsApp",
    "Learn UPI Payments",
    "Stay Safe Online",
    "Become Digitally Smart"
];

let wordIndex = 0;
let charIndex = 0;
let isDeleting = false;
const typingElement = document.getElementById("typing-text");

function typeEffect() {
    if (!typingElement) return;

    let currentWord = words[wordIndex];

    if (isDeleting) {
        typingElement.textContent = currentWord.substring(0, charIndex--);
    } else {
        typingElement.textContent = currentWord.substring(0, charIndex++);
    }

    let speed = isDeleting ? 60 : 120;

    if (!isDeleting && charIndex === currentWord.length + 1) {
        speed = 1500;
        isDeleting = true;
    } else if (isDeleting && charIndex === -1) {
        isDeleting = false;
        wordIndex = (wordIndex + 1) % words.length;
    }

    setTimeout(typeEffect, speed);
}

if (typingElement) {
    typeEffect();
}

// ==========================================
// SCROLL PROGRESS BAR
// ==========================================

window.addEventListener("scroll", () => {
    const progressBar = document.getElementById("progressBar");
    if (!progressBar) return;

    const scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
    const scrollHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;

    if (scrollHeight > 0) {
        const progress = (scrollTop / scrollHeight) * 100;
        progressBar.style.width = progress + "%";
    }
});

// ==========================================
// AI LOADER
// ==========================================

const loadingTexts = [
    "Preparing your experience...",
    "Loading learning modules...",
    "Almost Ready..."
];

let txt = 0;
const loading = document.getElementById("loadingText");
const loader = document.getElementById("loader");

if (loading) {
    const changeText = setInterval(() => {
        txt++;
        if (txt < loadingTexts.length && loading) {
            loading.innerHTML = loadingTexts[txt];
        }
    }, 500);

    window.addEventListener("load", () => {
        setTimeout(() => {
            clearInterval(changeText);
            if (loader) {
                loader.style.opacity = "0";
                setTimeout(() => {
                    loader.style.display = "none";
                }, 500);
            }
        }, 1700);
    });
} else if (loader) {
    loader.style.display = "none";
}

// ==========================================
// CAREER & INTERNSHIP PAGE INTERACTIONS
// ==========================================

document.addEventListener("DOMContentLoaded", function () {
    // Scroll Animation
    const animateElements = document.querySelectorAll(
        ".intern-card, .why-card, .step, .career-left, .career-right, .career-cta"
    );

    if (animateElements.length > 0) {
        const careerObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add("show");
                }
            });
        }, {
            threshold: 0.15
        });

        animateElements.forEach(element => {
            element.classList.add("hidden");
            careerObserver.observe(element);
        });
    }

    // Internship Apply Buttons
    const applyButtons = document.querySelectorAll(
        ".career-btns button, .career-cta button"
    );

    applyButtons.forEach(button => {
        button.addEventListener("click", function () {
            window.location.href = "internship-form.html";
        });
    });

    // Learn More Buttons
    const learnButtons = document.querySelectorAll(".intern-card button");

    learnButtons.forEach(button => {
        button.addEventListener("click", function () {
            const heading = this.parentElement.querySelector("h3");
            const cardName = heading ? heading.innerText : "Internship";
            alert("📚 " + cardName + "\n\nDetails will be available soon.");
        });
    });

    // Smooth Scroll for local anchors
    document.querySelectorAll("a[href^='#']").forEach(anchor => {
        anchor.addEventListener("click", function (e) {
            const targetId = this.getAttribute("href");
            if (targetId && targetId !== "#") {
                const targetElement = document.querySelector(targetId);
                if (targetElement) {
                    e.preventDefault();
                    targetElement.scrollIntoView({
                        behavior: "smooth"
                    });
                }
            }
        });
    });
});

// Career Animation Styles
const careerAnimationStyle = document.createElement("style");
careerAnimationStyle.innerHTML = `
.hidden {
    opacity: 0;
    transform: translateY(40px);
    transition: all .8s ease;
}
.show {
    opacity: 1;
    transform: translateY(0);
}
.career-left.hidden {
    transform: translateX(-60px);
}
.career-right.hidden {
    transform: translateX(60px);
}
`;
document.head.appendChild(careerAnimationStyle);

function exploreInternships() {
    const section = document.querySelector(".internship-section");
    if (section) {
        section.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });
    }
}

function openInternshipForm() {
    const form = document.querySelector(".internship-form");
    if (form) {
        form.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });
    }
}

// ==========================================
// LOGIN - BACKEND CONNECTION
// ==========================================

const API_BASE = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://127.0.0.1:5000"
    : "";

const loginForm = document.getElementById("loginForm");

if (loginForm) {
    loginForm.addEventListener("submit", async function (e) {
        e.preventDefault();

        const email = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value;

        try {
            const response = await fetch(`${API_BASE}/api/login`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    email: email,
                    password: password
                })
            });

            const data = await response.json();

            if (response.ok) {
                localStorage.setItem("token", data.token);
                localStorage.setItem("user", JSON.stringify(data.user));

                if (data.progress) {
                    localStorage.setItem("userProgress", JSON.stringify(data.progress));
                    const userKey = data.user.email || "guest";
                    const allMods = ["smartphone.html", "whatsapp.html", "upi.html", "cyber.html", "internet.html", "video-call.html"];
                    if (Array.isArray(data.progress.completedModules)) {
                        data.progress.completedModules.forEach(modId => {
                            allMods.forEach(file => {
                                if (file.includes(modId) || (modId === "video-call" && file.includes("video"))) {
                                    localStorage.setItem(`module_${userKey}_/frontend/modules/${file}`, "completed");
                                    localStorage.setItem(`module_${userKey}_modules/${file}`, "completed");
                                }
                            });
                        });
                    }
                }

                alert("Login successful! 🎉");

                if (data.user.role === "admin") {
                    localStorage.removeItem("redirectAfterLogin");
                    window.location.href = "admin.html";
                } else {
                    const redirectPage = localStorage.getItem("redirectAfterLogin");
                    if (redirectPage) {
                        localStorage.removeItem("redirectAfterLogin");
                        window.location.href = redirectPage;
                    } else {
                        window.location.href = "index.html";
                    }
                }
            } else {
                alert(data.message || "Login failed");
            }
        } catch (error) {
            console.error("Login error:", error);
            alert("Unable to connect to server.");
        }
    });
}

// ==========================================
// REGISTER - BACKEND CONNECTION
// ==========================================

const registerForm = document.getElementById("registerForm");

if (registerForm) {
    registerForm.addEventListener("submit", async function (e) {
        e.preventDefault();

        const name = document.getElementById("regName").value.trim();
        const email = document.getElementById("regEmail").value.trim();
        const password = document.getElementById("regPassword").value;
        const confirmPassword = document.getElementById("confirmPassword").value;

        if (password !== confirmPassword) {
            alert("Passwords do not match!");
            return;
        }

        try {
            const response = await fetch(`${API_BASE}/api/signup`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    name: name,
                    email: email,
                    password: password
                })
            });

            const data = await response.json();

            if (response.ok) {
                alert("Registration successful! 🎉");
                window.location.href = "login.html";
            } else {
                alert(data.message || "Registration failed");
            }
        } catch (error) {
            console.error("Register error:", error);
            alert("Unable to connect to server.");
        }
    });
}

// ==========================================
// LOGGED-IN USER NAVBAR DISPLAY & LOGOUT
// ==========================================

document.addEventListener("DOMContentLoaded", function () {
    const user = JSON.parse(localStorage.getItem("user") || "null");
    const navButtons = document.querySelectorAll("header nav button, .navbar nav button");

    if (user) {
        navButtons.forEach(button => {
            if (button.textContent.trim().toLowerCase().includes("login") || button.classList.contains("logout-btn")) {
                button.innerHTML = `👤 ${user.name} | Logout`;
                button.onclick = function () {
                    localStorage.removeItem("token");
                    localStorage.removeItem("user");
                    localStorage.removeItem("userProgress");
                    window.location.href = "login.html";
                };
            }
        });
    }
});

// ==========================================
// PROTECT LEARN PAGE
// ==========================================

if (window.location.pathname.includes("learn.html")) {
    const token = localStorage.getItem("token");
    if (!token) {
        localStorage.setItem("redirectAfterLogin", "learn.html");
        alert("Please login first! 🔐");
        window.location.href = "login.html";
    }
}
document.addEventListener("DOMContentLoaded", () => {

    const moreBtn = document.getElementById("moreBtn");
    const moreMenu = document.getElementById("moreMenu");

    if (!moreBtn || !moreMenu) return;

    moreBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        moreMenu.classList.toggle("show");
    });

    document.addEventListener("click", () => {
        moreMenu.classList.remove("show");
    });

});