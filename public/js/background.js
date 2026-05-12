function generateParticles() {
    const container = document.querySelector(".background");
    container.innerHTML = "";

    // Use BODY height only (ignores background)
    const pageHeight = document.body.scrollHeight;

    const particleCount = Math.floor(pageHeight / 160);

    for (let i = 0; i < particleCount; i++) {
        const span = document.createElement("span");

        span.style.top = Math.random() * pageHeight + "px";

        container.appendChild(span);
    }
}

// Run once after full layout settles
window.addEventListener("load", generateParticles);

// Rebuild only when window width changes (not height)
let lastWidth = window.innerWidth;

window.addEventListener("resize", () => {
    if (window.innerWidth !== lastWidth) {
        lastWidth = window.innerWidth;
        generateParticles();
    }
});
