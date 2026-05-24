import {
    getSubList,
    sortSubscriptionsList,
    renderSubscriptions,
    subscriptions
} from "./dashboard.js";

const overlay = document.getElementById("cdl-addSubOverlaySettings");
const closeBtn = document.getElementById("cdl-closeAddSubSettings");
const cancelInput = document.getElementById("cdl-cancelInputSettings");
const tooltip = document.getElementById("cdl-custom-tooltipSettings");
const deleteBtn = document.getElementById("cdl-settingsDeleteBtnSettings");

const subsList = document.getElementById("subsList");


// ========================================
// SUBSCRIPTION SELECTION + OPEN SETTINGS
// ========================================

let currentSubId = null;

subsList.addEventListener("click", (e) => {
    const gearBtn = e.target.closest(".gear-btn");

    if (!gearBtn) return;

    // Open modal
    overlay.classList.add("cdl-open");
    document.body.style.overflow = "hidden";

    // Get clicked subscription row
    const subElement = gearBtn.closest(".sub-row");

    if (!subElement) return;

    // Find class like: sub_id_123
    const subIdClass = [...subElement.classList]
        .find(c => c.startsWith("sub_id_"));

    if (!subIdClass) return;

    currentSubId = subIdClass.replace(
        "sub_id_",
        ""
    );

    console.log(
        "opened settings for:",
        currentSubId
    );
});


// ========================================
// BILLING DROPDOWN LOGIC
// ========================================

let currentUnit = "month";

const ranges = {
    day: 7,
    week: 4,
    month: 12,
    year: 10
};

function updateBillingFields() {
    const interval = parseInt(
        document.querySelector(
            "#cdl-drop-valSettings .selectedSettings"
        ).textContent
    );

    document.getElementById(
        "subBillingTypeSettings"
    ).value = currentUnit;

    document.getElementById(
        "subBillingIntervalSettings"
    ).value = interval;
}

function populateValues(unit) {
    const valMenu = document.getElementById(
        "cdl-val-menuSettings"
    );

    const max = ranges[unit] || 12;

    valMenu.innerHTML = "";

    for (let i = 1; i <= max; i++) {
        const item = document.createElement(
            "div"
        );

        item.className =
            "dropdown-item dropdown-itemSettings";

        item.textContent = i;

        item.onclick = () => {
            document.querySelector(
                "#cdl-drop-valSettings .selectedSettings"
            ).textContent = i;

            document.getElementById(
                "cdl-drop-valSettings"
            ).classList.remove(
                "open"
            );

            updateBillingFields();
        };

        valMenu.appendChild(item);
    }
}


// ========================================
// DROPDOWN TOGGLES
// ========================================

document.querySelectorAll(
    ".dropdown-inputSettings"
)
.forEach(input => {
    input.addEventListener(
        "click",
        (e) => {
            const parent = input.parentElement;

            document.querySelectorAll(
                ".dropdownSettings"
            )
            .forEach(d => {
                if (d !== parent) {
                    d.classList.remove(
                        "open"
                    );
                }
            });

            parent.classList.toggle(
                "open"
            );

            e.stopPropagation();
        }
    );
});


// ========================================
// UNIT SELECTION
// ========================================

document.querySelectorAll(
    "#cdl-drop-unitSettings .dropdown-itemSettings"
)
.forEach(item => {
    item.addEventListener(
        "click",
        () => {
            currentUnit =
                item.dataset.value;

            document.querySelector(
                "#cdl-drop-unitSettings .selectedSettings"
            ).textContent =
                item.textContent;

            document.querySelector(
                "#cdl-drop-valSettings .selectedSettings"
            ).textContent = "1";

            populateValues(
                currentUnit
            );

            document.getElementById(
                "cdl-drop-unitSettings"
            )
            .classList.remove(
                "open"
            );

            updateBillingFields();
        }
    );
});


// ========================================
// TOOLTIP
// ========================================

cancelInput.parentElement.addEventListener(
    "mousemove",
    (e) => {
        if (
            cancelInput.classList.contains(
                "free"
            )
        ) {
            tooltip.style.display =
                "block";

            tooltip.style.left =
                e.clientX + "px";

            tooltip.style.top =
                e.clientY + "px";
        }
    }
);

cancelInput.parentElement.addEventListener(
    "mouseleave",
    () => {
        tooltip.style.display =
            "none";
    }
);


// ========================================
// ADVANCED TOGGLE
// ========================================

document.getElementById(
    "cdl-advToggleSettings"
)
.addEventListener(
    "click",
    () => {
        document.getElementById(
            "cdl-advPanelSettings"
        )
        .classList.toggle(
            "open"
        );

        document.getElementById(
            "cdl-advArrowSettings"
        )
        .classList.toggle(
            "rotated"
        );
    }
);


// ========================================
// ICON PREVIEW
// ========================================

document
.getElementById(
    "cdl-iconInputSettings"
)
.addEventListener(
    "change",
    function () {
        if (
            this.files &&
            this.files[0]
        ) {
            const reader =
                new FileReader();

            reader.onload =
                (e) => {
                    document.getElementById(
                        "cdl-iconPreviewSettings"
                    ).src =
                        e.target.result;
                };

            reader.readAsDataURL(
                this.files[0]
            );
        }
    }
);


// ========================================
// CLOSE MODAL
// ========================================

const closeModal = () => {
    overlay.classList.remove(
        "cdl-open"
    );

    document.body.style.overflow =
        "";
};

closeBtn.onclick = closeModal;

overlay.onclick = (e) => {
    if (
        e.target === overlay
    ) {
        closeModal();
    }
};

window.addEventListener(
    "click",
    () => {
        document.querySelectorAll(
            ".dropdownSettings"
        )
        .forEach(d =>
            d.classList.remove(
                "open"
            )
        );
    }
);


// ========================================
// DELETE
// ========================================

deleteBtn.addEventListener(
    "click",
    async () => {
        if (!currentSubId) return;

        console.log(
            "deleting:",
            currentSubId
        );

        await fetch(
            `/api/user/subscriptions/${currentSubId}`,
            {
                method: "DELETE"
            }
        );

        const rawData =
            await getSubList();

        sortSubscriptionsList(
            rawData
        );

        renderSubscriptions();

        closeModal();
    }
);

// ========================================
// EDIT
// ========================================
const form = document.getElementById("cdl-addSubFormSettings");

form.addEventListener("submit", async function (e) {
    e.preventDefault(); // stop normal redirect

    const formData = new FormData(form);
    formData.append("sub_id", currentSubId);

    try {
        const res = await fetch("/api/user/subscriptions/add", {
            method: "POST",
            body: formData,
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
        box.id = data.error ? "error" : "";
        box.className = data.error ? "error" : "";
        if (data.error) {
            box.innerText = `❌ ${data.message}`;
        } else {
            const overlay = document.getElementById("cdl-addSubOverlay");
            const rawData = await getSubList();

            sortSubscriptionsList(rawData);
            renderSubscriptions();
            form.reset();

            closeModal();
        }

        // Insert above form
        form.parentNode.insertBefore(box, form);
    } catch (err) {
        console.error(err);
        alert("Network error. Try again.");
    }
});


// ========================================
// INITIALIZE
// ========================================

populateValues("month");

updateBillingFields();
