const ADMIN_API_BASE = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://127.0.0.1:5000"
    : "";

const formatDate = (value) => value ? new Date(value).toLocaleDateString("en-IN") : "—";
const addCell = (row, value) => {
    const cell = document.createElement("td");
    cell.textContent = value ?? "—";
    row.appendChild(cell);
};

const renderRows = (elementId, records, createRow, emptyColumns) => {
    const table = document.getElementById(elementId);
    table.replaceChildren();
    if (!records.length) {
        const row = document.createElement("tr");
        const cell = document.createElement("td");
        cell.colSpan = emptyColumns;
        cell.textContent = "No records found.";
        row.appendChild(cell);
        table.appendChild(row);
        return;
    }
    records.forEach(record => table.appendChild(createRow(record)));
};

document.addEventListener("DOMContentLoaded", async () => {
    const token = localStorage.getItem("token");
    if (!token) {
        localStorage.setItem("redirectAfterLogin", "admin.html");
        window.location.href = "login.html";
        return;
    }

    try {
        const response = await fetch(`${ADMIN_API_BASE}/api/admin/dashboard`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const data = await response.json();
        if (response.status === 401) {
            localStorage.removeItem("token");
            localStorage.removeItem("user");
            window.location.href = "login.html";
            return;
        }
        if (!response.ok) {
            alert(data.message || "Admin access required");
            window.location.href = "dashboard.html";
            return;
        }

        document.getElementById("totalUsers").textContent = data.totals.users;
        document.getElementById("totalCertificates").textContent = data.totals.certificates;
        document.getElementById("totalInternships").textContent = data.totals.internships;

        renderRows("usersTable", data.users, user => {
            const row = document.createElement("tr");
            addCell(row, user.name); addCell(row, user.email); addCell(row, user.role);
            addCell(row, `${user.progress.completedModules.length} / 6`);
            addCell(row, user.quiz.score === null ? "Not attempted" : `${user.quiz.score} / 15 (${user.quiz.passed ? "Pass" : "Fail"})`);
            addCell(row, user.certificate ? user.certificate.certificateId : "—");
            return row;
        }, 6);

        renderRows("certificatesTable", data.certificates, certificate => {
            const row = document.createElement("tr");
            addCell(row, certificate.userName); addCell(row, certificate.certificateId);
            addCell(row, `${certificate.quizScore} / 15`); addCell(row, formatDate(certificate.issuedAt));
            return row;
        }, 4);

        renderRows("internshipsTable", data.internships, application => {
            const row = document.createElement("tr");
            addCell(row, application.fullName); addCell(row, application.email); addCell(row, application.mobileNumber);
            addCell(row, application.collegeName); addCell(row, application.domain); addCell(row, application.skills || "—");
            addCell(row, formatDate(application.createdAt));
            return row;
        }, 7);
    } catch (error) {
        console.error("Admin dashboard load error:", error);
        alert("Unable to load the admin dashboard.");
    }
});

function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("userProgress");
    window.location.href = "login.html";
}
