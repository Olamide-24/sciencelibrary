/**
 * Science Library - Dashboard Module
 * Handles dashboard data loading and display
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
    limit 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// ==================== INITIALIZATION ====================

onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = 'login.html';
        return;
    }
    
    // Load all dashboard data
    await Promise.all([
        loadUserData(user.uid),
        loadQuizStats(user.uid),
        loadQuizGrid()
    ]);
});

// ==================== DATA LOADING ====================

/**
 * Load user data from Firestore
 * @param {string} uid - User ID
 */
async function loadUserData(uid) {
    try {
        const userDoc = await getDoc(doc(db, 'users', uid));
        
        if (userDoc.exists()) {
            const data = userDoc.data();
            
            // Update all user name elements
            const userNameEl = document.getElementById('userName');
            const welcomeNameEl = document.getElementById('welcomeName');
            const regIdEl = document.getElementById('regId');
            
            if (userNameEl) userNameEl.textContent = data.fullName || 'Student';
            if (welcomeNameEl) welcomeNameEl.textContent = data.fullName?.split(' ')[0] || 'Student';
            if (regIdEl) regIdEl.textContent = data.regId || 'N/A';
            
        } else {
            console.error('User document not found');
            // Create user document if missing
            const user = auth.currentUser;
            if (user) {
                const { setDoc, serverTimestamp } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js");
                await setDoc(doc(db, 'users', uid), {
                    uid: uid,
                    regId: `SCI-${new Date().getFullYear()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
                    fullName: user.displayName || 'Student',
                    email: user.email,
                    createdAt: serverTimestamp()
                });
                // Reload data
                loadUserData(uid);
            }
        }
    } catch (error) {
        console.error('Error loading user data:', error);
    }
}

/**
 * Load quiz statistics
 * @param {string} uid - User ID
 */
async function loadQuizStats(uid) {
    try {
        const q = query(
            collection(db, 'quizResults'), 
            where('userId', '==', uid)
        );
        
        const querySnapshot = await getDocs(q);
        
        let totalQuizzes = 0;
        let totalScore = 0;
        let subjectScores = {};
        
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            totalQuizzes++;
            totalScore += data.percentage || 0;
            
            // Track best subject
            if (!subjectScores[data.subject]) {
                subjectScores[data.subject] = { total: 0, count: 0 };
            }
            subjectScores[data.subject].total += data.percentage;
            subjectScores[data.subject].count++;
        });
        
        // Update UI
        const quizzesEl = document.getElementById('quizzesTaken');
        const avgEl = document.getElementById('avgScore');
        const bestSubjectEl = document.getElementById('bestSubject');
        
        if (quizzesEl) quizzesEl.textContent = totalQuizzes;
        if (avgEl) avgEl.textContent = totalQuizzes > 0 ? Math.round(totalScore / totalQuizzes) + '%' : '0%';
        
        // Calculate best subject
        if (bestSubjectEl && totalQuizzes > 0) {
            let bestSubject = '-';
            let bestAvg = 0;
            
            for (const [subject, scores] of Object.entries(subjectScores)) {
                const avg = scores.total / scores.count;
                if (avg > bestAvg) {
                    bestAvg = avg;
                    bestSubject = subject;
                }
            }
            
            bestSubjectEl.textContent = bestSubject !== '-' ? 
                bestSubject.charAt(0).toUpperCase() + bestSubject.slice(1) : '-';
        } else if (bestSubjectEl) {
            bestSubjectEl.textContent = '-';
        }
        
    } catch (error) {
        console.error('Error loading quiz stats:', error);
    }
}

/**
 * Load quiz grid from JSON
 */
async function loadQuizGrid() {
    const grid = document.getElementById('quizGrid');
    if (!grid) return;
    
    try {
        const response = await fetch('data/quiz.json');
        if (!response.ok) throw new Error('Failed to load quiz data');
        
        const quizzes = await response.json();
        
        grid.innerHTML = '';
        
        const subjects = [
            { id: 'mathematics', name: 'Mathematics', icon: 'fa-square-root-alt', color: '#f59e0b' },
            { id: 'english', name: 'English Language', icon: 'fa-language', color: '#ec4899' },
            { id: 'physics', name: 'Physics', icon: 'fa-atom', color: '#06b6d4' },
            { id: 'chemistry', name: 'Chemistry', icon: 'fa-flask', color: '#10b981' },
            { id: 'biology', name: 'Biology', icon: 'fa-dna', color: '#8b5cf6' },
            { id: 'computer', name: 'Computer Science', icon: 'fa-laptop-code', color: '#6366f1' },
            { id: 'agriculture', name: 'Agriculture', icon: 'fa-seedling', color: '#84cc16' },
            { id: 'further-math', name: 'Further Math', icon: 'fa-calculator', color: '#f43f5e' }
        ];
        
        subjects.forEach(subj => {
            const hasQuiz = quizzes[subj.id] && quizzes[subj.id].length > 0;
            const questionCount = hasQuiz ? quizzes[subj.id].length : 0;
            
            const card = document.createElement('div');
            card.className = 'quiz-card';
            card.innerHTML = `
                <div class="quiz-card-icon" style="background: ${subj.color}20; color: ${subj.color}">
                    <i class="fas ${subj.icon}"></i>
                </div>
                <h3>${subj.name}</h3>
                <p>${hasQuiz ? questionCount + ' questions available' : 'No questions yet'}</p>
                <a href="quiz.html?subject=${subj.id}" class="btn ${hasQuiz ? 'btn-primary' : 'btn-outline'}">
                    ${hasQuiz ? 'Start Quiz' : 'Not Available'}
                </a>
            `;
            grid.appendChild(card);
        });
        
    } catch (error) {
        console.error('Error loading quizzes:', error);
        grid.innerHTML = '<p class="text-center" style="color: var(--gray);">Failed to load quizzes. Please refresh.</p>';
    }
}
