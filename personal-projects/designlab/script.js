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

// Custom smooth scroll function
function smoothScrollTo(target, duration = 800) {
    const start = window.pageYOffset;
    const targetPosition = typeof target === 'number' ? target : target.getBoundingClientRect().top + window.pageYOffset;
    const distance = targetPosition - start;
    let startTime = null;

    function animation(currentTime) {
        if (startTime === null) startTime = currentTime;
        const timeElapsed = currentTime - startTime;
        const progress = Math.min(timeElapsed / duration, 1);

        // Custom easing function (ease-in-out-cubic)
        const ease = progress < 0.5
            ? 4 * progress * progress * progress
            : 1 - Math.pow(-2 * progress + 2, 3) / 2;

        window.scrollTo(0, start + distance * ease);

        if (timeElapsed < duration) {
            requestAnimationFrame(animation);
        }
    }

    requestAnimationFrame(animation);
}

document.addEventListener('DOMContentLoaded', function () {
    const galleryBtn = document.getElementById('galleryBtn');
    const gallerySection = document.getElementById('gallery');
    const btnIcon = galleryBtn.querySelector('.btn-icon');
    const btnText = galleryBtn.querySelector('.btn-text');

    function updateButton() {
        const galleryRect = gallerySection.getBoundingClientRect();
        const windowHeight = window.innerHeight;

        if (galleryRect.top < windowHeight * 0.3) {
            // Show "To Top" 
            galleryBtn.classList.add('to-top');
            btnIcon.textContent = '⚡';
            btnText.textContent = 'To Top';

            galleryBtn.onclick = function (e) {
                e.preventDefault();
                // window.scrollTo({ top: 0, behavior: 'smooth' });
                smoothScrollTo(0, 1000); // Smooth scroll to top
            };
        } else {
            // Show "Gallery"
            galleryBtn.classList.remove('to-top');
            btnIcon.textContent = '🧭';
            btnText.textContent = 'Gallery';

            galleryBtn.onclick = function (e) {
                e.preventDefault();
                // gallerySection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                smoothScrollTo(gallerySection, 1000); // Smooth scroll to top
            };
        }
    }

    window.addEventListener('scroll', updateButton);
    updateButton();
});