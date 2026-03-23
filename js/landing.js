// ============================================
// LANDING PAGE SPECIFIC JAVASCRIPT
// ============================================

// Navbar scroll effect
document.addEventListener('DOMContentLoaded', () => {
    const navbar = document.querySelector('.navbar');
    
    if (navbar && navbar.classList.contains('navbar-transparent')) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 50) {
                navbar.classList.add('scrolled');
            } else {
                navbar.classList.remove('scrolled');
            }
        });
    }
    
    // Animate stats counter
    animateCounters();
});

function animateCounters() {
    const counters = document.querySelectorAll('.stat-number');
    
    counters.forEach(counter => {
        const target = parseInt(counter.textContent);
        if (isNaN(target)) return;
        
        let current = 0;
        const increment = target / 50;
        const timer = setInterval(() => {
            current += increment;
            if (current >= target) {
                counter.textContent = target;
                clearInterval(timer);
            } else {
                counter.textContent = Math.floor(current);
            }
        }, 30);
    });
}

