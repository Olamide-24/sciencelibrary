/**
 * Science Library - Admin Panel
 * Secure user lookup and management
 */

import { db } from './firebase-config.js';
import { 
    collection, 
    query, 
    where, 
    getDocs,
    getDoc,
    doc,
    orderBy,
    limit 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// ==================== CONFIGURATION ====================

// CHANGE THIS TO YOUR SECURE 6-DIGIT PIN
const ADMIN_PIN = '123456'; // ⚠️ CHANGE THIS IN PRODUCTION!

// ==================== STATE ====================

let currentUserData = null;
let pinValue = '';

// ==================== PIN SECURITY ====================

const pinOverlay = document.getElementById('pinOverlay');
const pinInput = document.getElementById('pinInput');
const pinDots = document.querySelectorAll('.dot');
const pinError = document.getElementById('pinError');
const adminInterface = document.getElementById('adminInterface');

// Initialize PIN keypad
document.querySelectorAll('.key').forEach(key => {
    key.addEventListener('click', () => handleKeyPress(key.dataset.key));
});

// Keyboard support for PIN
document.addEventListener('keydown', (e) => {
    if (!pinOverlay.classList.contains('hidden')) {
        if (e.key >= '0' && e.key <= '9') handleKeyPress(e.key);
        if (e.key === 'Backspace') handleKeyPress('clear');
        if (e.key === 'Enter') handleKeyPress('enter');
    }
});

function handleKeyPress(key) {
    if (key === 'clear') {
        pinValue = '';
    } else if (key === 'enter') {
        validatePin();
    } else if (pinValue.length < 6 && /^\d$/.test(key)) {
        pinValue += key;
    }
    
    updatePinDisplay();
}

function updatePinDisplay() {
    pinInput.value = pinValue;
    pinDots.forEach((dot, index) => {
        dot.classList.toggle('filled', index < pinValue.length);
    });
    
    if (pinError.classList.contains('show')) {
        pinError.classList.remove('show');
    }
}

function validatePin() {
    if (pinValue === ADMIN_PIN) {
        // Correct PIN
        pinOverlay.classList.add('hidden');
        adminInterface.classList.remove('hidden');
        document.getElementById('searchInput').focus();
        showToast('Admin access granted');
    } else {
        // Wrong PIN
        pinValue = '';
        updatePinDisplay();
        pinError.classList.add('show');
        pinInput.style.borderColor = 'var(--admin-danger)';
        
        setTimeout(() => {
            pinInput.style.borderColor = '';
        }, 500);
    }
}

// Lock admin panel
window.lockAdmin = function() {
    pinValue = '';
    updatePinDisplay();
    adminInterface.classList.add('hidden');
    pinOverlay.classList.remove('hidden');
    // Hide results
    document.getElementById('resultsSection').classList.remove('show');
    document.getElementById('quickActions').style.display = 'none';
    currentUserData = null;
};

// Auto-lock on inactivity (5 minutes)
let inactivityTimer;
function resetInactivityTimer() {
    clearTimeout(inactivityTimer);
    inactivityTimer = setTimeout(() => {
        if (!pinOverlay.classList.contains('hidden')) return;
        showToast('Session locked due to inactivity');
        lockAdmin();
    }, 5 * 60 * 1000); // 5 minutes
}

document.addEventListener('mousemove', resetInactivityTimer);
document.addEventListener('keypress', resetInactivityTimer);

// ==================== USER SEARCH ====================

const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const searchError = document.getElementById('searchError');

// FIXED: Simple input handler - only uppercase, no restrictive filtering
searchInput.addEventListener('input', (e) => {
    // Just convert to uppercase, allow all characters
    e.target.value = e.target.value.toUpperCase();
    searchError.classList.remove('show');
});

// Better: Add input mask/formatting as user types
searchInput.addEventListener('keyup', (e) => {
    let value = e.target.value;
    
    // Auto-insert dash after SCI
    if (value.length === 3 && value === 'SCI' && e.key !== 'Backspace') {
        e.target.value = 'SCI-';
    }
    
    // Auto-insert dash after year (SCI-2026)
    if (value.length === 8 && value.charAt(7) !== '-' && e.key !== 'Backspace') {
        const prefix = value.substring(0, 7);
        const suffix = value.substring(7);
        e.target.value = prefix + '-' + suffix;
    }
});

// Enter key to search
searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') searchUser();
});

window.searchUser = async function() {
    let regId = searchInput.value.trim().toUpperCase();
    
    // Validate format: SCI-YYYY-XXXX
    const regIdPattern = /^SCI-\d{4}-[A-Z0-9]{4}$/;
    
    if (!regIdPattern.test(regId)) {
        searchError.querySelector('span').textContent = 'Invalid format. Use: SCI-YYYY-XXXX (e.g., SCI-2026-GX0S)';
        searchError.classList.add('show');
        return;
    }
    
    setLoading(searchBtn, true);
    
    try {
        // Query users collection by regId
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('regId', '==', regId));
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
            searchError.querySelector('span').textContent = 'No user found with this Registration ID';
            searchError.classList.add('show');
            document.getElementById('resultsSection').classList.remove('show');
            document.getElementById('quickActions').style.display = 'none';
            setLoading(searchBtn, false);
            return;
        }
        
        // Get user data
        const userDoc = querySnapshot.docs[0];
        const userData = userDoc.data();
        currentUserData = { id: userDoc.id, ...userData };
        
        // Display user info
        displayUserInfo(userData);
        
        // Load quiz stats
        await loadUserQuizStats(userData.uid);
        
        // Show results
        document.getElementById('resultsSection').classList.add('show');
        document.getElementById('quickActions').style.display = 'block';
        
        showToast('User found successfully');
        
    } catch (error) {
        console.error('Search error:', error);
        searchError.querySelector('span').textContent = 'Error searching. Please try again.';
        searchError.classList.add('show');
    }
    
    setLoading(searchBtn, false);
};

function displayUserInfo(data) {
    document.getElementById('userName').textContent = data.fullName || 'N/A';
    document.getElementById('userRegId').textContent = data.regId || 'N/A';
    document.getElementById('userEmail').textContent = data.email || 'N/A';
    
    const joined = data.createdAt?.toDate ? data.createdAt.toDate() : new Date();
    document.getElementById('userJoined').textContent = joined.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

async function loadUserQuizStats(uid) {
    try {
        const resultsRef = collection(db, 'quizResults');
        const q = query(resultsRef, where('userId', '==', uid), orderBy('completedAt', 'desc'));
        const snapshot = await getDocs(q);
        
        let totalQuizzes = 0;
        let totalScore = 0;
        let bestSubject = '-';
        let bestAvg = 0;
        let subjectScores = {};
        let lastActive = '-';
        let activities = [];
        
        snapshot.forEach(doc => {
            const data = doc.data();
            totalQuizzes++;
            totalScore += data.percentage;
            
            // Track subject performance
            if (!subjectScores[data.subject]) {
                subjectScores[data.subject] = { total: 0, count: 0 };
            }
            subjectScores[data.subject].total += data.percentage;
            subjectScores[data.subject].count++;
            
            // Get last active
            if (totalQuizzes === 1) {
                const date = data.completedAt?.toDate ? data.completedAt.toDate() : new Date();
                lastActive = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
            }
            
            // Collect recent activities (max 5)
            if (activities.length < 5) {
                const date = data.completedAt?.toDate ? data.completedAt.toDate() : new Date();
                activities.push({
                    subject: data.subject,
                    date: date,
                    score: data.percentage,
                    correct: data.score,
                    total: data.totalQuestions
                });
            }
        });
        
        // Calculate best subject
        for (const [subject, scores] of Object.entries(subjectScores)) {
            const avg = scores.total / scores.count;
            if (avg > bestAvg) {
                bestAvg = avg;
                bestSubject = subject;
            }
        }
        
        // Update stats display
        document.getElementById('totalQuizzes').textContent = totalQuizzes;
        document.getElementById('avgScore').textContent = totalQuizzes > 0 ? 
            Math.round(totalScore / totalQuizzes) + '%' : '0%';
        document.getElementById('bestSubject').textContent = bestSubject !== '-' ? 
            formatSubjectName(bestSubject) : '-';
        document.getElementById('lastActive').textContent = lastActive;
        
        // Display activities
        displayActivities(activities);
        
    } catch (error) {
        console.error('Error loading quiz stats:', error);
    }
}

function displayActivities(activities) {
    const container = document.getElementById('activityList');
    
    if (activities.length === 0) {
        container.innerHTML = `
            <div class="no-activity">
                <i class="fas fa-clipboard"></i>
                <p>No quiz activity found for this user</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = activities.map(act => {
        const scoreClass = act.score >= 70 ? 'excellent' : act.score >= 50 ? 'good' : 'needs-improvement';
        return `
            <div class="activity-item">
                <div class="activity-info">
                    <span class="activity-subject">${formatSubjectName(act.subject)}</span>
                    <span class="activity-date">${act.date.toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    })}</span>
                </div>
                <span class="activity-score ${scoreClass}">
                    ${act.correct}/${act.total} (${act.score}%)
                </span>
            </div>
        `;
    }).join('');
}

function formatSubjectName(subject) {
    const names = {
        'mathematics': 'Mathematics',
        'english': 'English',
        'physics': 'Physics',
        'chemistry': 'Chemistry',
        'biology': 'Biology',
        'computer': 'Computer',
        'agriculture': 'Agriculture',
        'further-math': 'Further Math'
    };
    return names[subject] || subject;
}

// ==================== UTILITY FUNCTIONS ====================

function setLoading(btn, isLoading) {
    btn.classList.toggle('loading', isLoading);
    btn.disabled = isLoading;
}

function showToast(message) {
    const toast = document.getElementById('toast');
    document.getElementById('toastMessage').textContent = message;
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

window.resetSearch = function() {
    searchInput.value = '';
    searchInput.focus();
    document.getElementById('resultsSection').classList.remove('show');
    document.getElementById('quickActions').style.display = 'none';
    searchError.classList.remove('show');
    currentUserData = null;
};

// ==================== QUICK ACTIONS ====================

window.copyUserInfo = function() {
    if (!currentUserData) return;
    
    const info = `
Name: ${currentUserData.fullName}
Reg ID: ${currentUserData.regId}
Email: ${currentUserData.email}
Joined: ${document.getElementById('userJoined').textContent}
    `.trim();
    
    navigator.clipboard.writeText(info).then(() => {
        showToast('User info copied to clipboard');
    });
};

window.printUserInfo = function() {
    if (!currentUserData) return;
    window.print();
};

window.exportUserData = function() {
    if (!currentUserData) return;
    
    const dataStr = JSON.stringify(currentUserData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `user_${currentUserData.regId}.json`;
    link.click();
    URL.revokeObjectURL(url);
    
    showToast('User data exported');
};

// Initialize
resetInactivityTimer();
