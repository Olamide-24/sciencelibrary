/**
 * Science Library - Admin Panel (NO INDEX REQUIRED)
 * Fetches all users and filters client-side
 */

import { db } from './firebase-config.js';
import { 
    collection, 
    getDocs,
    query,
    where,
    orderBy
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const ADMIN_PIN = '123456'; // CHANGE THIS!

let currentUserData = null;
let pinValue = '';
let allUsersCache = []; // Cache all users

// ==================== PIN SECURITY ====================

const pinOverlay = document.getElementById('pinOverlay');
const pinInput = document.getElementById('pinInput');
const pinDots = document.querySelectorAll('.dot');
const pinError = document.getElementById('pinError');
const adminInterface = document.getElementById('adminInterface');

document.querySelectorAll('.key').forEach(key => {
    key.addEventListener('click', () => handleKeyPress(key.dataset.key));
});

document.addEventListener('keydown', (e) => {
    if (!pinOverlay.classList.contains('hidden')) {
        if (e.key >= '0' && e.key <= '9') handleKeyPress(e.key);
        if (e.key === 'Backspace') handleKeyPress('clear');
        if (e.key === 'Enter') handleKeyPress('enter');
    }
});

function handleKeyPress(key) {
    if (key === 'clear') pinValue = '';
    else if (key === 'enter') validatePin();
    else if (pinValue.length < 6 && /^\d$/.test(key)) pinValue += key;
    updatePinDisplay();
}

function updatePinDisplay() {
    pinInput.value = pinValue;
    pinDots.forEach((dot, index) => dot.classList.toggle('filled', index < pinValue.length));
    pinError.classList.remove('show');
}

function validatePin() {
    if (pinValue === ADMIN_PIN) {
        pinOverlay.classList.add('hidden');
        adminInterface.classList.remove('hidden');
        document.getElementById('searchInput').focus();
        loadAllUsers(); // Load all users on unlock
        showToast('Admin access granted');
    } else {
        pinValue = '';
        updatePinDisplay();
        pinError.classList.add('show');
        pinInput.style.borderColor = 'var(--admin-danger)';
        setTimeout(() => pinInput.style.borderColor = '', 500);
    }
}

window.lockAdmin = function() {
    pinValue = '';
    updatePinDisplay();
    adminInterface.classList.add('hidden');
    pinOverlay.classList.remove('hidden');
    document.getElementById('resultsSection').classList.remove('show');
    document.getElementById('quickActions').style.display = 'none';
    currentUserData = null;
    allUsersCache = [];
};

let inactivityTimer;
function resetInactivityTimer() {
    clearTimeout(inactivityTimer);
    inactivityTimer = setTimeout(() => {
        if (!pinOverlay.classList.contains('hidden')) return;
        showToast('Session locked due to inactivity');
        lockAdmin();
    }, 5 * 60 * 1000);
}
document.addEventListener('mousemove', resetInactivityTimer);
document.addEventListener('keypress', resetInactivityTimer);

// ==================== LOAD ALL USERS (NO INDEX NEEDED) ====================

async function loadAllUsers() {
    try {
        console.log('[ADMIN] Loading all users...');
        
        // Simple get - no where clause, no index needed
        const snapshot = await getDocs(collection(db, 'users'));
        
        allUsersCache = [];
        snapshot.forEach(doc => {
            allUsersCache.push({ id: doc.id, ...doc.data() });
        });
        
        console.log('[ADMIN] Loaded', allUsersCache.length, 'users');
        showToast(`Loaded ${allUsersCache.length} users`);
        
    } catch (error) {
        console.error('[ADMIN] Error loading users:', error);
        showToast('Error loading users: ' + error.message);
    }
}

// ==================== SEARCH (CLIENT-SIDE, NO INDEX) ====================

const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const searchError = document.getElementById('searchError');

searchInput.addEventListener('input', (e) => {
    e.target.value = e.target.value.toUpperCase();
    searchError.classList.remove('show');
});

searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') searchUser();
});

window.searchUser = async function() {
    const regId = searchInput.value.trim().toUpperCase();
    
    console.log('[ADMIN] Searching for:', regId);
    
    // Validate format
    const regIdPattern = /^SCI-\d{4}-[A-Z0-9]{4}$/;
    if (!regIdPattern.test(regId)) {
        searchError.querySelector('span').textContent = 'Invalid format. Use: SCI-YYYY-XXXX (e.g., SCI-2026-ABCD)';
        searchError.classList.add('show');
        return;
    }
    
    setLoading(searchBtn, true);
    
    // If cache is empty, load users
    if (allUsersCache.length === 0) {
        await loadAllUsers();
    }
    
    // Search in cached data (client-side, no Firestore query needed)
    const user = allUsersCache.find(u => u.regId === regId);
    
    if (!user) {
        console.log('[ADMIN] User not found');
        searchError.querySelector('span').textContent = 'No user found with this Registration ID';
        searchError.classList.add('show');
        document.getElementById('resultsSection').classList.remove('show');
        document.getElementById('quickActions').style.display = 'none';
        setLoading(searchBtn, false);
        return;
    }
    
    console.log('[ADMIN] User found:', user);
    
    currentUserData = user;
    displayUserInfo(user);
    await loadUserQuizStats(user.uid);
    
    document.getElementById('resultsSection').classList.add('show');
    document.getElementById('quickActions').style.display = 'block';
    showToast('User found successfully');
    
    setLoading(searchBtn, false);
};

function displayUserInfo(data) {
    document.getElementById('userName').textContent = data.fullName || 'N/A';
    document.getElementById('userRegId').textContent = data.regId || 'N/A';
    document.getElementById('userEmail').textContent = data.email || 'N/A';
    
    const joined = data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt || Date.now());
    document.getElementById('userJoined').textContent = joined.toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric'
    });
}

async function loadUserQuizStats(uid) {
    try {
        console.log('[ADMIN] Loading quiz stats for:', uid);
        
        const q = query(
            collection(db, 'quizResults'), 
            where('userId', '==', uid),
            orderBy('completedAt', 'desc')
        );
        
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
            
            if (!subjectScores[data.subject]) {
                subjectScores[data.subject] = { total: 0, count: 0 };
            }
            subjectScores[data.subject].total += data.percentage;
            subjectScores[data.subject].count++;
            
            if (totalQuizzes === 1) {
                const date = data.completedAt?.toDate ? data.completedAt.toDate() : new Date();
                lastActive = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
            }
            
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
        
        for (const [subject, scores] of Object.entries(subjectScores)) {
            const avg = scores.total / scores.count;
            if (avg > bestAvg) {
                bestAvg = avg;
                bestSubject = subject;
            }
        }
        
        document.getElementById('totalQuizzes').textContent = totalQuizzes;
        document.getElementById('avgScore').textContent = totalQuizzes > 0 ? Math.round(totalScore / totalQuizzes) + '%' : '0%';
        document.getElementById('bestSubject').textContent = bestSubject !== '-' ? formatSubjectName(bestSubject) : '-';
        document.getElementById('lastActive').textContent = lastActive;
        
        displayActivities(activities);
        
    } catch (error) {
        console.error('[ADMIN] Error loading quiz stats:', error);
        document.getElementById('totalQuizzes').textContent = '0';
        document.getElementById('avgScore').textContent = '0%';
        document.getElementById('bestSubject').textContent = '-';
        document.getElementById('lastActive').textContent = '-';
        document.getElementById('activityList').innerHTML = '<div class="no-activity"><i class="fas fa-clipboard"></i><p>Error loading activity</p></div>';
    }
}

function displayActivities(activities) {
    const container = document.getElementById('activityList');
    
    if (activities.length === 0) {
        container.innerHTML = '<div class="no-activity"><i class="fas fa-clipboard"></i><p>No quiz activity found for this user</p></div>';
        return;
    }
    
    container.innerHTML = activities.map(act => {
        const scoreClass = act.score >= 70 ? 'excellent' : act.score >= 50 ? 'good' : 'needs-improvement';
        return `
            <div class="activity-item">
                <div class="activity-info">
                    <span class="activity-subject">${formatSubjectName(act.subject)}</span>
                    <span class="activity-date">${act.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <span class="activity-score ${scoreClass}">${act.correct}/${act.total} (${act.score}%)</span>
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

function setLoading(btn, isLoading) {
    btn.classList.toggle('loading', isLoading);
    btn.disabled = isLoading;
}

function showToast(message) {
    const toast = document.getElementById('toast');
    document.getElementById('toastMessage').textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
}

window.resetSearch = function() {
    searchInput.value = '';
    searchInput.focus();
    document.getElementById('resultsSection').classList.remove('show');
    document.getElementById('quickActions').style.display = 'none';
    searchError.classList.remove('show');
    currentUserData = null;
};

window.copyUserInfo = function() {
    if (!currentUserData) return;
    const info = `Name: ${currentUserData.fullName}\nReg ID: ${currentUserData.regId}\nEmail: ${currentUserData.email}`;
    navigator.clipboard.writeText(info).then(() => showToast('Copied to clipboard'));
};

window.printUserInfo = function() {
    if (!currentUserData) return;
    window.print();
};

window.exportUserData = function() {
    if (!currentUserData) return;
    const dataStr = JSON.stringify(currentUserData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `user_${currentUserData.regId}.json`;
    link.click();
    URL.revokeObjectURL(url);
    showToast('User data exported');
};

resetInactivityTimer();
