document.addEventListener('DOMContentLoaded', function () {
    const galleryItems = document.querySelectorAll('.gallery-item');
    const flipDuration = 2000; // How long each flip lasts
    const minInterval = 500; // Minimum time between flips
    const maxInterval = 3000; // Maximum time between flips

    function getRandomInterval() {
        return Math.random() * (maxInterval - minInterval) + minInterval;
    }

    function getRandomItem() {
        return galleryItems[Math.floor(Math.random() * galleryItems.length)];
    }

    function flipRandomSlide() {
        const item = getRandomItem();

        // Skip if currently being hovered
        if (item.matches(':hover')) {
            scheduleNextFlip();
            return;
        }

        // Add flip class
        item.classList.add('auto-flipped');

        // Remove flip class after duration
        setTimeout(() => {
            if (!item.matches(':hover')) {
                item.classList.remove('auto-flipped');
            }
        }, flipDuration);

        scheduleNextFlip();
    }

    function scheduleNextFlip() {
        setTimeout(flipRandomSlide, getRandomInterval());
    }

    // Handle hover interactions
    galleryItems.forEach(item => {
        item.addEventListener('mouseenter', () => {
            // Keep manual hover effect even if auto-flipped
            item.classList.remove('auto-flipped');
        });

        item.addEventListener('mouseleave', () => {
            // Remove any lingering auto-flip state
            item.classList.remove('auto-flipped');
        });
    });

    // Start the random flipping after a short delay
    setTimeout(flipRandomSlide, getRandomInterval());
});