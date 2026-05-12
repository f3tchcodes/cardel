document.addEventListener("DOMContentLoaded", () => {
    let currentStep = 1;
    const totalSteps = 5;
    const selectedSubs = new Set();

    const nextBtn = document.getElementById("nextBtn");
    const backBtn = document.getElementById("backBtn");

    function updateUI() {
        const progress = ((currentStep - 1) / (totalSteps - 1)) * 100;
        document.getElementById("progressBar").style.width = `${progress}%`;

        backBtn.style.display = currentStep > 1 ? "block" : "none";

        if (currentStep === totalSteps) {
            nextBtn.classList.add("morph-square");
            document.getElementById("btnIcon").style.display = "none";
            document.getElementById("btnText").style.display = "block";
        } else {
            nextBtn.classList.remove("morph-square");
            document.getElementById("btnIcon").style.display = "block";
            document.getElementById("btnText").style.display = "none";
        }
    }

    function changeStep(dir) {
        if (currentStep === totalSteps && dir === 1) {
            submitOnboarding();
            return;
        }

        const currentElem = document.getElementById(`step${currentStep}`);
        console.log(currentElem);
        const nextStepIndex = currentStep + dir;
        if (nextStepIndex < 1 || nextStepIndex > totalSteps) return;

        const nextElem = document.getElementById(`step${nextStepIndex}`);

        // Add animation classes
        if (dir === 1) {
            currentElem.classList.add("exit-left");
            nextElem.classList.add("enter-right");
        } else {
            currentElem.classList.add("exit-right");
            nextElem.classList.add("enter-left");
        }

        setTimeout(() => {
            currentElem.classList.remove("active", "exit-left", "exit-right");
            nextElem.classList.remove("enter-left", "enter-right");
            nextElem.classList.add("active");
            currentStep = nextStepIndex;
            updateUI();
        }, 600);
    }

    nextBtn.addEventListener("click", () => changeStep(1));
    backBtn.addEventListener("click", () => changeStep(-1));

    // DROPDOWN MENU
    document.querySelectorAll(".dropdown").forEach((dropdown, index) => {
        const inputBox = dropdown.querySelector(".dropdown-input");
        const input = dropdown.querySelector("input");
        const menu = dropdown.querySelector(".dropdown-menu");

        // Open / close dropdown
        inputBox.addEventListener("click", (e) => {
            e.stopPropagation();
            closeAll(dropdown);
            dropdown.classList.toggle("open");
            if (!dropdown.classList.contains("single-select")) {
                input.focus();
            }
        });

        // SEARCH FILTER — only for first multi-select (index 0)
        if (dropdown.classList.contains("multi-select") && index === 0) {
            input.addEventListener("input", () => {
                const search = input.value.toLowerCase().trim();
                menu.querySelectorAll(".dropdown-item").forEach((item) => {
                    const name = item.dataset.name.toLowerCase();
                    item.style.display = name.includes(search)
                        ? "flex"
                        : "none";
                });
            });
        }

        // ITEM CLICK
        menu.querySelectorAll(".dropdown-item").forEach((item) => {
            item.addEventListener("click", () => {
                if (dropdown.classList.contains("multi-select")) {
                    addTag(dropdown, item.dataset.name, item.dataset.img);
                } else {
                    input.value = item.innerText;
                }
                dropdown.classList.remove("open");
            });
        });

        // Backspace removes last tag (multi-select only)
        if (dropdown.classList.contains("multi-select")) {
            input.addEventListener("keydown", (e) => {
                if (e.key === "Backspace" && input.value === "") {
                    const tags = dropdown.querySelectorAll(".tag");
                    if (tags.length) tags[tags.length - 1].remove();
                }
            });
        }
    });

    function addTag(dropdown, name, img) {
        const container = dropdown.querySelector(".tags");

        if ([...container.children].some((t) => t.dataset.name === name))
            return;

        const tag = document.createElement("div");
        tag.className = "tag";
        tag.dataset.name = name;

        tag.innerHTML = `
            <img src="${img}">
            <span>${name}</span>
            <span class="remove">×</span>
        `;

        tag.addEventListener("click", () => tag.remove());

        container.appendChild(tag);
        dropdown.querySelector("input").value = "";
        selectedSubs.add(name);
    }

    function closeAll(current = null) {
        document.querySelectorAll(".dropdown").forEach((d) => {
            if (d !== current) d.classList.remove("open");
        });
    }

    document.addEventListener("click", () => closeAll());

    // redirect logic
    document.querySelectorAll("[data-redirect]").forEach((card) => {
        card.addEventListener("click", (e) => {
            e.preventDefault();
            window.open("/pricing", "_blank");
        });
    });

    function submitOnboarding() {
        document.getElementById("hidden_subUse").value =
            Array.from(selectedSubs).join(",");
        document.getElementById("hidden_subManage").value =
            document.getElementById("subManage").value;
        document.getElementById("hidden_hearAbout").value =
            document.getElementById("hearAbout").value;
        document.getElementById("hidden_notifyDays").value =
            document.getElementById("notifyDays").value;
        document.getElementById("hidden_subNumber").value =
            document.getElementById("subNumber").value;
        document.getElementById("hidden_subMonthlySpend").value =
            document.getElementById("subMonthlySpend").value;
        document.getElementById("onboardingForm").submit();
    }

    updateUI();
});
