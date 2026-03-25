import { auth, db } from '.firebase-config.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, getDoc, collection, query, where, getDocs, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Global logout function
window.logout = async function() {
    try {
        await signOut(auth);
        window.location.href = 'index.html';
    } catch (error) {
        alert('Failed to logout: ' + error.message);
    }
};

// Check auth and load data immediately
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = 'login.html';
        return;
    }
    
    // User is logged in - load data
    await loadUserData(user);
    await loadQuizStats(user.uid);
    await loadQuizGrid();
});

async function loadUserData(user) {
    const uid = user.uid;
    
    try {
        const userDoc = await getDoc(doc(db, 'users', uid));
        
        if (userDoc.exists()) {
            const data = userDoc.data();
            
            // Update all user name elements
            const userNameEl = document.getElementById('userName');
            const welcomeNameEl = document.getElementById('welcomeName');
            const regIdEl = document.getElementById('regId');
            
            if (userNameEl) userNameEl.textContent = data.fullName || user.displayName || 'Student';
            if (welcomeNameEl) welcomeNameEl.textContent = (data.fullName || user.displayName || 'Student').split(' ')[0];
            if (regIdEl) regIdEl.textContent = data.regId || 'N/A';
            
        } else {
            // User document not found - create it now
            console.log('Creating missing user document...');
            
            const year = new Date().getFullYear();
            const random = Math.random().toString(36).substring(2, 6).toUpperCase();
            const regId = `SCI-${year}-${random}`;
            
            await setDoc(doc(db, 'users', uid), {
                uid: uid,
                regId: regId,
                fullName: user.displayName || 'Student',
                email: user.email,
                createdAt: serverTimestamp()
            });
            
            // Update UI with new data
            const userNameEl = document.getElementById('userName');
            const welcomeNameEl = document.getElementById('welcomeName');
            const regIdEl = document.getElementById('regId');
            
            if (userNameEl) userNameEl.textContent = user.displayName || 'Student';
            if (welcomeNameEl) welcomeNameEl.textContent = (user.displayName || 'Student').split(' ')[0];
            if (regIdEl) regIdEl.textContent = regId;
        }
    } catch (error) {
        console.error('Error loading user data:', error);
        
        // Fallback to Auth data
        const userNameEl = document.getElementById('userName');
        const welcomeNameEl = document.getElementById('welcomeName');
        
        if (userNameEl) userNameEl.textContent = user.displayName || 'Student';
        if (welcomeNameEl) welcomeNameEl.textContent = (user.displayName || 'Student').split(' ')[0];
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
        const response = await fetch('data/quiz.json');
        const quizzes = await response.json();
        
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
        
    } catch (error) {
        console.error('Error loading quizzes:', error);
    }
                   }
    
