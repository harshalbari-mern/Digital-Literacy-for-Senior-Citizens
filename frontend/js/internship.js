document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("internshipForm");
    if (!form) return;

    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const submitButton = form.querySelector(".submit-application");
        const formData = new FormData(form);
        const resume = form.elements.resume.files[0];
        const token = localStorage.getItem("token");
        const API_BASE = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
            ? "http://127.0.0.1:5000"
            : "";

        const application = {
            fullName: formData.get("fullName"),
            email: formData.get("email"),
            mobileNumber: formData.get("mobileNumber"),
            collegeName: formData.get("collegeName"),
            domain: formData.get("domain"),
            skills: formData.get("skills"),
            resumeFileName: resume ? resume.name : null
        };

        try {
            submitButton.disabled = true;
            submitButton.textContent = "Submitting...";
            const response = await fetch(`${API_BASE}/api/internships`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...(token ? { Authorization: `Bearer ${token}` } : {})
                },
                body: JSON.stringify(application)
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || "Unable to submit application");

            form.reset();
            alert("Your internship application has been submitted successfully.");
        } catch (error) {
            console.error("Internship application submission error:", error);
            alert(error.message || "Unable to submit application. Please try again.");
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = "Submit Application";
        }
    });
});
