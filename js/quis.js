import { auth, db } from './firebase-config.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { addDoc, collection, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

let currentQuiz = [];
let currentQuestion = 0;
let userAnswers = [];
let timerInterval;
let timeLeft = 600;
let quizSubject = '';

// Global logout
window.logout = async function() {
    try {
        await signOut(auth);
        window.location.href = 'index.html';
    } catch (error) {
        alert('Failed to logout: ' + error.message);
    }
};

onAuthStateChanged(auth, (user) => {
    if (!user) {
        window.location.href = 'login.html';
        return;
    }
    
    const userNameEl = document.getElementById('userName');
    if (userNameEl) userNameEl.textContent = user.displayName || 'Student';
    
    initQuiz();
});

async function initQuiz() {
    const urlParams = new URLSearchParams(window.location.search);
    quizSubject = urlParams.get('subject') || 'mathematics';
    
    const subjectNames = {
        'mathematics': 'Mathematics',
        'english': 'English Language',
        'physics': 'Physics',
        'chemistry': 'Chemistry',
        'biology': 'Biology',
        'computer': 'Computer',
        'agriculture': 'Agriculture Science',
        'further-math': 'Further Mathematics'
    };
    
    const quizTitleEl = document.getElementById('quizTitle');
    if (quizTitleEl) quizTitleEl.textContent = (subjectNames[quizSubject] || 'Subject') + ' Quiz';
    
    try {
        const response = await fetch('data/quiz.json');
        const quizzes = await response.json();
        
        const startBtn = document.getElementById('startQuizBtn');
        const noMsg = document.getElementById('noQuizMessage');
        const qCount = document.getElementById('questionCount');
        
        if (quizzes[quizSubject] && quizzes[quizSubject].length > 0) {
            currentQuiz = quizzes[quizSubject];
            if (qCount) qCount.textContent = currentQuiz.length + ' questions';
            if (startBtn) startBtn.style.display = 'inline-flex';
            if (noMsg) noMsg.style.display = 'none';
        } else {
            if (startBtn) startBtn.style.display = 'none';
            if (noMsg) noMsg.style.display = 'block';
        }
    } catch (error) {
        console.error('Error loading quiz:', error);
        const startBtn = document.getElementById('startQuizBtn');
        const noMsg = document.getElementById('noQuizMessage');
        if (startBtn) startBtn.style.display = 'none';
        if (noMsg) noMsg.style.display = 'block';
    }
}

const startBtn = document.getElementById('startQuizBtn');
if (startBtn) {
    startBtn.addEventListener('click', startQuiz);
}

function startQuiz() {
    const intro = document.querySelector('.quiz-intro');
    const interface_ = document.getElementById('quizInterface');
    
    if (intro) intro.style.display = 'none';
    if (interface_) interface_.style.display = 'block';
    
    currentQuestion = 0;
    userAnswers = new Array(currentQuiz.length).fill(null);
    timeLeft = 600;
    
    showQuestion();
    startTimer();
}

function startTimer() {
    updateTimerDisplay();
    timerInterval = setInterval(() => {
        timeLeft--;
        updateTimerDisplay();
        if (timeLeft <= 0) finishQuiz();
    }, 1000);
}

function updateTimerDisplay() {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    const timerEl = document.getElementById('timer');
    if (timerEl) {
        timerEl.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
}

function showQuestion() {
    const question = currentQuiz[currentQuestion];
    
    const pText = document.getElementById('progressText');
    const pFill = document.getElementById('progressFill');
    const qText = document.getElementById('questionText');
    const optionsGrid = document.getElementById('optionsGrid');
    
    if (pText) pText.textContent = `Question ${currentQuestion + 1} of ${currentQuiz.length}`;
    if (pFill) pFill.style.width = `${((currentQuestion + 1) / currentQuiz.length) * 100}%`;
    if (qText) qText.textContent = question.question;
    
    if (optionsGrid) {
        optionsGrid.innerHTML = '';
        const letters = ['A', 'B', 'C', 'D'];
        question.options.forEach((option, index) => {
            const btn = document.createElement('button');
            btn.className = 'option-btn' + (userAnswers[currentQuestion] === index ? ' selected' : '');
            btn.innerHTML = `<span class="option-letter">${letters[index]}</span><span>${option}</span>`;
            btn.onclick = () => selectAnswer(index);
            optionsGrid.appendChild(btn);
        });
    }
    
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    
    if (prevBtn) prevBtn.disabled = currentQuestion === 0;
    if (nextBtn) {
        nextBtn.innerHTML = currentQuestion === currentQuiz.length - 1 ? 
            'Finish <i class="fas fa-check"></i>' : 
            'Next <i class="fas fa-arrow-right"></i>';
    }
}

function selectAnswer(index) {
    userAnswers[currentQuestion] = index;
    const buttons = document.querySelectorAll('.option-btn');
    buttons.forEach((btn, i) => {
        btn.classList.toggle('selected', i === index);
    });
}

const prevBtn = document.getElementById('prevBtn');
if (prevBtn) {
    prevBtn.addEventListener('click', () => {
        if (currentQuestion > 0) {
            currentQuestion--;
            showQuestion();
        }
    });
}

const nextBtn = document.getElementById('nextBtn');
if (nextBtn) {
    nextBtn.addEventListener('click', () => {
        if (currentQuestion < currentQuiz.length - 1) {
            currentQuestion++;
            showQuestion();
        } else {
            finishQuiz();
        }
    });
}

async function finishQuiz() {
    clearInterval(timerInterval);
    
    let score = 0;
    userAnswers.forEach((answer, index) => {
        if (answer === currentQuiz[index].correct) score++;
    });
    
    const percentage = Math.round((score / currentQuiz.length) * 100);
    
    try {
        await addDoc(collection(db, 'quizResults'), {
            userId: auth.currentUser.uid,
            subject: quizSubject,
            score: score,
            totalQuestions: currentQuiz.length,
            percentage: percentage,
            answers: userAnswers,
            completedAt: serverTimestamp()
        });
    } catch (error) {
        console.error('Error saving quiz result:', error);
    }
    
    const interface_ = document.getElementById('quizInterface');
    const results = document.getElementById('quizResults');
    
    if (interface_) interface_.style.display = 'none';
    if (results) results.style.display = 'block';
    
    const scoreVal = document.getElementById('scoreValue');
    const scorePct = document.getElementById('scorePercent');
    const resultMsg = document.getElementById('resultMessage');
    const resultIcon = document.getElementById('resultIcon');
    
    if (scoreVal) scoreVal.textContent = `${score}/${currentQuiz.length}`;
    if (scorePct) scorePct.textContent = `${percentage}%`;
    
    let message = '';
    if (percentage >= 80) {
        message = 'Excellent work! 🎉';
        if (resultIcon) resultIcon.innerHTML = '<i class="fas fa-trophy"></i>';
    } else if (percentage >= 60) {
        message = 'Good job! Keep learning 📚';
        if (resultIcon) resultIcon.innerHTML = '<i class="fas fa-thumbs-up"></i>';
    } else {
        message = 'Keep practicing! You\'ll improve 💪';
        if (resultIcon) resultIcon.innerHTML = '<i class="fas fa-book-open"></i>';
    }
    if (resultMsg) resultMsg.textContent = message;
}

window.retryQuiz = function() {
    const results = document.getElementById('quizResults');
    const intro = document.querySelector('.quiz-intro');
    
    if (results) results.style.display = 'none';
    if (intro) intro.style.display = 'block';
    startQuiz();
};

