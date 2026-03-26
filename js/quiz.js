/**
 * Science Library - Quiz Module
 * Handles quiz functionality, timer, and scoring
 */

import { auth, db } from './firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { 
    addDoc, 
    collection, 
    serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// ==================== STATE ====================

let currentQuiz = [];
let currentQuestion = 0;
let userAnswers = [];
let timerInterval = null;
let timeLeft = 600; // 10 minutes in seconds
let quizSubject = '';
let subjectName = '';
let quizStartTime = null;

// ==================== INITIALIZATION ====================

onAuthStateChanged(auth, (user) => {
    if (!user) {
        window.location.href = 'login.html';
        return;
    }
    
    document.getElementById('userName').textContent = user.displayName || 'Student';
    initQuiz();
});

/**
 * Initialize quiz page
 */
async function initQuiz() {
    const urlParams = new URLSearchParams(window.location.search);
    quizSubject = urlParams.get('subject') || 'mathematics';
    
    // Subject names mapping
    const subjectNames = {
        'mathematics': 'Mathematics',
        'english': 'English Language',
        'physics': 'Physics',
        'chemistry': 'Chemistry',
        'biology': 'Biology',
        'computer': 'Computer Science',
        'agriculture': 'Agriculture Science',
        'further-math': 'Further Mathematics'
    };
    
    subjectName = subjectNames[quizSubject] || 'Quiz';
    document.getElementById('quizTitle').textContent = subjectName + ' Quiz';
    
    try {
        const response = await fetch('data/quiz.json');
        if (!response.ok) throw new Error('Failed to load quiz data');
        
        const quizzes = await response.json();
        
        const startBtn = document.getElementById('startQuizBtn');
        const noQuizMsg = document.getElementById('noQuizMessage');
        
        if (quizzes[quizSubject] && quizzes[quizSubject].length > 0) {
            currentQuiz = quizzes[quizSubject];
            document.getElementById('questionCount').textContent = currentQuiz.length + ' questions';
            
            if (startBtn) startBtn.style.display = 'inline-flex';
            if (noQuizMsg) noQuizMsg.style.display = 'none';
            
            // Setup start button
            startBtn.onclick = startQuiz;
        } else {
            if (startBtn) startBtn.style.display = 'none';
            if (noQuizMsg) noQuizMsg.style.display = 'block';
        }
    } catch (error) {
        console.error('Error loading quiz:', error);
        document.getElementById('startQuizBtn').style.display = 'none';
        document.getElementById('noQuizMessage').style.display = 'block';
    }
}

// ==================== QUIZ CONTROL ====================

/**
 * Start the quiz
 */
function startQuiz() {
    document.querySelector('.quiz-intro').style.display = 'none';
    document.getElementById('quizInterface').style.display = 'block';
    
    // Reset state
    currentQuestion = 0;
    userAnswers = new Array(currentQuiz.length).fill(null);
    timeLeft = 600; // 10 minutes
    quizStartTime = new Date();
    
    showQuestion();
    startTimer();
}

/**
 * Start countdown timer
 */
function startTimer() {
    updateTimerDisplay();
    
    timerInterval = setInterval(() => {
        timeLeft--;
        updateTimerDisplay();
        
        if (timeLeft <= 0) {
            finishQuiz();
        }
        
        // Warning at 1 minute
        if (timeLeft === 60) {
            const timerEl = document.getElementById('timer');
            timerEl.parentElement.classList.add('warning');
        }
    }, 1000);
}

/**
 * Update timer display
 */
function updateTimerDisplay() {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    const display = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    
    const timerEl = document.getElementById('timer');
    if (timerEl) timerEl.textContent = display;
    
    // Update page title
    document.title = `${display} - ${subjectName} Quiz`;
}

/**
 * Display current question
 */
function showQuestion() {
    const question = currentQuiz[currentQuestion];
    
    // Update progress
    document.getElementById('progressText').textContent = 
        `Question ${currentQuestion + 1} of ${currentQuiz.length}`;
    document.getElementById('progressFill').style.width = 
        `${((currentQuestion + 1) / currentQuiz.length) * 100}%`;
    
    // Update question text
    document.getElementById('questionText').textContent = question.question;
    
    // Generate options
    const optionsGrid = document.getElementById('optionsGrid');
    optionsGrid.innerHTML = '';
    
    const letters = ['A', 'B', 'C', 'D'];
    question.options.forEach((option, index) => {
        const btn = document.createElement('button');
        btn.className = 'option-btn' + (userAnswers[currentQuestion] === index ? ' selected' : '');
        btn.innerHTML = `
            <span class="option-letter">${letters[index]}</span>
            <span>${escapeHtml(option)}</span>
        `;
        btn.onclick = () => selectAnswer(index);
        optionsGrid.appendChild(btn);
    });
    
    // Update navigation buttons
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    
    prevBtn.disabled = currentQuestion === 0;
    nextBtn.innerHTML = currentQuestion === currentQuiz.length - 1 ? 
        'Finish <i class="fas fa-check"></i>' : 
        'Next <i class="fas fa-arrow-right"></i>';
}

/**
 * Handle answer selection
 * @param {number} index - Selected option index
 */
function selectAnswer(index) {
    userAnswers[currentQuestion] = index;
    
    // Update visual selection
    const buttons = document.querySelectorAll('.option-btn');
    buttons.forEach((btn, i) => {
        btn.classList.toggle('selected', i === index);
    });
    
    // Auto-advance after short delay (optional)
    // setTimeout(() => nextQuestion(), 500);
}

/**
 * Navigate to next question
 */
function nextQuestion() {
    if (currentQuestion < currentQuiz.length - 1) {
        currentQuestion++;
        showQuestion();
    } else {
        finishQuiz();
    }
}

/**
 * Navigate to previous question
 */
function prevQuestion() {
    if (currentQuestion > 0) {
        currentQuestion--;
        showQuestion();
    }
}

// ==================== EVENT LISTENERS ====================

document.getElementById('prevBtn')?.addEventListener('click', prevQuestion);
document.getElementById('nextBtn')?.addEventListener('click', nextQuestion);

// Keyboard navigation
document.addEventListener('keydown', (e) => {
    if (document.getElementById('quizInterface').style.display === 'none') return;
    
    if (e.key === 'ArrowLeft' && currentQuestion > 0) prevQuestion();
    if (e.key === 'ArrowRight') nextQuestion();
    if (e.key >= '1' && e.key <= '4') {
        const index = parseInt(e.key) - 1;
        if (index < currentQuiz[currentQuestion]?.options.length) {
            selectAnswer(index);
        }
    }
});

// ==================== QUIZ COMPLETION ====================

/**
 * Finish quiz and show results
 */
async function finishQuiz() {
    clearInterval(timerInterval);
    
    // Calculate score
    let score = 0;
    userAnswers.forEach((answer, index) => {
        if (answer === currentQuiz[index].correct) {
            score++;
        }
    });
    
    const percentage = Math.round((score / currentQuiz.length) * 100);
    const timeTaken = 600 - timeLeft;
    
    // Save to Firestore
    try {
        await addDoc(collection(db, 'quizResults'), {
            userId: auth.currentUser.uid,
            subject: quizSubject,
            score: score,
            totalQuestions: currentQuiz.length,
            percentage: percentage,
            answers: userAnswers,
            timeTaken: timeTaken,
            completedAt: serverTimestamp()
        });
    } catch (error) {
        console.error('Error saving quiz result:', error);
    }
    
    // Show results
    showResults(score, percentage);
}

/**
 * Display quiz results
 * @param {number} score - Correct answers
 * @param {number} percentage - Score percentage
 */
function showResults(score, percentage) {
    document.getElementById('quizInterface').style.display = 'none';
    document.getElementById('quizResults').style.display = 'block';
    
    // Update score display
    document.getElementById('scoreValue').textContent = `${score}/${currentQuiz.length}`;
    document.getElementById('scorePercent').textContent = `${percentage}%`;
    
    // Determine message and icon
    let message = '';
    let iconClass = '';
    
    if (percentage >= 80) {
        message = 'Excellent work! Outstanding performance! 🎉';
        iconClass = 'fa-trophy';
        document.getElementById('resultIcon').style.background = 'linear-gradient(135deg, #f59e0b, #d97706)';
    } else if (percentage >= 60) {
        message = 'Good job! Keep learning and improving! 📚';
        iconClass = 'fa-thumbs-up';
        document.getElementById('resultIcon').style.background = 'linear-gradient(135deg, #6366f1, #4f46e5)';
    } else {
        message = 'Keep practicing! You\'ll improve with time! 💪';
        iconClass = 'fa-book-open';
        document.getElementById('resultIcon').style.background = 'linear-gradient(135deg, #ec4899, #db2777)';
    }
    
    document.getElementById('resultMessage').textContent = message;
    document.querySelector('#resultIcon i').className = `fas ${iconClass}`;
    
    // Reset title
    document.title = 'Quiz Results - Science Library';
}

/**
 * Retry quiz
 */
window.retryQuiz = function() {
    document.getElementById('quizResults').style.display = 'none';
    document.querySelector('.quiz-intro').style.display = 'block';
    document.getElementById('timer').parentElement.classList.remove('warning');
    startQuiz();
};

/**
 * Escape HTML to prevent XSS
 * @param {string} text - Text to escape
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ==================== GLOBAL LOGOUT ====================

window.logout = async function() {
    try {
        const { signOut } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js");
        await signOut(auth);
        window.location.href = 'index.html';
    } catch (error) {
        console.error('Logout error:', error);
    }
};
