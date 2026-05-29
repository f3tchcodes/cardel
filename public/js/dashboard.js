const proCard = document.getElementById("pro-card");

proCard.addEventListener("click", () => {
    window.open("/pricing", "_blank");
});

/* -------------------------
   Global Toast Engine
-------------------------- */
function showToast(message, duration = 4000) {
    // 1. Ensure global container element exists
    let container = document.querySelector(".cdl-toast-container");
    if (!container) {
        container = document.createElement("div");
        container.className = "cdl-toast-container";
        document.body.appendChild(container);
    }

    // 2. Build individual toast instance
    const toast = document.createElement("div");
    toast.className = "cdl-toast";
    
    toast.innerHTML = `
        <span class="cdl-toast-msg">❌ ${message}</span>
        <button class="cdl-toast-close" type="button" aria-label="Dismiss">&times;</button>
    `;

    container.appendChild(toast);

    // Trigger macro-task queue for entry transition execution
    setTimeout(() => toast.classList.add("show"), 10);

    // Setup teardown routing function
    const dismissToast = () => {
        if (toast.classList.contains("fade-out")) return;
        toast.classList.add("fade-out");
        toast.addEventListener("transitionend", () => {
            toast.remove();
            // Prune container shell if empty
            if (container.children.length === 0) {
                container.remove();
            }
        });
    };

    // 3. Attach standard close listener bindings
    toast.querySelector(".cdl-toast-close").addEventListener("click", dismissToast);

    // 4. Fallback auto-destruct timer sequence
    setTimeout(dismissToast, duration);
}

// Global dynamic wrapper for structural fallback
async function postData(url, data) {
    try {
        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(data),
        });

        // Parse JSON regardless of status code to read custom error payloads
        const responseData = await response.json(); 
        
        if (!response.ok) {
            // Throw an error containing the server's custom message if available
            throw new Error(responseData.message || `HTTP error! status: ${response.status}`);
        }

        console.log("Success:", responseData);
        return responseData;
    } catch (error) {
        console.error("Error:", error);
        // Extracts the custom string passed into our Error constructor above
        showToast(error.message || "Network operation failed. Action could not be synced.");
    }
}

let subscriptions = [];
let activeSubTab = "Upcoming";

async function getSubList() {
    try {
        const res = await fetch("/api/user/subscriptions/list");
        const json = await res.json();

        if (!res.ok) {
            throw new Error(json.message || `Status: ${res.status}`);
        }

        return Array.isArray(json) ? json : [json];
    } catch (err) {
        console.error(err);
        showToast(err.message || "Failed to retrieve subscriptions list from server.");
        return []; // Return empty array gracefully to avoid breaking page rendering
    }
}

// Core execution orchestration
const rawData = await getSubList();

function sortSubscriptionsList(rawData) {
    if (!rawData || rawData.length === 0) return;
    subscriptions = rawData.map((item) => {
        const nextBillingTime =
            (new Date(item.sub_next).getTime() - Date.now()) / 1000;

        return {
            id: item.sub_id,
            name: item.sub_name,
            icon: item.sub_icon,
            rate: parseFloat(item.sub_rate),
            next: nextBillingTime,
            billing_type: item.sub_billing_type,
            billing_interval: item.sub_billing_interval,
            billing: `${item.sub_billing_interval} ${item.sub_billing_type}${
                item.sub_billing_interval > 1 ? "s" : ""
            }`,
            enabled: item.enabled === 1,
            category: (item.sub_category || "Others").toLowerCase(),
            created: item.created_at
                ? new Date(item.created_at).getTime()
                : Date.now(),
        };
    });
}

sortSubscriptionsList(rawData);

/* -------------------------
    Helpers
-------------------------- */
function formatNext(seconds) {
    if (seconds <= 0) return "Due now";
    if (seconds <= 60)
        return `${Math.floor(seconds)} second${seconds > 1 ? "s" : ""}`;
    if (seconds <= 3600)
        return `${Math.floor(seconds / 60)} minute${seconds > 60 * 2 ? "s" : ""}`;
    if (seconds <= 86400)
        return `${Math.floor(seconds / 3600)} hour${seconds > 3600 * 2 ? "s" : ""}`;
    return `${Math.floor(seconds / 86400)} day${seconds > 86400 * 2 ? "s" : ""}`;
}

function statusClass(sub) {
    if (!sub.enabled) return "is-disabled";
    const secs = sub.next;
    if (secs <= 86400) return "is-urgent"; 
    if (secs <= 259200) return "is-soon"; 
    return "is-normal";
}

/* -------------------------
    Tabs Logic
-------------------------- */
function setupActiveTabs(selector) {
    const tabs = document.querySelectorAll(selector);

    tabs.forEach((btn) => {
        btn.addEventListener("click", () => {
            tabs.forEach((b) => b.classList.remove("is-active"));
            btn.classList.add("is-active");
            activeSubTab = btn.textContent.trim();
            renderSubscriptions();
        });
    });
}

/* -------------------------
    Render subscriptions list
-------------------------- */
function renderSubscriptions() {
    const listEl = document.getElementById("subsList");
    const searchInput = document.getElementById("subsSearch");
    const q = (searchInput.value || "").trim().toLowerCase();

    listEl.innerHTML = "";

    let items = subscriptions.filter((s) => s.name.toLowerCase().includes(q));

    if (activeSubTab === "Upcoming") {
        items = items.filter((s) => s.enabled);
        items.sort((a, b) => a.next - b.next);
    } else if (activeSubTab === "All") {
        items.sort((a, b) => b.created - a.created);
    } else {
        const targetCat = activeSubTab.toLowerCase();
        items = items.filter((s) => s.category === targetCat);
        items.sort((a, b) => b.created - a.created);
    }

    if (items.length === 0) {
        listEl.innerHTML = `<div class="empty-state">No subscriptions found.</div>`;
        return;
    }

    for (const sub of items) {
        const row = document.createElement("div");
        row.className = `sub-row ${statusClass(sub)} sub_id_${sub.id}`;

        row.innerHTML = `
          <div class="sub-icon"><img src="${sub.icon}"></div>
          <div class="sub-name">${sub.name}</div>
          <div class="sub-rate">$${sub.rate.toFixed(2)}</div>
          <div class="sub-next">${formatNext(sub.next)}</div>
          <div class="sub-cycle">${sub.billing}</div>
          
          <div class="sub-meta">
            <span class="m-rate">$${sub.rate.toFixed(2)}</span>
            <span class="sep">•</span>
            <span class="m-next">${formatNext(sub.next)}</span>
            <span class="sep">•</span>
            <span class="m-cycle">${sub.billing}</span>
          </div>

          <button class="gear-btn" type="button" aria-label="Settings">
             <svg viewBox="0 0 24 24" aria-hidden="true">
               <path d="M19.14,12.94a7.43,7.43,0,0,0,.05-.94,7.43,7.43,0,0,0-.05-.94l2.11-1.65a.5.5,0,0,0,.12-.65l-2-3.46a.5.5,0,0,0-.6-.22l-2.49,1a7.28,7.28,0,0,0-1.63-.94l-.38-2.65A.5.5,0,0,0,13.8,1H10.2a.5.5,0,0,0-.49.42L9.33,4.07a7.28,7.28,0,0,0-1.63.94l-2.49-1a.5.5,0,0,0-.6.22l-2,3.46a.5.5,0,0,0,.12.65L4.86,11.06a7.43,7.43,0,0,0-.05.94,7.43,7.43,0,0,0,.05.94L2.75,14.59a.5.5,0,0,0-.12.65l2,3.46a.5.5,0,0,0,.6.22l2.49-1a7.28,7.28,0,0,0,1.63.94l.38,2.65a.5.5,0,0,0,.49.42h3.6a.5.5,0,0,0,.49-.42l.38-2.65a7.28,7.28,0,0,0,1.63-.94l2.49,1a.5.5,0,0,0,.6-.22l2-3.46a.5.5,0,0,0-.12-.65ZM12,15.5A3.5,3.5,0,1,1,15.5,12,3.5,3.5,0,0,1,12,15.5Z"/>
             </svg>
          </button>
        `;

        const switchLabel = document.createElement("label");
        switchLabel.className = "switch";

        const toggle = document.createElement("input");
        toggle.type = "checkbox";
        toggle.checked = sub.enabled;

        const slider = document.createElement("span");
        slider.className = "slider";

        toggle.addEventListener("change", async () => {
            const newStatus = toggle.checked ? 1 : 0;

            const result = await postData("/api/user/subscriptions/toggle", {
                sub_id: sub.id,
                enabled: newStatus,
            });

            if (result && !result.error) {
                sub.enabled = toggle.checked;
                row.className = `sub-row ${statusClass(sub)}`;

                if (activeSubTab === "Upcoming" && !sub.enabled) {
                    renderSubscriptions();
                }
            } else {
                toggle.checked = !toggle.checked;
                // Grabs the custom .message from your Express endpoint
                showToast(result?.message || "Failed to update database tracking state.");
            }
        });

        switchLabel.appendChild(toggle);
        switchLabel.appendChild(slider);
        row.appendChild(switchLabel);

        listEl.appendChild(row);
    }
}

/* -------------------------
    Search
-------------------------- */
function setupSearch() {
    const input = document.getElementById("subsSearch");
    input.addEventListener("input", renderSubscriptions);
}

/* -------------------------
    Chart.js graph
-------------------------- */
function buildChart() {
    const el = document.getElementById("spendChart");
    if (!el || typeof Chart === "undefined") return;

    const valueLabelPlugin = {
        id: "valueLabelPlugin",
        afterDatasetsDraw(chart) {
            const { ctx } = chart;
            ctx.save();
            ctx.font = "700 12px system-ui, -apple-system, Segoe UI, Roboto, Arial";
            ctx.fillStyle = "rgba(238, 242, 255, 0.92)";

            const meta = chart.getDatasetMeta(0);
            meta.data.forEach((bar, i) => {
                const val = chart.data.datasets[0].data[i];
                const x = bar.x + 10;
                const y = bar.y + 4;
                ctx.fillText(String(val), x, y);
            });
            ctx.restore();
        },
    };

    new Chart(el, {
        type: "bar",
        data: {
            labels: ["WEEK 1", "WEEK 2", "WEEK 3", "WEEK 4"],
            datasets: [
                {
                    data: [34, 26, 58, 150],
                    borderRadius: 8,
                    barThickness: 18,
                    backgroundColor: "rgba(238, 242, 255, 0.92)",
                },
            ],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: "y",
            plugins: {
                legend: { display: false },
                tooltip: { enabled: true },
            },
            scales: {
                x: {
                    min: 0,
                    max: 150,
                    grid: { color: "rgba(238, 242, 255, 0.10)" },
                    ticks: {
                        color: "rgba(238, 242, 255, 0.55)",
                        stepSize: 20,
                        callback: (v) => (v <= 100 ? v : ""),
                    },
                    border: { display: false },
                },
                y: {
                    grid: { display: false },
                    ticks: {
                        color: "rgba(238, 242, 255, 0.65)",
                        font: { size: 11, weight: "800" },
                    },
                    border: { display: false },
                },
            },
        },
        plugins: [valueLabelPlugin],
    });
}

/* -------------------------
    Analytics-Only Tabs Logic
-------------------------- */
function setupAnalyticsOnlyTabs(selector) {
    const tabs = document.querySelectorAll(selector);

    tabs.forEach((btn) => {
        btn.addEventListener("click", () => {
            tabs.forEach((b) => b.classList.remove("is-active"));
            btn.classList.add("is-active");
            console.log("Viewing financials for:", btn.textContent.trim());
        });
    });
}

/* -------------------------
    Boot
-------------------------- */
setupActiveTabs(".subtab");
setupAnalyticsOnlyTabs(".atab");
setupSearch();
renderSubscriptions();
buildChart();

export { 
    getSubList, 
    sortSubscriptionsList, 
    renderSubscriptions, 
    subscriptions,
    showToast
};
