const userSettingsBtn = document.querySelector(".userSettings");
const overlay = document.getElementById("cdl-userSettingsOverlay");
const closeBtn = document.getElementById("cdl-closeUserSettings");
const profileForm = document.getElementById("profileForm");

// OPEN MODAL
userSettingsBtn.addEventListener("click", () => {
    overlay.classList.add("cdl-open");
    document.body.style.overflow = "hidden";
});

// CLOSE MODAL (WITH ALERT CLEANUP)
function closeModal() {
    overlay.classList.remove("cdl-open");
    document.body.style.overflow = "";

    // Find and remove any existing alert notification boxes
    const oldError = document.getElementById("error");
    const oldSuccess = document.getElementById("sent");
    if (oldError) oldError.remove();
    if (oldSuccess) oldSuccess.remove();
}

closeBtn.addEventListener("click", closeModal);

overlay.addEventListener("click", e => {
    if (e.target === overlay) {
        closeModal();
    }
});

// TAB SWITCHING
document.querySelectorAll(".settings-tab").forEach(tab => {
    tab.addEventListener("click", () => {
        document.querySelectorAll(".settings-tab").forEach(
            t => t.classList.remove("settings-tab-active")
        );

        document.querySelectorAll(".settings-panel").forEach(
            p => p.classList.remove("settings-panel-active")
        );

        tab.classList.add("settings-tab-active");

        // Note: ensure you applied the HTML structural fix from earlier 
        // so that this ID matches your panel element perfectly!
        const targetPanel = document.getElementById(`${tab.dataset.tab}-panel`);
        if (targetPanel) {
            targetPanel.classList.add("settings-panel-active");
        }
    });
});

// PROFILE IMAGE PREVIEW (LOCAL PREVIEW)
document.getElementById("profilePictureInput").addEventListener("change", function() {
    if (this.files && this.files[0]) {
        const reader = new FileReader();
        reader.onload = e => {
            document.getElementById("profilePreview").src = e.target.result;
        };
        reader.readAsDataURL(this.files[0]);
    }
});

// ========================================
// PROFILE UPDATE SUBMISSION (MULTIPART)
// ========================================
profileForm.addEventListener("submit", async function (e) {
    e.preventDefault(); 

    const formData = new FormData(profileForm);

    try {
        const res = await fetch("/api/user/settings/profile", {
            method: "POST",
            body: formData,
        });

        const data = await res.json();

        if (data.redirect_url) {
            window.location.href = data.redirect_url;
            return;
        }

        // Clean up older alerts inside the form context before appending a new one
        const oldError = document.getElementById("error");
        const oldSuccess = document.getElementById("sent");
        if (oldError) oldError.remove();
        if (oldSuccess) oldSuccess.remove();

        const box = document.createElement("div");
        
        if (data.error) {
            box.id = "error";
            box.className = "error";
            box.innerText = `❌ ${data.message}`;
        } else {
            box.id = "sent";
            box.className = "alert info";
            box.innerText = `📩 ${data.message}`;

            const newUsername = formData.get("username");
            
            if (document.querySelector(".welcome__name")) {
                document.querySelector(".welcome__name").innerText = newUsername;
            }
            if (document.querySelector(".user-settings-username")) {
                document.querySelector(".user-settings-username").innerText = newUsername;
            }

            const fileInput = document.getElementById("profilePictureInput");
            if (fileInput.files && fileInput.files[0]) {
                const livePreviewUrl = document.getElementById("profilePreview").src;
                
                if (document.querySelector(".nav__pfp")) {
                    document.querySelector(".nav__pfp").src = livePreviewUrl;
                }
                if (document.querySelector(".user-settings-avatar")) {
                    document.querySelector(".user-settings-avatar").src = livePreviewUrl;
                }
            }
            
            fileInput.value = "";
        }

        profileForm.parentNode.insertBefore(box, profileForm);

    } catch (err) {
        console.error(err);
        alert("Network error processing your profile updates. Try again.");
    }
});

// ========================================
// ACCOUNT SETTINGS UPDATE SUBMISSION (JSON)
// ========================================
const accountPanel = document.getElementById("account-panel");

if (accountPanel) {
    const saveAccountBtn = accountPanel.querySelector(".btn-submit");

    saveAccountBtn.addEventListener("click", async function (e) {
        e.preventDefault();

        // Target individual data inputs inside the panel container context
        const emailInput = accountPanel.querySelector("input[name='account_email']");
        const currentPasswordInput = accountPanel.querySelector("input[name='current_password']");
        const newPasswordInput = accountPanel.querySelector("input[name='new_password']");

        // Prepare the plain JSON payload matching backend specifications
        const payload = {
            email: emailInput.value,
            current_password: currentPasswordInput.value,
            new_password: newPasswordInput.value
        };

        // Clean up older alerts inside the parent context before appending a new one
        const oldError = document.getElementById("error");
        const oldSuccess = document.getElementById("sent");
        if (oldError) oldError.remove();
        if (oldSuccess) oldSuccess.remove();

        try {
            const res = await fetch("/api/user/settings/account", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(payload)
            });

            const data = await res.json();

            if (data.redirect_url) {
                window.location.href = data.redirect_url;
                return;
            }

            const box = document.createElement("div");

            if (data.error) {
                box.id = "error";
                box.className = "error";
                box.innerText = `❌ ${data.message}`;
            } else {
                box.id = "sent";
                box.className = "alert info";
                box.innerText = `📩 ${data.message}`;

                // Flush out the sensitive text inputs on execution validation success
                currentPasswordInput.value = "";
                newPasswordInput.value = "";
            }

            // Insert the box right inside the account panel, above the content structure
            accountPanel.insertBefore(box, accountPanel.firstChild);

        } catch (err) {
            console.error(err);
            alert("Network error processing your account updates. Try again.");
        }
    });
}
