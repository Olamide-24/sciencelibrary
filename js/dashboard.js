import { auth, db } from './firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, getDoc, collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Check auth state
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = 'login.html';
        return;
    }
    
    // Load user data
    await loadUserData(user.uid);
    await loadQuizStats(user.uid);
    await loadQuizGrid();
});

// Load user data
async function loadUserData(uid) {
    try {
        const userDoc = await getDoc(doc(db, 'users', uid));
        if (userDoc.exists()) {
            const data = userDoc.data();
            
            // Update UI
            document.getElementById('userName').textContent = data.fullName || 'Student';
            document.getElementById('welcomeName').textContent = data.fullName?.split(' ')[0] || 'Student';
            document.getElementById('regId').textContent = data.regId || 'N/A';
        }
    } catch (error) {
        console.error('Error loading user data:', error);
    }
}

// Load quiz statistics
async function loadQuizStats(uid) {
    try {
        const q = query(collection(db, 'quizResults'), where('userId', '==', uid));
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
                subjectScores[data.subject] = [];
            }
            subjectScores[data.subject].push(data.percentage);
        });
        
        // Update UI
        document.getElementById('quizzesTaken').textContent = totalQuizzes;
        
        const avgScore = totalQuizzes > 0 ? Math.round(totalScore / totalQuizzes) : 0;
        document.getElementById('avgScore').textContent = avgScore + '%';
        
        // Find best subject
        let bestSubject = '-';
        let bestAvg = 0;
        for (const [subject, scores] of Object.entries(subjectScores)) {
            const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
            if (avg > bestAvg) {
                bestAvg = avg;
                bestSubject = subject.charAt(0).toUpperCase() + subject.slice(1);
            }
        }
        document.getElementById('bestSubject').textContent = bestSubject;
        
    } catch (error) {
        console.error('Error loading quiz stats:', error);
    }
}

// Load quiz grid
async function loadQuizGrid() {
    try {
        const response = await fetch('data/quiz.json');
        const quizzes = await response.json();
        
        const grid = document.getElementById('quizGrid');
        grid.innerHTML = '';
        
        const subjects = [
            { id: 'mathematics', name: 'Mathematics', icon: 'fa-square-root-alt', color: '#f59e0b' },
            { id: 'english', name: 'English', icon: 'fa-language', color: '#ec4899' },
            { id: 'physics', name: 'Physics', icon: 'fa-atom', color: '#06b6d4' },
            { id: 'chemistry', name: 'Chemistry', icon: 'fa-flask', color: '#10b981' },
            { id: 'biology', name: 'Biology', icon: 'fa-dna', color: '#8b5cf6' },
            { id: 'computer', name: 'Computer', icon: 'fa-laptop-code', color: '#6366f1' },
            { id: 'agriculture', name: 'Agriculture', icon: 'fa-seedling', color: '#84cc16' },
            { id: 'further-math', name: 'Further Math', icon: 'fa-calculator', color: '#f43f5e' }
        ];
        
        subjects.forEach(subj => {
            const hasQuiz = quizzes[subj.id] && quizzes[subj.id].length > 0;
            const card = document.createElement('div');
            card.className = 'quiz-card';
            card.innerHTML = `
                <div class="quiz-card-icon" style="background: ${subj.color}20; color: ${subj.color}">
                    <i class="fas ${subj.icon}"></i>
                </div>
                <h3>${subj.name}</h3>
                <p>${hasQuiz ? quizzes[subj.id].length + ' questions available' : 'No questions available'}</p>
                <a href="quiz.html?subject=${subj.id}" class="btn ${hasQuiz ? 'btn-primary' : 'btn-outline'}">
                    ${hasQuiz ? 'Start Quiz' : 'Not Available'}
                </a>
            `;
            grid.appendChild(card);
        });
        
    } catch (error) {
        console.error('Error loading quizzes:', error);
    }
}

