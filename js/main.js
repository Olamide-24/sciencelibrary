// ============================================
// MAIN JAVASCRIPT - CORE FUNCTIONALITY
// ============================================

import { currentUser } from './auth.js';

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    console.log('Main.js loaded');
    initializeApp();
});

function initializeApp() {
    initDarkMode();
    initMobileNav();
    initSearch();
    loadRecentBooks();
    loadUserProgress();
    setupGlobalEvents();
    showWelcomeMessage();
}

// ============================================
// DARK MODE
// ============================================

function initDarkMode() {
    const savedMode = localStorage.getItem('darkMode') === 'true';
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedMode || prefersDark) {
        document.body.classList.add('dark-mode');
    }
}

window.toggleDarkMode = function() {
    const isDark = document.body.classList.toggle('dark-mode');
    localStorage.setItem('darkMode', isDark);
    
    // Update toggle buttons
    const toggles = document.querySelectorAll('.toggle-switch');
    toggles.forEach(toggle => {
        if (toggle.id === 'darkModeToggle') {
            toggle.classList.toggle('active', isDark);
        }
    });
};

// ============================================
// MOBILE NAVIGATION
// ============================================

function initMobileNav() {
    const toggle = document.getElementById('mobileToggle');
    const navLinks = document.getElementById('navLinks');
    
    if (!toggle || !navLinks) return;
    
    toggle.addEventListener('click', () => {
        navLinks.classList.toggle('active');
        toggle.textContent = navLinks.classList.contains('active') ? '✕' : '☰';
    });
    
    // Close menu when clicking a link
    navLinks.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
            navLinks.classList.remove('active');
            toggle.textContent = '☰';
        });
    });
}

// ============================================
// WELCOME MESSAGE
// ============================================

function showWelcomeMessage() {
    const justLoggedIn = sessionStorage.getItem('justLoggedIn');
    if (justLoggedIn && currentUser) {
        showNotification(`Welcome back, ${currentUser.displayName || 'User'}! 👋`, 'success', 5000);
        sessionStorage.removeItem('justLoggedIn');
    }
}

// ============================================
// SEARCH FUNCTIONALITY
// ============================================

function initSearch() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                searchContent();
            }
        });
    }
}

window.searchContent = function() {
    const query = document.getElementById('searchInput')?.value.trim();
    if (!query) return;
    
    sessionStorage.setItem('searchQuery', query);
    window.location.href = 'book-viewer.html';
};

// ============================================
// DYNAMIC CONTENT LOADING
// ============================================

async function loadRecentBooks() {
    const container = document.getElementById('recentBooks');
    if (!container) return;
    
    try {
        const response = await fetch('data/books.json');
        const data = await response.json();
        const books = data.books?.slice(0, 4) || [];
        
        if (books.length === 0) {
            container.innerHTML = '<p class="empty-state">No books available yet</p>';
            return;
        }
        
        const subjectIcons = {
            english: '📖', math: '📐', physics: '⚛️', chemistry: '⚗️',
            biology: '🧬', 'further-math': '🔢', computer: '💻', agriculture: '🌱'
        };
        
        container.innerHTML = books.map(book => `
            <div class="book-card">
                <div class="book-cover" style="background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);">
                    <span style="font-size: 4rem;">${subjectIcons[book.subject] || '📚'}</span>
                </div>
                <div class="book-info">
                    <h4>${book.title}</h4>
                    <span class="badge ${book.subject}">${book.subject}</span>
                    <button onclick="readBook('${book.id}')" class="btn-read" style="margin-top: 0.5rem;">Read</button>
                </div>
            </div>
        `).join('');
        
    } catch (error) {
        console.error('Error loading recent books:', error);
        container.innerHTML = '<p class="empty-state">Unable to load books</p>';
    }
}

async function loadUserProgress() {
    if (!currentUser) return;
    
    const progressBars = document.querySelectorAll('.progress-fill');
    const progressTexts = document.querySelectorAll('.progress-text');
    
    const history = JSON.parse(localStorage.getItem('readingHistory') || '[]');
    const totalBooks = 32;
    const progress = Math.min(Math.round((history.length / totalBooks) * 100), 100);
    
    progressBars.forEach(bar => {
        bar.style.width = `${progress}%`;
    });
    
    progressTexts.forEach(text => {
        text.textContent = `${progress}% Complete`;
    });
}

// ============================================
// GLOBAL EVENTS
// ============================================

function setupGlobalEvents() {
    // Smooth scroll for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });
}

// ============================================
// NOTIFICATION SYSTEM
// ============================================

window.showNotification = function(message, type = 'info', duration = 3000) {
    const existing = document.querySelector('.notification');
    if (existing) existing.remove();
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <span class="notification-message">${message}</span>
        <button onclick="this.parentElement.remove()" class="notification-close">×</button>
    `;
    
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 16px 20px;
        background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
        color: white;
        border-radius: 12px;
        box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1);
        z-index: 10000;
        display: flex;
        align-items: center;
        gap: 12px;
        min-width: 300px;
        animation: slideInRight 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, duration);
};

// Animation keyframes
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOutRight {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style);

// Exports
export { initDarkMode, showNotification };

