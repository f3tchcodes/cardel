const proCard = document.getElementById("pro-card");

proCard.addEventListener("click", () => {
  window.open("/pricing", "_blank");
});

// code function for sending post request
async function postData(url, data) {
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const responseData = await response.json(); // Parse the response body as JSON
    console.log('Success:', responseData);
    return responseData;

  } catch (error) {
    console.error('Error:', error);
  }
}

let subscriptions = []; 

let activeSubTab = "Upcoming"; 

async function getSubList(){
  const res = await fetch('/api/user/subscriptions/list');
  if (!res.ok) throw new Error(`Status: ${res.status}`);
  
  const json = await res.json();
  return Array.isArray(json) ? json : [json];
}

const rawData = await getSubList();

// Define standard timeframes in seconds
const SECONDS = {
  DAY: 86400,
  WEEK: 604800,        // 7 days
  MONTH: 2592000,      // 30 days
  YEAR: 31536000       // 365 days
};

function formatBillingText(seconds) {
  if (!seconds || seconds <= 0) return "UNDEFINED"; // Fallback just in case

  // Check Years first (Largest to smallest)
  if (seconds % SECONDS.YEAR === 0) {
    const value = seconds / SECONDS.YEAR;
    return `${value} year${value > 1 ? 's' : ''}`;
  }
  
  // Check Months
  if (seconds % SECONDS.MONTH === 0) {
    const value = seconds / SECONDS.MONTH;
    return `${value} month${value > 1 ? 's' : ''}`;
  }
  
  // Check Weeks
  if (seconds % SECONDS.WEEK === 0) {
    const value = seconds / SECONDS.WEEK;
    return `${value} week${value > 1 ? 's' : ''}`;
  }
  
  // Check Days
  if (seconds % SECONDS.DAY === 0) {
    const value = seconds / SECONDS.DAY;
    return `${value} day${value > 1 ? 's' : ''}`;
  }

  // Fallback if it doesn't match clean intervals
  return `UNDEFINED`; 
}

function sortSubscriptionsList(rawData) {
  subscriptions = rawData.map(item => {
    const now = Date.now() / 1000; // Current time in milliseconds
    const subbedAt = new Date(item.subbed_at).getTime() / 1000; // Convert DB date to milliseconds
    const billingMs = item.sub_billing; // Convert your 172800 seconds to milliseconds

    let nextBillingTime;

    // Edge Case: If the subscription hasn't even started yet (future date)
    if (now < subbedAt) {
      nextBillingTime = NaN;
    } else {
      // The Core Math
      const elapsed = now - subbedAt;
      const remainder = elapsed % billingMs; // How far into the current cycle we are
      const timeLeft = billingMs - remainder; // Time until the next charge
      
      nextBillingTime = timeLeft; 
    }

    return {
      id: item.sub_id,
      name: item.sub_name,
      icon: item.sub_icon,
      rate: parseFloat(item.sub_rate),
      
      // Here is your perfectly calculated next billing timestamp!
      next: nextBillingTime, 
      
      billing_number: item.sub_billing,
      billing: formatBillingText(item.sub_billing),
      enabled: item.enabled === 1,
      category: (item.sub_category || "Others").toLowerCase(),
      created: item.created_at ? new Date(item.created_at).getTime() : Date.now()
    };
  });
}

sortSubscriptionsList(rawData)

/* -------------------------
   Helpers
-------------------------- */

function formatNext(seconds) {
  if (seconds <= 60) return `${Math.floor(seconds)} second${seconds > 1 ? 's' : ''}`;
  if (seconds <= 3600) return `${Math.floor(seconds / 60)} minute${seconds > 60*2 ? 's' : ''}`;
  if (seconds <= 86400) return `${Math.floor(seconds / 3600)} hour${seconds > 3600*2 ? 's' : ''}`;
  return `${Math.floor(seconds / 86400)} day${seconds > 86400*2 ? 's' : ''}`;
}

function statusClass(sub) {
  if (!sub.enabled) return "is-disabled";
  const secs = sub.next;
  if (secs <= 86400) return "is-urgent";        // < 24 hours
  if (secs <= 259200) return "is-soon";         // < 72 hours
  return "is-normal";
}

/* -------------------------
   Tabs Logic
-------------------------- */
function setupActiveTabs(selector) {
  const tabs = document.querySelectorAll(selector);
  
  tabs.forEach(btn => {
    btn.addEventListener("click", () => {
      // 1. UI Toggle
      tabs.forEach(b => b.classList.remove("is-active"));
      btn.classList.add("is-active");
      
      // 2. Update State
      // We trim just in case of whitespace in HTML
      activeSubTab = btn.textContent.trim();
      
      // 3. Re-render list
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

  // 1. Start with Search Filter (applies to everything)
  let items = subscriptions.filter(s => s.name.toLowerCase().includes(q));

  // 2. Category & Sorting Logic
  if (activeSubTab === "Upcoming") {
    // RULE: Only enabled, ordered by next charge (ascending)
    items = items.filter(s => s.enabled);
    items.sort((a, b) => a.next - b.next);
    
  } else if (activeSubTab === "All") {
    // RULE: All (enabled or disabled), ordered by date added (Newest first)
    items.sort((a, b) => b.created - a.created);
    
  } else {
    // RULE: Specific Category, ordered by date added (Newest first)
    // We compare lowercase to lowercase to ensure "Work/Business" matches "work/business"
    const targetCat = activeSubTab.toLowerCase();
    
    items = items.filter(s => s.category === targetCat);
    items.sort((a, b) => b.created - a.created);
  }

  // 3. Render
  if (items.length === 0) {
    listEl.innerHTML = `<div class="empty-state">No subscriptions found.</div>`;
    return;
  }

  for (const sub of items) {
    const row = document.createElement("div");
    row.className = `sub-row ${statusClass(sub)}`;

    // Generate HTML
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

    // Create Switch manually to attach event listener
    const switchLabel = document.createElement("label");
    switchLabel.className = "switch";

    const toggle = document.createElement("input");
    toggle.type = "checkbox";
    toggle.checked = sub.enabled;

    const slider = document.createElement("span");
    slider.className = "slider";

    // Inside renderSubscriptions() loop:
    toggle.addEventListener("change", async () => {
        // 1. Determine the new state (0 or 1 for the database)
        const newStatus = toggle.checked ? 1 : 0;
        
        // 2. Send the request to your server
        const result = await postData('/api/user/subscriptions/toggle', {
            sub_id: sub.id,   // Using the ID we mapped in step 1
            enabled: newStatus
        });

        // 3. Handle the UI update based on result
        if (result && !result.error) {
            sub.enabled = toggle.checked;
            row.className = `sub-row ${statusClass(sub)}`;
            
            // Optional: If in Upcoming tab, remove the row if disabled
            if (activeSubTab === "Upcoming" && !sub.enabled) {
                renderSubscriptions();
            }
        } else {
            // 4. Revert the toggle if the server failed
            toggle.checked = !toggle.checked;
            alert("Failed to update: " + (result?.error || "Unknown error"));
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
      ctx.font = '700 12px system-ui, -apple-system, Segoe UI, Roboto, Arial';
      ctx.fillStyle = 'rgba(238, 242, 255, 0.92)';

      const meta = chart.getDatasetMeta(0);
      meta.data.forEach((bar, i) => {
        const val = chart.data.datasets[0].data[i];
        // simple guard to keep label inside/near bar
        const x = bar.x + 10;
        const y = bar.y + 4;
        ctx.fillText(String(val), x, y);
      });
      ctx.restore();
    }
  };

  new Chart(el, {
    type: "bar",
    data: {
      labels: ["WEEK 1", "WEEK 2", "WEEK 3", "WEEK 4"],
      datasets: [{
        data: [34, 26, 58, 150],
        borderRadius: 8,
        barThickness: 18,
        backgroundColor: "rgba(238, 242, 255, 0.92)"
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: "y",
      plugins: {
        legend: { display: false },
        tooltip: { enabled: true }
      },
      scales: {
        x: {
          min: 0, max: 150,
          grid: { color: "rgba(238, 242, 255, 0.10)" },
          ticks: { color: "rgba(238, 242, 255, 0.55)", stepSize: 20, callback: v => v <= 100 ? v : "" },
          border: { display: false }
        },
        y: {
          grid: { display: false },
          ticks: { color: "rgba(238, 242, 255, 0.65)", font: { size: 11, weight: "800" } },
          border: { display: false }
        }
      }
    },
    plugins: [valueLabelPlugin]
  });
}

/* -------------------------
   Analytics-Only Tabs Logic
-------------------------- */
function setupAnalyticsOnlyTabs(selector) {
  const tabs = document.querySelectorAll(selector);
  
  tabs.forEach(btn => {
    btn.addEventListener("click", () => {
      // Toggle the 'is-active' class for the UI/CSS animation only
      tabs.forEach(b => b.classList.remove("is-active"));
      btn.classList.add("is-active");
      
      // We do NOT call renderSubscriptions() here.
      // You can add your own custom logic here later (like updating the chart)
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

export { getSubList, sortSubscriptionsList, renderSubscriptions };