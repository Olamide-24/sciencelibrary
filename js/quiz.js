// ============================================
// QUIZ SYSTEM WITH VALIDATION
// ============================================

import { db } from './firebase-config.js';
import { currentUser } from './auth.js';
import { 
    doc, 
    setDoc, 
    collection,
    serverTimestamp 
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";

// ============================================
// QUIZ STATE
// ============================================

let allQuestions = [];
let currentQuiz = [];
let currentQuestionIndex = 0;
let score = 0;
let quizStartTime = null;
let currentSubject = '';
let currentTopic = '';
let currentLevel = '';

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    loadQuestions();
    
    const urlParams = new URLSearchParams(window.location.search);
    const subject = urlParams.get('subject');
    
    if (subject && document.getElementById('quizSubject')) {
        document.getElementById('quizSubject').value = subject;
    }
});

async function loadQuestions() {
    try {
        const response = await fetch('data/questions.json');
        if (!response.ok) throw new Error('Failed to load questions');
        
        const data = await response.json();
        allQuestions = data.questions || [];
        
    } catch (error) {
        console.error('Error loading questions:', error);
        showQuizError('Unable to load quiz questions. Please try again later.');
    }
}

// ============================================
// QUIZ SETUP
// ============================================

window.startQuiz = function() {
    const subjectSelect = document.getElementById('quizSubject');
    const levelSelect = document.getElementById('quizLevel');
    
    currentSubject = subjectSelect?.value || '';
    currentLevel = levelSelect?.value || 'beginner';
    currentTopic = 'general';
    
    if (!currentSubject) {
        alert('Please select a subject');
        return;
    }
    
    // Filter questions
    currentQuiz = allQuestions.filter(q => {
        return q.subject === currentSubject && q.level === currentLevel;
    });
    
    // Shuffle and limit to 10
    currentQuiz = shuffleArray(currentQuiz).slice(0, 10);
    
    if (currentQuiz.length === 0) {
        showQuizError(`No questions available for ${currentSubject} at ${currentLevel} level.`);
        return;
    }
    
    currentQuestionIndex = 0;
    score = 0;
    quizStartTime = Date.now();
    
    document.getElementById('quizSetup').style.display = 'none';
    document.getElementById('quizInterface').style.display = 'block';
    document.getElementById('quizResults').style.display = 'none';
    
    showQuestion();
};

function showQuestion() {
    const question = currentQuiz[currentQuestionIndex];
    
    // Update progress
    const progress = ((currentQuestionIndex) / currentQuiz.length) * 100;
    document.getElementById('quizProgress').style.width = `${progress}%`;
    document.getElementById('questionCounter').textContent = 
        `${currentQuestionIndex + 1}/${currentQuiz.length}`;
    document.getElementById('currentScore').textContent = score;
    
    // Display question
    document.getElementById('questionText').innerHTML = 
        `<span class="badge ${question.subject}" style="margin-bottom: 0.5rem; display: inline-block;">${question.subject}</span><br>` +
        question.question;
    
    // Display options
    const optionsContainer = document.getElementById('optionsContainer');
    optionsContainer.innerHTML = question.options.map((option, index) => `
        <button class="option-btn" onclick="selectAnswer(${index})" data-index="${index}">
            <span class="option-letter">${String.fromCharCode(65 + index)}.</span>
            ${escapeHtml(option)}
        </button>
    `).join('');
    
    document.getElementById('explanationBox').style.display = 'none';
}

window.selectAnswer = function(selectedIndex) {
    const question = currentQuiz[currentQuestionIndex];
    const buttons = document.querySelectorAll('.option-btn');
    const isCorrect = selectedIndex === question.correct;
    
    buttons.forEach(btn => btn.disabled = true);
    
    buttons[question.correct].classList.add('correct');
    if (!isCorrect) {
        buttons[selectedIndex].classList.add('wrong');
    }
    
    if (isCorrect) {
        score++;
        document.getElementById('currentScore').textContent = score;
    }
    
    const explanationBox = document.getElementById('explanationBox');
    document.getElementById('explanationText').innerHTML = 
        `<strong>${isCorrect ? '✓ Correct!' : '✗ Incorrect'}</strong><br>` +
        escapeHtml(question.explanation);
    explanationBox.style.display = 'block';
    
    saveQuestionProgress(question.id, isCorrect);
};

window.nextQuestion = function() {
    currentQuestionIndex++;
    
    if (currentQuestionIndex < currentQuiz.length) {
        showQuestion();
    } else {
        showResults();
    }
};

function showResults() {
    document.getElementById('quizInterface').style.display = 'none';
    document.getElementById('quizResults').style.display = 'block';
    
    const percentage = Math.round((score / currentQuiz.length) * 100);
    const timeTaken = Math.floor((Date.now() - quizStartTime) / 1000);
    
    document.getElementById('finalPercentage').textContent = `${percentage}%`;
    document.getElementById('correctCount').textContent = score;
    document.getElementById('totalCount').textContent = currentQuiz.length;
    
    saveQuizResults(percentage, timeTaken);
    
    const resultsCard = document.querySelector('.results-card');
    let message = '';
    
    if (percentage >= 80) {
        message = '🎉 Excellent! You\\'ve mastered this topic!';
        resultsCard.style.borderTop = '4px solid var(--success)';
    } else if (percentage >= 60) {
        message = '👍 Good job! Keep practicing to improve.';
        resultsCard.style.borderTop = '4px solid var(--warning)';
    } else {
        message = '📚 Review the material and try again!';
        resultsCard.style.borderTop = '4px solid var(--error)';
    }
    
    if (!document.querySelector('.result-message')) {
        const msgDiv = document.createElement('p');
        msgDiv.className = 'result-message';
        msgDiv.innerHTML = message + `<br><small>Subject: ${currentSubject}</small>`;
        msgDiv.style.marginTop = '1rem';
        msgDiv.style.fontSize = '1.1rem';
        document.querySelector('.final-score').appendChild(msgDiv);
    }
}

window.retryQuiz = function() {
    startQuiz();
};

window.backToTopics = function() {
    window.location.href = `subjects.html?subject=${currentSubject}`;
};

// ============================================
// PROGRESS TRACKING
// ============================================

async function saveQuestionProgress(questionId, isCorrect) {
    if (!currentUser) {
        let progress = JSON.parse(localStorage.getItem('quizProgress') || '{}');
        progress[questionId] = {
            correct: isCorrect,
            timestamp: Date.now()
        };
        localStorage.setItem('quizProgress', JSON.stringify(progress));
        return;
    }
    
    try {
        const progressRef = doc(db, 'users', currentUser.uid, 'questionProgress', questionId);
        await setDoc(progressRef, {
            questionId: questionId,
            correct: isCorrect,
            subject: currentSubject,
            answeredAt: serverTimestamp()
        }, { merge: true });
    } catch (error) {
        console.error('Error saving progress:', error);
    }
}

async function saveQuizResults(percentage, timeTaken) {
    const quizData = {
        subject: currentSubject,
        level: currentLevel,
        score: score,
        totalQuestions: currentQuiz.length,
        percentage: percentage,
        timeTaken: timeTaken,
        completedAt: serverTimestamp(),
        questionsAnswered: currentQuiz.map(q => q.id)
    };
    
    let quizHistory = JSON.parse(localStorage.getItem('quizHistory') || '[]');
    quizHistory.unshift({
        ...quizData,
        completedAt: Date.now()
    });
    quizHistory = quizHistory.slice(0, 50);
    localStorage.setItem('quizHistory', JSON.stringify(quizHistory));
    
    if (currentUser) {
        try {
            const quizRef = doc(collection(db, 'users', currentUser.uid, 'quizzes'));
            await setDoc(quizRef, quizData);
        } catch (error) {
            console.error('Error saving quiz results:', error);
        }
    }
}

// ============================================
// HELPERS
// ============================================

function shuffleArray(array) {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showQuizError(message) {
    const setup = document.getElementById('quizSetup');
    if (setup) {
        const existingError = setup.querySelector('.error-message');
        if (existingError) existingError.remove();
        
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.style.cssText = 'margin-top: 1rem; padding: 1rem; background: #fee2e2; border-radius: 8px; color: #991b1b;';
        errorDiv.textContent = message;
        setup.appendChild(errorDiv);
    }
}

// Exports
export { currentQuiz, score };

