import { auth, db } from './firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, getDoc, collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Wait for DOM to be fully loaded before running
document.addEventListener('DOMContentLoaded', () => {
    console.log('Dashboard: DOM loaded, waiting for auth...');
    
    // Check auth state
    onAuthStateChanged(auth, async (user) => {
        console.log('Dashboard: Auth state changed:', user ? `User ${user.uid}` : 'No user');
        
        if (!user) {
            console.log('Dashboard: No user, redirecting to login...');
            window.location.href = 'login.html';
            return;
        }
        
        console.log('Dashboard: User authenticated:', user.email);
        console.log('Dashboard: User displayName from Auth:', user.displayName);
        
        // User is logged in - load all data
        try {
            await loadUserData(user);
            await loadQuizStats(user.uid);
            await loadQuizGrid();
            console.log('Dashboard: All data loaded successfully');
        } catch (error) {
            console.error('Dashboard: Error loading data:', error);
        }
    });
});

async function loadUserData(user) {
    const uid = user.uid;
    console.log('Dashboard: Loading user data for UID:', uid);
    
    try {
        const userDocRef = doc(db, 'users', uid);
        console.log('Dashboard: Fetching Firestore document:', userDocRef.path);
        
        const userDoc = await getDoc(userDocRef);
        console.log('Dashboard: Firestore document exists:', userDoc.exists());
        
        if (userDoc.exists()) {
            const data = userDoc.data();
            console.log('Dashboard: Firestore data:', data);
            
            // Update nav user name
            const userNameEl = document.getElementById('userName');
            if (userNameEl) {
                userNameEl.textContent = data.fullName || user.displayName || 'Student';
                console.log('Dashboard: Set userName to:', userNameEl.textContent);
            }
            
            // Update welcome name (first name only)
            const welcomeNameEl = document.getElementById('welcomeName');
            if (welcomeNameEl) {
                const fullName = data.fullName || user.displayName || 'Student';
                welcomeNameEl.textContent = fullName.split(' ')[0];
                console.log('Dashboard: Set welcomeName to:', welcomeNameEl.textContent);
            }
            
            // Update reg ID
            const regIdEl = document.getElementById('regId');
            if (regIdEl) {
                regIdEl.textContent = data.regId || 'N/A';
                console.log('Dashboard: Set regId to:', regIdEl.textContent);
            }
            
        } else {
            console.error('Dashboard: User document NOT FOUND in Firestore!');
            console.log('Dashboard: Using Auth fallback data...');
            
            // Fallback to Auth data if Firestore doc missing
            const userNameEl = document.getElementById('userName');
            const welcomeNameEl = document.getElementById('welcomeName');
            
            const displayName = user.displayName || 'Student';
            
            if (userNameEl) userNameEl.textContent = displayName;
            if (welcomeNameEl) welcomeNameEl.textContent = displayName.split(' ')[0];
            
            // Try to recreate user document if missing
            console.log('Dashboard: Attempting to recreate user document...');
            try {
                const { setDoc, serverTimestamp } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js");
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
                
                console.log('Dashboard: User document recreated successfully');
                
                // Update reg ID display
                const regIdEl = document.getElementById('regId');
                if (regIdEl) regIdEl.textContent = regId;
                
            } catch (recreateError) {
                console.error('Dashboard: Failed to recreate user document:', recreateError);
            }
        }
    } catch (error) {
        console.error('Dashboard: Error loading user data:', error);
        console.error('Dashboard: Error code:', error.code);
        console.error('Dashboard: Error message:', error.message);
        
        // Show error in UI
        const userNameEl = document.getElementById('userName');
        if (userNameEl) userNameEl.textContent = 'Error loading';
    }
}

async function loadQuizStats(uid) {
    console.log('Dashboard: Loading quiz stats for UID:', uid);
    
    try {
        const q = query(collection(db, 'quizResults'), where('userId', '==', uid));
        const querySnapshot = await getDocs(q);
        
        console.log('Dashboard: Quiz results found:', querySnapshot.size);
        
        let totalQuizzes = 0;
        let totalScore = 0;
        
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            totalQuizzes++;
            totalScore += data.percentage || 0;
        });
        
        const quizzesEl = document.getElementById('quizzesTaken');
        const avgEl = document.getElementById('avgScore');
        
        if (quizzesEl) {
            quizzesEl.textContent = totalQuizzes;
            console.log('Dashboard: Set quizzesTaken to:', totalQuizzes);
        }
        
        if (avgEl) {
            avgEl.textContent = totalQuizzes > 0 ? Math.round(totalScore / totalQuizzes) + '%' : '0%';
            console.log('Dashboard: Set avgScore to:', avgEl.textContent);
        }
        
    } catch (error) {
        console.error('Dashboard: Error loading quiz stats:', error);
    }
}

async function loadQuizGrid() {
    console.log('Dashboard: Loading quiz grid...');
    
    try {
        // Try multiple possible paths for quiz.json
        let quizzes = {};
        const possiblePaths = [
            'data/quiz.json',
            './data/quiz.json',
            '../data/quiz.json',
n            'quiz.json'
        ];
        
        let response = null;
        for (const path of possiblePaths) {
            try {
                console.log('Dashboard: Trying to fetch quiz from:', path);
                const res = await fetch(path);
                if (res.ok) {
                    response = res;
                    console.log('Dashboard: Successfully fetched quiz from:', path);
                    break;
                }
            } catch (e) {
                console.log('Dashboard: Failed to fetch from:', path);
            }
        }
        
        if (!response) {
            console.error('Dashboard: Could not find quiz.json in any location');
            renderQuizGrid({});
            return;
        }
        
        quizzes = await response.json();
        console.log('Dashboard: Quizzes loaded:', Object.keys(quizzes));
        renderQuizGrid(quizzes);
        
    } catch (error) {
        console.error('Dashboard: Error loading quizzes:', error);
        renderQuizGrid({});
    }
}

function renderQuizGrid(quizzes) {
    const grid = document.getElementById('quizGrid');
    if (!grid) {
        console.error('Dashboard: quizGrid element not found!');
        return;
    }
    
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
    
    console.log('Dashboard: Quiz grid rendered with', subjects.length, 'subjects');
}

