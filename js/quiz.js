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
let invalidQuestions = []; // Track invalid questions

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
        
        // Validate questions on load
        validateAllQuestions();
        
    } catch (error) {
        console.error('Error loading questions:', error);
        showQuizError('Unable to load quiz questions. Please try again later.');
    }
}

// ============================================
// VALIDATION FUNCTIONS
// ============================================

function validateAllQuestions() {
    invalidQuestions = [];
    const validSubjects = ['math', 'physics', 'chemistry', 'biology', 'english', 'further-math', 'computer', 'agriculture'];
    
    allQuestions.forEach((q, index) => {
        const errors = [];
        
        // Check 1: ID prefix matches subject
        const idPrefix = q.id.split('-')[0];
        const expectedPrefix = getSubjectPrefix(q.subject);
        
        if (idPrefix !== expectedPrefix) {
            errors.push(`ID prefix mismatch: "${idPrefix}" should be "${expectedPrefix}"`);
            console.warn(`Question ${q.id}: ID prefix "${idPrefix}" doesn't match subject "${q.subject}" (expected: ${expectedPrefix})`);
        }
        
        // Check 2: Subject is valid
        if (!validSubjects.includes(q.subject)) {
            errors.push(`Invalid subject: "${q.subject}"`);
            console.error(`Question ${q.id}: Invalid subject "${q.subject}"`);
        }
        
        // Check 3: Required fields exist
        if (!q.question) errors.push('Missing question text');
        if (!q.options || q.options.length !== 4) errors.push('Must have exactly 4 options');
        if (typeof q.correct !== 'number' || q.correct < 0 || q.correct > 3) {
            errors.push('Correct answer must be 0, 1, 2, or 3');
        }
        
        if (errors.length > 0) {
            invalidQuestions.push({
                id: q.id,
                errors: errors,
                index: index
            });
        }
    });
    
    if (invalidQuestions.length > 0) {
        console.warn(`Found ${invalidQuestions.length} invalid questions:`, invalidQuestions);
    }
    
    // Filter out invalid questions
    const originalCount = allQuestions.length;
    allQuestions = allQuestions.filter(q => !invalidQuestions.some(inv => inv.id === q.id));
    
    if (allQuestions.length < originalCount) {
        console.log(`Filtered out ${originalCount - allQuestions.length} invalid questions. ${allQuestions.length} valid questions remaining.`);
    }
}

function getSubjectPrefix(subject) {
    const prefixMap = {
        'math': 'math',
        'physics': 'phy',
        'chemistry': 'chem',
        'biology': 'bio',
        'english': 'eng',
        'further-math': 'fmath',
        'computer': 'cs',
        'agriculture': 'agr'
    };
    return prefixMap[subject] || subject;
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
    
    // Filter questions with validation
    currentQuiz = allQuestions.filter(q => {
        // Strict matching: subject must match exactly
        const subjectMatch = q.subject === currentSubject;
        
        // Also check if ID prefix matches (extra safety)
        const idPrefix = q.id.split('-')[0];
        const expectedPrefix = getSubjectPrefix(currentSubject);
        const prefixMatch = idPrefix === expectedPrefix;
        
        // Level match
        const levelMatch = q.level === currentLevel;
        
        // Log mismatches for debugging
        if (!subjectMatch && q.subject !== currentSubject) {
            console.log(`Skipping question ${q.id}: subject "${q.subject}" != "${currentSubject}"`);
        }
        
        return subjectMatch && levelMatch;
    });
    
    // Safety: double-check no wrong-subject questions slipped through
    currentQuiz = currentQuiz.filter(q => {
        const idPrefix = q.id.split('-')[0];
        const expectedPrefix = getSubjectPrefix(currentSubject);
        
        if (idPrefix !== expectedPrefix) {
            console.error(`CRITICAL: Question ${q.id} with wrong prefix "${idPrefix}" slipped through! Expected: ${expectedPrefix}`);
            return false;
        }
        return true;
    });
    
    // Shuffle and limit
    currentQuiz = shuffleArray(currentQuiz).slice(0, 10);
    
    if (currentQuiz.length === 0) {
        const availableSubjects = [...new Set(allQuestions.map(q => q.subject))];
        const availableLevels = [...new Set(allQuestions.filter(q => q.subject === currentSubject).map(q => q.level))];
        
        showQuizError(
            `No questions available for ${currentSubject} at ${currentLevel} level.<br>` +
            `Available subjects: ${availableSubjects.join(', ')}<br>` +
            (availableLevels.length > 0 ? `Available levels for ${currentSubject}: ${availableLevels.join(', ')}` : '')
        );
        return;
    }
    
    // Log what we're using
    console.log(`Starting quiz with ${currentQuiz.length} questions for ${currentSubject} (${currentLevel})`);
    currentQuiz.forEach((q, i) => console.log(`  ${i+1}. ${q.id}: ${q.topic}`));
    
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
    
    // Extra safety check
    if (question.subject !== currentSubject) {
        console.error(`ERROR: Showing question from wrong subject! ${question.id} is ${question.subject}, expected ${currentSubject}`);
        nextQuestion(); // Skip to next
        return;
    }
    
    // Update progress
    const progress = ((currentQuestionIndex) / currentQuiz.length) * 100;
    document.getElementById('quizProgress').style.width = `${progress}%`;
    document.getElementById('questionCounter').textContent = 
        `${currentQuestionIndex + 1}/${currentQuiz.length}`;
    document.getElementById('currentScore').textContent = score;
    
    // Display question with subject indicator
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
        message = '🎉 Excellent! You\'ve mastered this topic!';
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
        questionsAnswered: currentQuiz.map(q => q.id) // Track which questions were used
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
            
            await updateUserStats(percentage);
        } catch (error) {
            console.error('Error saving quiz results:', error);
        }
    }
}

async function updateUserStats(newScore) {
    if (!currentUser) return;
    
    try {
        const userRef = doc(db, 'users', currentUser.uid);
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists()) {
            const stats = userSnap.data().stats || {};
            const totalQuizzes = (stats.quizzesTaken || 0) + 1;
            const totalScore = (stats.totalScore || 0) + newScore;
            
            await setDoc(userRef, {
                stats: {
                    ...stats,
                    quizzesTaken: totalQuizzes,
                    totalScore: totalScore,
                    averageScore: Math.round(totalScore / totalQuizzes)
                }
            }, { merge: true });
        }
    } catch (error) {
        console.error('Error updating stats:', error);
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
        // Remove existing error
        const existingError = setup.querySelector('.error-message');
        if (existingError) existingError.remove();
        
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.style.marginTop = '1rem';
        errorDiv.style.padding = '1rem';
        errorDiv.style.background = '#fee2e2';
        errorDiv.style.borderRadius = '8px';
        errorDiv.style.color = '#991b1b';
        errorDiv.innerHTML = message;
        setup.appendChild(errorDiv);
    }
}

// Exports
export { currentQuiz, score, validateAllQuestions };
