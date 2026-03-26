/**
 * Science Library - Subjects Module
 * Handles subject pages functionality
 */

import { auth, db } from './firebase-config.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// ==================== INITIALIZATION ====================

onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = 'login.html';
        return;
    }
    
    // Load user name
    const userNameEl = document.getElementById('userName');
    if (userNameEl) {
        try {
            const userDoc = await getDoc(doc(db, 'users', user.uid));
            if (userDoc.exists()) {
                const data = userDoc.data();
                userNameEl.textContent = data.fullName || 'Student';
            } else {
                userNameEl.textContent = user.displayName || 'Student';
            }
        } catch (error) {
            userNameEl.textContent = user.displayName || 'Student';
        }
    }
    
    // Setup subject icon
    setupSubjectIcon();
});

/**
 * Setup subject-specific icon based on page
 */
function setupSubjectIcon() {
    const path = window.location.pathname;
    const iconMap = {
        'mathematics': { icon: 'fa-square-root-alt', color: '#f59e0b' },
        'english': { icon: 'fa-language', color: '#ec4899' },
        'physics': { icon: 'fa-atom', color: '#06b6d4' },
        'chemistry': { icon: 'fa-flask', color: '#10b981' },
        'biology': { icon: 'fa-dna', color: '#8b5cf6' },
        'computer': { icon: 'fa-laptop-code', color: '#6366f1' },
        'agriculture': { icon: 'fa-seedling', color: '#84cc16' },
        'further-math': { icon: 'fa-calculator', color: '#f43f5e' }
    };
    
    // Find current subject
    let currentSubject = '';
    for (const subject of Object.keys(iconMap)) {
        if (path.includes(subject)) {
            currentSubject = subject;
            break;
        }
    }
    
    if (currentSubject && iconMap[currentSubject]) {
        const config = iconMap[currentSubject];
        const iconContainer = document.querySelector('.subject-icon-large');
        const iconElement = document.querySelector('.subject-icon-large i');
        
        if (iconContainer && iconElement) {
            iconElement.className = `fas ${config.icon}`;
            iconContainer.style.background = `linear-gradient(135deg, ${config.color}, ${adjustColor(config.color, -20)})`;
        }
    }
}

/**
 * Darken color for gradient
 */
function adjustColor(color, amount) {
    return color; // Simplified - in production use proper color manipulation
}

// ==================== GLOBAL LOGOUT ====================

window.logout = async function() {
    try {
        await signOut(auth);
        window.location.href = 'index.html';
    } catch (error) {
        console.error('Logout error:', error);
        alert('Failed to logout. Please try again.');
    }
};
