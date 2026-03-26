/**
 * Science Library - Profile Module
 * Handles profile page functionality
 */

import { auth, db } from './firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { 
    doc, 
    getDoc, 
    collection, 
    query, 
    where, 
    getDocs, 
    orderBy, 
    limit,
    deleteDoc,
    updateDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { 
    deleteUser,
    updatePassword,
    reauthenticateWithCredential,
    EmailAuthProvider
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// ==================== INITIALIZATION ====================

onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = 'login.html';
        return;
    }
    
    await Promise.all([
        loadProfile(user.uid),
        loadQuizHistory(user.uid)
    ]);
});

// ==================== PROFILE DATA ====================

/**
 * Load user profile data
 * @param {string} uid - User ID
 */
async function loadProfile(uid) {
    try {
        const userDoc = await getDoc(doc(db, 'users', uid));
        
        if (userDoc.exists()) {
            const data = userDoc.data();
            
            // Update all profile elements
            const elements = {
                'navUserName': data.fullName || 'Student',
                'profileName': data.fullName || 'Student',
                'profileEmail': data.email || '',
                'displayRegId': data.regId || 'N/A',
                'memberSince': data.createdAt ? 
                    formatDate(data.createdAt.toDate ? data.createdAt.toDate() : new Date(data.createdAt)) : 
                    '-'
            };
            
            for (const [id, value] of Object.entries(elements)) {
                const el = document.getElementById(id);
                if (el) el.textContent = value;
            }
        }
    } catch (error) {
        console.error('Error loading profile:', error);
    }
}

/**
 * Load quiz history
 * @param {string} uid - User ID
 */
async function loadQuizHistory(uid) {
    const historyList = document.getElementById('quizHistory');
    const statQuizzes = document.getElementById('statQuizzes');
    const statAccuracy = document.getElementById('statAccuracy');
    
    if (!historyList) return;
    
    try {
        const q = query(
            collection(db, 'quizResults'), 
            where('userId', '==', uid),
            orderBy('completedAt', 'desc'),
            limit(10)
        );
        
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
            historyList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-clipboard"></i>
                    <p>No quizzes taken yet. Start learning!</p>
                    <a href="dashboard.html#quizzes" class="btn btn-primary">Take Quiz</a>
                </div>
            `;
            if (statQuizzes) statQuizzes.textContent = '0';
            if (statAccuracy) statAccuracy.textContent = '0%';
            return;
        }
        
        let html = '';
        let totalQuizzes = 0;
        let totalScore = 0;
        
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            totalQuizzes++;
            totalScore += data.percentage || 0;
            
            const date = data.completedAt?.toDate ? data.completedAt.toDate() : new Date();
            const dateStr = formatDateShort(date);
            const scoreClass = getScoreClass(data.percentage);
            
            html += `
                <div class="history-item">
                    <div class="history-info">
                        <span class="history-subject">${formatSubjectName(data.subject)}</span>
                        <span class="history-date">${dateStr}</span>
                    </div>
                    <span class="history-score ${scoreClass}">
                        ${data.score}/${data.totalQuestions} (${data.percentage}%)
                    </span>
                </div>
            `;
        });
        
        historyList.innerHTML = html;
        
        if (statQuizzes) statQuizzes.textContent = totalQuizzes;
        if (statAccuracy) statAccuracy.textContent = Math.round(totalScore / totalQuizzes) + '%';
        
    } catch (error) {
        console.error('Error loading quiz history:', error);
        historyList.innerHTML = '<p class="empty-state">Error loading history</p>';
    }
}

// ==================== UTILITY FUNCTIONS ====================

function formatDate(date) {
    return date.toLocaleDateString('en-US', { 
        month: 'long', 
        year: 'numeric',
        day: 'numeric'
    });
}

function formatDateShort(date) {
    return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
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

function getScoreClass(percentage) {
    if (percentage >= 70) return 'good';
    if (percentage >= 50) return 'average';
    return 'poor';
}

// ==================== SETTINGS ACTIONS ====================

/**
 * Show change password modal
 */
window.showChangePassword = async function() {
    const newPassword = prompt('Enter new password (minimum 6 characters):');
    
    if (!newPassword) return;
    
    if (newPassword.length < 6) {
        alert('Password must be at least 6 characters long.');
        return;
    }
    
    try {
        const user = auth.currentUser;
        await updatePassword(user, newPassword);
        alert('Password updated successfully!');
    } catch (error) {
        console.error('Error updating password:', error);
        if (error.code === 'auth/requires-recent-login') {
            alert('Please log out and log in again before changing your password.');
        } else {
            alert('Failed to update password: ' + error.message);
        }
    }
};

/**
 * Show edit profile modal
 */
window.showEditProfile = function() {
    const user = auth.currentUser;
    const newName = prompt('Enter new full name:', user.displayName || '');
    
    if (!newName || newName.trim() === '' || newName === user.displayName) return;
    
    // Update in Auth and Firestore
    Promise.all([
        user.updateProfile({ displayName: newName.trim() }),
        updateDoc(doc(db, 'users', user.uid), {
            fullName: newName.trim()
        })
    ]).then(() => {
        alert('Profile updated successfully!');
        loadProfile(user.uid);
    }).catch((error) => {
        console.error('Error updating profile:', error);
        alert('Failed to update profile.');
    });
};

/**
 * Confirm and delete account
 */
window.confirmDeleteAccount = async function() {
    const confirmed = confirm(
        '⚠️ WARNING: This will permanently delete your account and all data!\n\n' +
        'This action cannot be undone.\n\n' +
        'Are you sure you want to continue?'
    );
    
    if (!confirmed) return;
    
    const doubleConfirm = prompt('Type "DELETE" to confirm account deletion:');
    
    if (doubleConfirm !== 'DELETE') {
        alert('Account deletion cancelled.');
        return;
    }
    
    try {
        const user = auth.currentUser;
        const uid = user.uid;
        
        // Delete quiz results
        const resultsQuery = query(collection(db, 'quizResults'), where('userId', '==', uid));
        const resultsSnapshot = await getDocs(resultsQuery);
        
        const deletePromises = resultsSnapshot.docs.map(doc => deleteDoc(doc.ref));
        await Promise.all(deletePromises);
        
        // Delete user document
        await deleteDoc(doc(db, 'users', uid));
        
        // Delete auth account
        await deleteUser(user);
        
        alert('Account deleted successfully.');
        window.location.href = 'index.html';
        
    } catch (error) {
        console.error('Error deleting account:', error);
        if (error.code === 'auth/requires-recent-login') {
            alert('Please log out and log in again before deleting your account.');
        } else {
            alert('Failed to delete account: ' + error.message);
        }
    }
};
