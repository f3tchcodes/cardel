import { getSubList, sortSubscriptionsList, renderSubscriptions } from './dashboard.js';

// Add this at the very beginning of your DOMContentLoaded block
const plusBtn = document.querySelector('.plus-btn') || document.querySelector('.btn-plus'); 

if (plusBtn) {
    plusBtn.addEventListener('click', () => {
        const overlay = document.getElementById('cdl-addSubOverlay');
        overlay.classList.add('cdl-open');
        document.body.style.overflow = 'hidden'; // Prevents background scrolling
    });
} else {
    console.warn("Plus button not found! Make sure your button has the class 'plus-btn'");
}

const overlay = document.getElementById('cdl-addSubOverlay');
const closeBtn = document.getElementById('cdl-closeAddSub');
const cancelInput = document.getElementById('cdl-cancelInput');
const tooltip = document.getElementById('cdl-custom-tooltip');

// --- DROPDOWN STATE & LOGIC ---
let currentUnit = 'month';
const ranges = { day: 7, week: 4, month: 12, year: 10 };

function updateBillingFields() {
    const interval = parseInt(
        document.querySelector('#cdl-drop-val .selected').textContent
    );

    document.getElementById('subBillingType').value = currentUnit;
    document.getElementById('subBillingInterval').value = interval;
}

function populateValues(unit) {
    const valMenu = document.getElementById('cdl-val-menu');
    const max = ranges[unit] || 12;
    valMenu.innerHTML = '';
    
    for (let i = 1; i <= max; i++) {
        const item = document.createElement('div');
        item.className = 'dropdown-item';
        item.textContent = i;
        item.onclick = () => {
            document.querySelector('#cdl-drop-val .selected').textContent = i;
            document.getElementById('cdl-drop-val').classList.remove('open');
            updateBillingFields()
        };
        valMenu.appendChild(item);
    }
}

// Toggle Dropdowns
document.querySelectorAll('.dropdown-input').forEach(input => {
    input.addEventListener('click', (e) => {
        const parent = input.parentElement;
        document.querySelectorAll('.dropdown').forEach(d => { if(d !== parent) d.classList.remove('open')});
        parent.classList.toggle('open');
        e.stopPropagation();
    });
});

// Unit Selection Logic
document.querySelectorAll('#cdl-drop-unit .dropdown-item').forEach(item => {
    item.addEventListener('click', () => {
        currentUnit = item.dataset.value;
        document.querySelector('#cdl-drop-unit .selected').textContent = item.textContent;
        document.querySelector('#cdl-drop-val .selected').textContent = '1';
        populateValues(currentUnit);
        document.getElementById('cdl-drop-unit').classList.remove('open');
        updateBillingFields()
    });
});

// --- TOOLTIP (FOLLOW MOUSE) ---
cancelInput.parentElement.addEventListener('mousemove', (e) => {
    if (cancelInput.classList.contains('free')) {
        tooltip.style.display = 'block';
        tooltip.style.left = e.clientX + 'px';
        tooltip.style.top = e.clientY + 'px';
    }
});
cancelInput.parentElement.addEventListener('mouseleave', () => {
    tooltip.style.display = 'none';
});

// --- ADVANCED TOGGLE ---
document.getElementById('cdl-advToggle').addEventListener('click', () => {
    document.getElementById('cdl-advPanel').classList.toggle('open');
    document.getElementById('cdl-advArrow').classList.toggle('rotated');
});

// --- ICON PREVIEW ---
document.getElementById('cdl-iconInput').addEventListener('change', function() {
    if (this.files && this.files[0]) {
        const reader = new FileReader();
        reader.onload = (e) => document.getElementById('cdl-iconPreview').src = e.target.result;
        reader.readAsDataURL(this.files[0]);
    }
});

// Close Modal Logic
const closeModal = () => {
    overlay.classList.remove('cdl-open');
    document.body.style.overflow = '';
};
closeBtn.onclick = closeModal;
overlay.onclick = (e) => { if(e.target === overlay) closeModal(); };
window.addEventListener('click', () => document.querySelectorAll('.dropdown').forEach(d => d.classList.remove('open')));

// Initialize
populateValues('month');
updateBillingFields();

const form = document.getElementById("cdl-addSubForm");

form.addEventListener("submit", async function (e) {
    e.preventDefault(); // stop normal redirect

    const formData = new FormData(form);

    try {
        const res = await fetch("/api/user/subscriptions/add", {
            method: "POST",
            body: formData
        });

        const data = await res.json();

        if(data.redirect_url){
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
            const overlay = document.getElementById('cdl-addSubOverlay');
            const rawData = await getSubList();

            sortSubscriptionsList(rawData);
            renderSubscriptions();
            form.reset();

            overlay.classList.remove('cdl-open');
            document.body.style.overflow = '';
        }

        // Insert above form
        form.parentNode.insertBefore(box, form);

    } catch (err) {
        console.error(err);
        alert("Network error. Try again.");
    }
});
