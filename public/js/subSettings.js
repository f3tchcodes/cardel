// --- GLOBAL CONFIG & STATE ---
let currentSettingsUnit = "month"; 
const settingsRanges = { day: 7, week: 4, month: 12, year: 10 };

const subsList = document.getElementById("subsList");
const settingsOverlay = document.getElementById("cdl-settingsOverlay");

// Helper to format Date for <input type="datetime-local">
function formatToDateTimeLocal(dateStr) {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return "";
    return date.toISOString().slice(0, 16);
}

// --- 1. OPEN MODAL & AUTO-POPULATE DATA ---
if (subsList) {
    subsList.addEventListener("click", (e) => {
        const gearBtn = e.target.closest(".gear-btn");
        if (gearBtn) {
            const row = gearBtn.closest(".sub-row");

            // Extract data
            const subId = row.dataset.id || "";
            const subName = row.dataset.name || row.querySelector(".sub-name").textContent;
            const subRate = row.dataset.rate || row.querySelector(".sub-rate").textContent.replace(/[^0-9.]/g, "");
            const subStart = row.dataset.start || ""; 
            const subInterval = row.dataset.interval || "1";
            const subUnit = row.dataset.unit || "month";
            const iconSrc = row.querySelector(".sub-icon img").src;

            // Paste into fields
            document.getElementById("cdl-settingsSubId").value = subId;
            document.getElementById("cdl-settingsName").value = subName;
            document.getElementById("cdl-settingsRate").value = subRate;
            document.getElementById("cdl-settingsStart").value = formatToDateTimeLocal(subStart);
            document.getElementById("cdl-settingsIconPreview").src = iconSrc;

            // Set Dropdown State
            currentSettingsUnit = subUnit;
            const formattedUnit = subUnit.charAt(0).toUpperCase() + subUnit.slice(1) + "(s)";
            document.querySelector("#cdl-settings-drop-unit .selected").textContent = formattedUnit;
            
            populateSettingsValues(subUnit); 
            document.querySelector("#cdl-settings-drop-val .selected").textContent = subInterval;
            updateSettingsBillingFields();

            // Open Modal
            settingsOverlay.classList.add("cdl-open");
            document.body.style.overflow = "hidden";
        }
    });
}

// --- 2. DROPDOWN LOGIC ---
function updateSettingsBillingFields() {
    const valElement = document.querySelector("#cdl-settings-drop-val .selected");
    const interval = valElement ? parseInt(valElement.textContent) : 1;
    
    // Hidden inputs for form submission if needed
    const typeInput = document.getElementById("settingsBillingType");
    const intervalInput = document.getElementById("settingsBillingInterval");
    if (typeInput) typeInput.value = currentSettingsUnit;
    if (intervalInput) intervalInput.value = interval;
}

function populateSettingsValues(unit) {
    const valMenu = document.getElementById("cdl-settings-val-menu");
    if (!valMenu) return;
    const max = settingsRanges[unit] || 12;
    valMenu.innerHTML = "";

    for (let i = 1; i <= max; i++) {
        const item = document.createElement("div");
        item.className = "dropdown-item";
        item.textContent = i;
        item.addEventListener("click", (e) => {
            e.stopPropagation();
            document.querySelector("#cdl-settings-drop-val .selected").textContent = i;
            document.getElementById("cdl-settings-drop-val").classList.remove("open");
            updateSettingsBillingFields();
        });
        valMenu.appendChild(item);
    }
}

// Toggle Dropdowns
document.querySelectorAll("#cdl-settingsOverlay .dropdown-input").forEach((input) => {
    input.addEventListener("click", (e) => {
        e.stopPropagation(); 
        const parent = input.parentElement;
        document.querySelectorAll("#cdl-settingsOverlay .dropdown").forEach((d) => {
            if (d !== parent) d.classList.remove("open");
        });
        parent.classList.toggle("open");
    });
});

// Unit Change
document.querySelectorAll("#cdl-settings-drop-unit .dropdown-item").forEach((item) => {
    item.addEventListener("click", (e) => {
        e.stopPropagation();
        currentSettingsUnit = item.dataset.value;
        document.querySelector("#cdl-settings-drop-unit .selected").textContent = item.textContent;
        document.querySelector("#cdl-settings-drop-val .selected").textContent = "1";
        populateSettingsValues(currentSettingsUnit);
        document.getElementById("cdl-settings-drop-unit").classList.remove("open");
        updateSettingsBillingFields();
    });
});

// --- 3. UI EXTRAS (Tooltip & Advanced) ---
const settingsCancelInput = document.getElementById("cdl-settingsCancelInput");
const settingsTooltip = document.getElementById("cdl-settings-tooltip");

if (settingsCancelInput && settingsTooltip) {
    settingsCancelInput.parentElement.addEventListener("mousemove", (e) => {
        if (settingsCancelInput.classList.contains("free")) {
            settingsTooltip.style.display = "block";
            settingsTooltip.style.left = e.clientX + "px";
            settingsTooltip.style.top = e.clientY + "px";
        }
    });
    settingsCancelInput.parentElement.addEventListener("mouseleave", () => {
        settingsTooltip.style.display = "none";
    });
}

document.getElementById("cdl-settingsAdvToggle")?.addEventListener("click", () => {
    document.getElementById("cdl-settingsAdvPanel").classList.toggle("open");
    document.getElementById("cdl-settingsAdvArrow").classList.toggle("rotated");
});

// --- 4. CLOSE & DELETE ---
const closeSettingsModal = () => {
    settingsOverlay.classList.remove("cdl-open");
    document.body.style.overflow = "";
    // Reset dropdowns
    document.querySelectorAll("#cdl-settingsOverlay .dropdown").forEach(d => d.classList.remove("open"));
};

document.getElementById("cdl-closeSettings")?.addEventListener("click", closeSettingsModal);

window.addEventListener("click", () => {
    document.querySelectorAll(".dropdown").forEach((d) => d.classList.remove("open"));
});

document.getElementById("cdl-settingsDeleteBtn")?.addEventListener("click", async () => {
    const subId = document.getElementById("cdl-settingsSubId").value;
    if(!subId || !confirm("Are you sure?")) return;
    
    try {
        const res = await fetch("/api/user/subscriptions/delete", {
            method: "POST",
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sub_id: subId }),
        });
        if (res.ok) {
            closeSettingsModal();
            location.reload();
        }
    } catch (err) { alert("Delete failed."); }
});
