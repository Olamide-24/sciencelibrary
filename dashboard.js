import { auth, db } from './firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, getDoc, collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Check auth and load data
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = 'login.html';
        return;
    }
    
    // User is logged in - load data
    await loadUserData(user.uid);
    await loadQuizStats(user.uid);
    await loadQuizGrid();
});

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
            console.log('User document not found');
        }
    } catch (error) {
        console.error('Error loading user data:', error);
    }
}

async function loadQuizStats(uid) {
    try {
        const q = query(collection(db, 'quizResults'), where('userId', '==', uid));
        const querySnapshot = await getDocs(q);
        
        let totalQuizzes = 0;
        let totalScore = 0;
        
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            totalQuizzes++;
            totalScore += data.percentage || 0;
        });
        
        const quizzesEl = document.getElementById('quizzesTaken');
        const avgEl = document.getElementById('avgScore');
        
        if (quizzesEl) quizzesEl.textContent = totalQuizzes;
        if (avgEl) avgEl.textContent = totalQuizzes > 0 ? Math.round(totalScore / totalQuizzes) + '%' : '0%';
        
    } catch (error) {
        console.error('Error loading quiz stats:', error);
    }
}

async function loadQuizGrid() {
    try {
        // FIX: Try multiple possible paths for quiz.json
        let quizzes = {};
        const possiblePaths = [
            'data/quiz.json',
            './data/quiz.json',
            '../data/quiz.json',
            'quiz.json'
        ];
        
        let response = null;
        for (const path of possiblePaths) {
            try {
                const res = await fetch(path);
                if (res.ok) {
                    response = res;
                    break;
                }
            } catch (e) {
                continue;
            }
        }
        
        if (!response) {
            console.error('Could not find quiz.json in any location');
            // Create default empty state
            renderQuizGrid({});
            return;
        }
        
        quizzes = await response.json();
        renderQuizGrid(quizzes);
        
    } catch (error) {
        console.error('Error loading quizzes:', error);
        renderQuizGrid({});
    }
}

function renderQuizGrid(quizzes) {
    const grid = document.getElementById('quizGrid');
    if (!grid) return;
    
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
            <p>${hasQuiz ? quizzes[subj.id].length + ' questions' : 'No questions'}</p>
            <a href="quiz.html?subject=${subj.id}" class="btn ${hasQuiz ? 'btn-primary' : 'btn-outline'}">
                ${hasQuiz ? 'Start Quiz' : 'Not Available'}
            </a>
        `;
        grid.appendChild(card);
    });
}
