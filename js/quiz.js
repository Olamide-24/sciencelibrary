import { auth, db } from './firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { addDoc, collection, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

let currentQuiz = [];
let currentQuestion = 0;
let userAnswers = [];
let timerInterval;
let timeLeft = 600; // 10 minutes in seconds
let quizSubject = '';

onAuthStateChanged(auth, (user) => {
    if (!user) {
        window.location.href = 'login.html';
        return;
    }
    
    document.getElementById('userName').textContent = user.displayName || 'Student';
    initQuiz();
});

async function initQuiz() {
    const urlParams = new URLSearchParams(window.location.search);
    quizSubject = urlParams.get('subject') || 'mathematics';
    
    // Update UI
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
    
    document.getElementById('quizTitle').textContent = subjectNames[quizSubject] + ' Quiz';
    
    try {
        const response = await fetch('data/quiz.json');
        const quizzes = await response.json();
        
        if (quizzes[quizSubject] && quizzes[quizSubject].length > 0) {
            currentQuiz = quizzes[quizSubject];
            document.getElementById('questionCount').textContent = currentQuiz.length + ' questions';
            document.getElementById('startQuizBtn').style.display = 'inline-flex';
            document.getElementById('noQuizMessage').style.display = 'none';
        } else {
            document.getElementById('startQuizBtn').style.display = 'none';
            document.getElementById('noQuizMessage').style.display = 'block';
        }
    } catch (error) {
        console.error('Error loading quiz:', error);
        document.getElementById('startQuizBtn').style.display = 'none';
        document.getElementById('noQuizMessage').style.display = 'block';
    }
}

document.getElementById('startQuizBtn')?.addEventListener('click', startQuiz);

function startQuiz() {
    document.querySelector('.quiz-intro').style.display = 'none';
    document.getElementById('quizInterface').style.display = 'block';
    
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
        
        if (timeLeft <= 0) {
            finishQuiz();
        }
    }, 1000);
}

function updateTimerDisplay() {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    document.getElementById('timer').textContent = 
        `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function showQuestion() {
    const question = currentQuiz[currentQuestion];
    
    document.getElementById('progressText').textContent = 
        `Question ${currentQuestion + 1} of ${currentQuiz.length}`;
    document.getElementById('progressFill').style.width = 
        `${((currentQuestion + 1) / currentQuiz.length) * 100}%`;
    
    document.getElementById('questionText').textContent = question.question;
    
    const optionsGrid = document.getElementById('optionsGrid');
    optionsGrid.innerHTML = '';
    
    const letters = ['A', 'B', 'C', 'D'];
    question.options.forEach((option, index) => {
        const btn = document.createElement('button');
        btn.className = 'option-btn' + (userAnswers[currentQuestion] === index ? ' selected' : '');
        btn.innerHTML = `
            <span class="option-letter">${letters[index]}</span>
            <span>${option}</span>
        `;
        btn.onclick = () => selectAnswer(index);
        optionsGrid.appendChild(btn);
    });
    
    document.getElementById('prevBtn').disabled = currentQuestion === 0;
    document.getElementById('nextBtn').innerHTML = 
        currentQuestion === currentQuiz.length - 1 ? 
        'Finish <i class="fas fa-check"></i>' : 
        'Next <i class="fas fa-arrow-right"></i>';
}

function selectAnswer(index) {
    userAnswers[currentQuestion] = index;
    
    const buttons = document.querySelectorAll('.option-btn');
    buttons.forEach((btn, i) => {
        btn.classList.toggle('selected', i === index);
    });
}

document.getElementById('prevBtn')?.addEventListener('click', () => {
    if (currentQuestion > 0) {
        currentQuestion--;
        showQuestion();
    }
});

document.getElementById('nextBtn')?.addEventListener('click', () => {
    if (currentQuestion < currentQuiz.length - 1) {
        currentQuestion++;
        showQuestion();
    } else {
        finishQuiz();
    }
});

async function finishQuiz() {
    clearInterval(timerInterval);
    
    let score = 0;
    userAnswers.forEach((answer, index) => {
        if (answer === currentQuiz[index].correct) {
            score++;
        }
    });
    
    const percentage = Math.round((score / currentQuiz.length) * 100);
    
    // Save to Firestore
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
    
    // Show results
    document.getElementById('quizInterface').style.display = 'none';
    document.getElementById('quizResults').style.display = 'block';
    
    document.getElementById('scoreValue').textContent = `${score}/${currentQuiz.length}`;
    document.getElementById('scorePercent').textContent = `${percentage}%`;
    
    let message = '';
    if (percentage >= 80) {
        message = 'Excellent work! 🎉';
        document.getElementById('resultIcon').innerHTML = '<i class="fas fa-trophy"></i>';
    } else if (percentage >= 60) {
        message = 'Good job! Keep learning 📚';
        document.getElementById('resultIcon').innerHTML = '<i class="fas fa-thumbs-up"></i>';
    } else {
        message = 'Keep practicing! You\'ll improve 💪';
        document.getElementById('resultIcon').innerHTML = '<i class="fas fa-book-open"></i>';
    }
    document.getElementById('resultMessage').textContent = message;
}

window.retryQuiz = function() {
    document.getElementById('quizResults').style.display = 'none';
    document.querySelector('.quiz-intro').style.display = 'block';
    startQuiz();
};

window.logout = async function() {
    try {
        const { signOut } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js");
        await signOut(auth);
        window.location.href = 'index.html';
    } catch (error) {
        console.error('Logout error:', error);
    }
};

