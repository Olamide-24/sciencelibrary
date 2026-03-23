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
    initMobileNav();  // Fixed: Properly initialized
    initSearch();
    loadRecentBooks();
    loadUserProgress();
    setupGlobalEvents();
    initProfilePage();
    showWelcomeMessage();  // New: Show welcome after login
}

// ============================================
// DARK MODE
// ============================================

function initDarkMode() {
    const savedMode = localStorage.getItem('darkMode') === 'true';
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedMode || prefersDark) {
        document.body.classList.add('dark-mode');
        updateDarkModeToggle(true);
    }
}

window.toggleDarkMode = function() {
    const isDark = document.body.classList.toggle('dark-mode');
    localStorage.setItem('darkMode', isDark);
    updateDarkModeToggle(isDark);
};

function updateDarkModeToggle(isDark) {
    const toggle = document.getElementById('darkModeToggle');
    if (toggle) {
        toggle.textContent = isDark ? 'ON' : 'OFF';
        toggle.classList.toggle('active', isDark);
    }
}

// ============================================
// MOBILE NAVIGATION - FIXED
// ============================================

function initMobileNav() {
    console.log('Initializing mobile nav');
    
    const toggle = document.getElementById('mobileToggle');
    const navLinks = document.getElementById('navLinks');
    
    if (!toggle || !navLinks) {
        console.log('Mobile nav elements not found');
        return;
    }
    
    console.log('Found mobile toggle and nav links');
    
    // Remove any existing listeners to prevent duplicates
    const newToggle = toggle.cloneNode(true);
    toggle.parentNode.replaceChild(newToggle, toggle);
    
    newToggle.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log('Hamburger clicked');
        
        navLinks.classList.toggle('active');
        const isActive = navLinks.classList.contains('active');
        newToggle.textContent = isActive ? '✕' : '☰';
        newToggle.style.transform = isActive ? 'rotate(90deg)' : 'rotate(0deg)';
    });
    
    // Close menu when clicking a link
    navLinks.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
            navLinks.classList.remove('active');
            newToggle.textContent = '☰';
            newToggle.style.transform = 'rotate(0deg)';
        });
    });
    
    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
        if (!newToggle.contains(e.target) && !navLinks.contains(e.target)) {
            navLinks.classList.remove('active');
            newToggle.textContent = '☰';
            newToggle.style.transform = 'rotate(0deg)';
        }
    });
}

// ============================================
// WELCOME MESSAGE - NEW
// ============================================

function showWelcomeMessage() {
    // Check if we just logged in
    const justLoggedIn = sessionStorage.getItem('justLoggedIn');
    if (justLoggedIn && currentUser) {
        showNotification(`Welcome back, ${currentUser.displayName || 'User'}! 👋`, 'success', 5000);
        sessionStorage.removeItem('justLoggedIn');
    }
}

// Call this after successful login
window.markJustLoggedIn = function() {
    sessionStorage.setItem('justLoggedIn', 'true');
};

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
            <div class="book-card" style="display: flex; flex-direction: row; align-items: center; gap: 1rem; padding: 1rem; background: white; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                <div style="width: 80px; height: 80px; background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%); border-radius: 8px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                    <span style="font-size: 2rem;">${subjectIcons[book.subject] || '📚'}</span>
                </div>
                <div style="flex: 1; min-width: 0;">
                    <h4 style="margin-bottom: 0.25rem; font-size: 1rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${book.title}</h4>
                    <span class="badge ${book.subject}" style="font-size: 0.75rem; text-transform: capitalize;">${book.subject}</span>
                    <button onclick="readBook('${book.id}')" class="btn-read" style="margin-top: 0.5rem; padding: 0.375rem 0.75rem; font-size: 0.875rem; background: #2563eb; color: white; border: none; border-radius: 6px; cursor: pointer;">Read</button>
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
    
    // Calculate actual progress from localStorage
    const history = JSON.parse(localStorage.getItem('readingHistory') || '[]');
    const totalBooks = 32; // Approximate total
    const progress = Math.min(Math.round((history.length / totalBooks) * 100), 100);
    
    progressBars.forEach(bar => {
        bar.style.width = `${progress}%`;
    });
    
    progressTexts.forEach(text => {
        text.textContent = `${progress}% Complete`;
    });
}

// ============================================
// SUBJECT PAGE FUNCTIONS
// ============================================

window.filterBySubject = function() {
    const select = document.getElementById('subjectFilter');
    const subject = select?.value;
    
    if (subject && subject !== 'all') {
        updateSubjectPage(subject);
    }
};

function updateSubjectPage(subject) {
    const data = window.subjectData?.[subject];
    if (!data) return;
    
    const title = document.getElementById('subjectTitle');
    const desc = document.getElementById('subjectDesc');
    const current = document.getElementById('currentSubject');
    
    if (title) title.textContent = data.title;
    if (desc) desc.textContent = data.desc;
    if (current) current.textContent = data.title;
    
    const topicsGrid = document.getElementById('topicsGrid');
    if (topicsGrid && data.topics) {
        topicsGrid.innerHTML = data.topics.map(topic => `
            <div class="topic-item" onclick="openTopic('${subject}', '${topic}')" style="cursor: pointer; transition: all 0.2s;">
                <h4>${topic}</h4>
                <span class="topic-arrow">→</span>
            </div>
        `).join('');
    }
    
    if (window.allBooks) {
        const subjectBooks = window.allBooks.filter(b => b.subject === subject);
        const booksContainer = document.getElementById('subjectBooks');
        
        if (booksContainer) {
            if (subjectBooks.length > 0) {
                booksContainer.innerHTML = subjectBooks.map(book => `
                    <div class="book-card" data-id="${book.id}" style="background: white; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                        <div class="book-info" style="padding: 1.5rem;">
                            <h4>${book.title}</h4>
                            <span class="badge level" style="background: #f1f5f9; color: #64748b; padding: 0.25rem 0.75rem; border-radius: 9999px; font-size: 0.75rem; text-transform: capitalize;">${book.level}</span>
                            <button onclick="readBook('${book.id}')" class="btn-read" style="margin-top: 1rem; display: block; width: 100%; padding: 0.5rem; background: #2563eb; color: white; border: none; border-radius: 6px; cursor: pointer;">Read</button>
                        </div>
                    </div>
                `).join('');
            } else {
                booksContainer.innerHTML = '<p class="empty-state">No books available for this subject yet</p>';
            }
        }
    }
}

window.openTopic = function(subject, topic) {
    window.location.href = `topic.html?subject=${subject}&topic=${encodeURIComponent(topic)}`;
};

window.searchTopics = function() {
    const query = document.getElementById('topicSearch')?.value.toLowerCase();
    const items = document.querySelectorAll('.topic-item');
    
    items.forEach(item => {
        const text = item.textContent.toLowerCase();
        item.style.display = text.includes(query) ? 'flex' : 'none';
    });
};

// ============================================
// TOPIC PAGE FUNCTIONS
// ============================================

window.showTab = function(tabName) {
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    const selectedTab = document.getElementById(tabName + 'Tab');
    if (selectedTab) selectedTab.classList.add('active');
    
    const buttons = document.querySelectorAll('.tab-btn');
    const tabIndex = ['learn', 'practice', 'quiz'].indexOf(tabName);
    if (buttons[tabIndex]) buttons[tabIndex].classList.add('active');
};

// ============================================
// PROFILE PAGE
// ============================================

function initProfilePage() {
    const profileName = document.getElementById('profileName');
    if (!profileName) return;
    
    if (!currentUser) {
        window.location.href = 'login.html';
        return;
    }
    
    // Show user info with styling
    profileName.textContent = currentUser.displayName || 'User';
    document.getElementById('profileEmail').textContent = currentUser.email;
    document.getElementById('userInitials').textContent = getInitials(currentUser.displayName || currentUser.email);
    
    const memberSince = document.getElementById('memberSince');
    if (memberSince && currentUser.metadata) {
        const date = new Date(currentUser.metadata.creationTime);
        memberSince.textContent = 'Member since ' + date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    }
    
    loadUserStats();
    loadSavedBooks();
    loadRecentActivity();
}

async function loadUserStats() {
    const booksRead = document.getElementById('booksRead');
    const quizzesTaken = document.getElementById('quizzesTaken');
    const avgScore = document.getElementById('avgScore');
    
    const history = JSON.parse(localStorage.getItem('readingHistory') || '[]');
    const quizHistory = JSON.parse(localStorage.getItem('quizHistory') || '[]');
    
    if (booksRead) booksRead.textContent = history.length;
    if (quizzesTaken) quizzesTaken.textContent = quizHistory.length;
    
    if (quizHistory.length > 0 && avgScore) {
        const totalScore = quizHistory.reduce((sum, q) => sum + (q.percentage || 0), 0);
        avgScore.textContent = Math.round(totalScore / quizHistory.length) + '%';
    }
}

function loadSavedBooks() {
    const container = document.getElementById('savedBooksList');
    if (!container) return;
    
    const bookmarks = JSON.parse(localStorage.getItem('bookmarks') || '[]');
    
    if (bookmarks.length === 0) {
        container.innerHTML = '<p class="empty" style="color: #94a3b8; font-style: italic;">No saved books yet</p>';
        return;
    }
    
    container.innerHTML = bookmarks.map(id => `
        <div style="padding: 0.75rem; background: #f8fafc; border-radius: 8px; margin-bottom: 0.5rem; border: 1px solid #e2e8f0;">
            <a href="book-viewer.html" style="font-weight: 500; color: #2563eb; text-decoration: none;">Book ID: ${id}</a>
        </div>
    `).join('');
}

function loadRecentActivity() {
    const container = document.getElementById('recentActivity');
    if (!container) return;
    
    const history = JSON.parse(localStorage.getItem('readingHistory') || '[]');
    const quizHistory = JSON.parse(localStorage.getItem('quizHistory') || '[]');
    
    if (history.length === 0 && quizHistory.length === 0) {
        container.innerHTML = '<p class="empty" style="color: #94a3b8; font-style: italic;">Start learning to see activity</p>';
        return;
    }
    
    const activities = [
        ...history.slice(0, 3).map(id => `📖 Read book ${id}`),
        ...quizHistory.slice(0, 3).map(q => `📝 Scored ${q.percentage}% on ${q.subject}`)
    ];
    
    container.innerHTML = activities.map(act => `
        <div style="padding: 0.75rem; border-bottom: 1px solid #e2e8f0; font-size: 0.875rem; color: #475569;">
            ${act}
        </div>
    `).join('');
}

// ============================================
// GLOBAL EVENTS
// ============================================

function setupGlobalEvents() {
    // Smooth scroll
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });
    
    // URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const searchQuery = urlParams.get('search') || sessionStorage.getItem('searchQuery');
    
    if (searchQuery && document.getElementById('bookSearch')) {
        document.getElementById('bookSearch').value = searchQuery;
        if (window.searchBooks) {
            window.searchBooks(searchQuery);
        }
        sessionStorage.removeItem('searchQuery');
    }
    
    const subjectParam = urlParams.get('subject');
    if (subjectParam && document.getElementById('subjectFilter')) {
        document.getElementById('subjectFilter').value = subjectParam;
        updateSubjectPage(subjectParam);
    }
}

// ============================================
// HELPERS
// ============================================

function getInitials(name) {
    if (!name) return '👤';
    return name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
}

window.formatDate = function(timestamp) {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};

window.debounce = function(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
};

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
        <button onclick="this.parentElement.remove()" class="notification-close" style="background: none; border: none; color: white; cursor: pointer; font-size: 1.2rem; margin-left: 0.5rem;">×</button>
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
        justify-content: space-between;
        min-width: 300px;
        animation: slideInRight 0.3s ease;
    `;
    
    // Add animation styles if not present
    if (!document.querySelector('#notification-styles')) {
        const style = document.createElement('style');
        style.id = 'notification-styles';
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
    }
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, duration);
};

// Exports
export { initDarkMode, showNotification, markJustLoggedIn };
