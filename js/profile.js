import { auth, db } from './firebase-config.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, getDoc, collection, query, where, getDocs, orderBy, limit } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Global logout
window.logout = async function() {
    try {
        await signOut(auth);
        window.location.href = 'index.html';
    } catch (error) {
        alert('Failed to logout: ' + error.message);
    }
};

onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = 'login.html';
        return;
    }
    await loadProfile(user.uid);
    await loadQuizHistory(user.uid);
});

async function loadProfile(uid) {
    try {
        const userDoc = await getDoc(doc(db, 'users', uid));
        if (userDoc.exists()) {
            const data = userDoc.data();
            
            const navUserName = document.getElementById('navUserName');
            const profileName = document.getElementById('profileName');
            const profileEmail = document.getElementById('profileEmail');
            const displayRegId = document.getElementById('displayRegId');
            const memberSince = document.getElementById('memberSince');
            
            if (navUserName) navUserName.textContent = data.fullName || 'Student';
            if (profileName) profileName.textContent = data.fullName || 'Student';
            if (profileEmail) profileEmail.textContent = data.email || '';
            if (displayRegId) displayRegId.textContent = data.regId || 'N/A';
            
            if (memberSince && data.createdAt) {
                const date = data.createdAt.toDate ? data.createdAt.toDate() : new Date(data.createdAt);
                memberSince.textContent = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
            }
        }
    } catch (error) {
        console.error('Error loading profile:', error);
    }
}

async function loadQuizHistory(uid) {
    try {
        const q = query(
            collection(db, 'quizResults'), 
            where('userId', '==', uid),
            orderBy('completedAt', 'desc'),
            limit(5)
        );
        
        const querySnapshot = await getDocs(q);
        const historyList = document.getElementById('quizHistory');
        const statQuizzes = document.getElementById('statQuizzes');
        const statAccuracy = document.getElementById('statAccuracy');
        
        if (!historyList) return;
        
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
            const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            
            html += `
                <div class="history-item">
                    <div class="history-info">
                        <span class="history-subject">${data.subject}</span>
                        <span class="history-date">${dateStr}</span>
                    </div>
                    <span class="history-score ${data.percentage >= 70 ? 'good' : data.percentage >= 50 ? 'average' : 'poor'}">
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
    }
}

window.showChangePassword = function() {
    alert('Password reset email will be sent to your email address.');
};

window.showEditProfile = function() {
    alert('Profile editing coming soon!');
};

window.confirmDeleteAccount = function() {
    if (confirm('Are you sure you want to delete your account?')) {
        alert('Account deletion request submitted.');
    }
};

