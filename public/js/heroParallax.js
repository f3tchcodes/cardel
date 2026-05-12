document.addEventListener("mousemove", (e) => {
    // Get mouse position
    const x = e.clientX;
    const y = e.clientY;

    // Get window center
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;

    // Find all layers
    const layers = document.querySelectorAll(".parallax-layer");

    layers.forEach((layer) => {
        // Get the depth from the HTML attribute
        const depth = parseFloat(layer.getAttribute("data-depth")) || 0.04;

        // Calculate the move (Negative depth = move away from mouse)
        const moveX = (centerX - x) * depth;
        const moveY = (centerY - y) * depth;

        // Apply movement using translate3d for better performance
        layer.style.transform = `translate3d(${moveX}px, ${moveY}px, 0)`;
    });
});
