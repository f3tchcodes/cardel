const form = document.getElementById("signupForm");

form.addEventListener("submit", async function (e) {
    e.preventDefault(); // stop normal redirect

    const formData = new FormData(form);
    const formDataObject = Object.fromEntries(formData.entries());
    const formDataJson = JSON.stringify(formDataObject);

    try {
        const res = await fetch("/api/auth/signup", {
            method: "POST",
            body: formDataJson,
            headers: {
                "Content-Type": "application/json",
            },
        });

        const data = await res.json();

        if (data.redirect_url) {
            window.location.href = data.redirect_url;
        }

        // Remove old alerts if any
        const oldError = document.getElementById("error");
        const oldSuccess = document.getElementById("sent");
        if (oldError) oldError.remove();
        if (oldSuccess) oldSuccess.remove();

        // Create message box
        const box = document.createElement("div");
        box.id = data.error ? "error" : "sent";
        box.className = data.error ? "error" : "alert info";
        box.innerText = (data.error ? "❌ " : "📩 ") + data.message;

        // Insert above form
        form.parentNode.insertBefore(box, form);
    } catch (err) {
        console.error(err);
        alert("Network error. Try again.");
    }
});
