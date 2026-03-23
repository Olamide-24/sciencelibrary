// ============================================
// AUTHENTICATION LOGIC - EMAIL/PASSWORD ONLY
// ============================================

import { auth, db } from './firebase-config.js';
import { 
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    updateProfile,
    sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js";
import { 
    doc, 
    setDoc, 
    getDoc,
    serverTimestamp 
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";

// ============================================
// AUTH STATE MANAGEMENT
// ============================================

let currentUser = null;

onAuthStateChanged(auth, async (user) => {
    currentUser = user;
    updateUIForAuthState(user);
    
    if (user) {
        await createUserDocument(user);
        console.log('User signed in:', user.email);
    } else {
        console.log('User signed out');
    }
});

function updateUIForAuthState(user) {
    const authSection = document.getElementById('authSection');
    if (!authSection) return;
    
    if (user) {
        const initials = getInitials(user.displayName || user.email);
        authSection.innerHTML = `
            <a href="profile.html" class="user-link" title="${user.displayName || user.email}">
                <div class="user-avatar">${initials}</div>
                <span class="user-name">${user.displayName || 'User'}</span>
            </a>
        `;
    } else {
        authSection.innerHTML = `
            <a href="login.html" class="btn-login">Sign In</a>
        `;
    }
}

// ============================================
// AUTHENTICATION FUNCTIONS
// ============================================

window.signUp = async function(email, password, name) {
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        await updateProfile(user, { displayName: name });
        await createUserDocument(user, { name });
        
        showMessage('Account created successfully!', 'success');
        
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1000);
        
        return user;
    } catch (error) {
        console.error('Sign up error:', error);
        showMessage(getAuthErrorMessage(error.code), 'error');
        throw error;
    }
};

window.signIn = async function(email, password) {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        showMessage('Welcome back!', 'success');
        
        const redirect = sessionStorage.getItem('redirectAfterLogin') || 'index.html';
        sessionStorage.removeItem('redirectAfterLogin');
        
        setTimeout(() => {
            window.location.href = redirect;
        }, 500);
        
        return user;
    } catch (error) {
        console.error('Sign in error:', error);
        showMessage(getAuthErrorMessage(error.code), 'error');
        throw error;
    }
};

window.logout = async function() {
    try {
        await signOut(auth);
        showMessage('Signed out successfully', 'success');
        
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 500);
    } catch (error) {
        console.error('Logout error:', error);
        showMessage('Error signing out', 'error');
    }
};

window.resetPassword = async function(email) {
    try {
        await sendPasswordResetEmail(auth, email);
        showMessage('Password reset email sent! Check your inbox.', 'success');
    } catch (error) {
        console.error('Password reset error:', error);
        showMessage(getAuthErrorMessage(error.code), 'error');
    }
};

// ============================================
// USER DOCUMENT MANAGEMENT
// ============================================

async function createUserDocument(user, additionalData = {}) {
    const userRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) {
        await setDoc(userRef, {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName || additionalData.name || '',
            photoURL: '',
            createdAt: serverTimestamp(),
            lastLogin: serverTimestamp(),
            stats: {
                booksRead: 0,
                quizzesTaken: 0,
                totalScore: 0,
                averageScore: 0
            },
            preferences: {
                darkMode: false,
                emailNotifications: true
            },
            ...additionalData
        });
    } else {
        await setDoc(userRef, { lastLogin: serverTimestamp() }, { merge: true });
    }
}

// ============================================
// UI HELPERS
// ============================================

let isLoginMode = true;

window.toggleMode = function() {
    isLoginMode = !isLoginMode;
    
    const title = document.getElementById('authTitle');
    const subtitle = document.getElementById('authSubtitle');
    const button = document.getElementById('authButton');
    const toggleText = document.getElementById('toggleText');
    const nameGroup = document.getElementById('nameGroup');
    const forgotPassword = document.getElementById('forgotPassword');
    
    if (isLoginMode) {
        title.textContent = 'Welcome Back';
        subtitle.textContent = 'Sign in to track your progress';
        button.textContent = 'Sign In';
        toggleText.innerHTML = 'Don\'t have an account? <a href="#" onclick="toggleMode(); return false;">Sign Up</a>';
        nameGroup.style.display = 'none';
        if (forgotPassword) forgotPassword.style.display = 'block';
    } else {
        title.textContent = 'Create Account';
        subtitle.textContent = 'Join thousands of learners';
        button.textContent = 'Sign Up';
        toggleText.innerHTML = 'Already have an account? <a href="#" onclick="toggleMode(); return false;">Sign In</a>';
        nameGroup.style.display = 'block';
        if (forgotPassword) forgotPassword.style.display = 'none';
    }
};

window.togglePassword = function() {
    const passwordInput = document.getElementById('userPassword');
    const toggleBtn = document.querySelector('.toggle-pass');
    
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        toggleBtn.textContent = '🙈';
    } else {
        passwordInput.type = 'password';
        toggleBtn.textContent = '👁️';
    }
};

// Form submission handler
document.addEventListener('DOMContentLoaded', () => {
    const authForm = document.getElementById('authForm');
    if (!authForm) return;
    
    authForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = document.getElementById('userEmail').value;
        const password = document.getElementById('userPassword').value;
        
        if (isLoginMode) {
            await signIn(email, password);
        } else {
            const name = document.getElementById('userName').value;
            if (!name) {
                showMessage('Please enter your name', 'error');
                return;
            }
            await signUp(email, password, name);
        }
    });
    
    // Forgot password link
    const forgotLink = document.getElementById('forgotPasswordLink');
    if (forgotLink) {
        forgotLink.addEventListener('click', (e) => {
            e.preventDefault();
            const email = document.getElementById('userEmail').value;
            if (!email) {
                showMessage('Please enter your email address first', 'error');
                return;
            }
            resetPassword(email);
        });
    }
});

// ============================================
// HELPERS
// ============================================

function getInitials(name) {
    if (!name) return '👤';
    return name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
}

function getAuthErrorMessage(code) {
    const messages = {
        'auth/email-already-in-use': 'This email is already registered',
        'auth/invalid-email': 'Please enter a valid email address',
        'auth/weak-password': 'Password should be at least 6 characters',
        'auth/user-not-found': 'No account found with this email',
        'auth/wrong-password': 'Incorrect password',
        'auth/invalid-credential': 'Invalid email or password',
        'auth/too-many-requests': 'Too many attempts. Please try again later',
        'auth/user-disabled': 'This account has been disabled'
    };
    return messages[code] || 'An error occurred. Please try again.';
}

function showMessage(message, type = 'info') {
    const errorDiv = document.getElementById('errorMessage');
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.className = `error-message ${type}`;
        
        setTimeout(() => {
            errorDiv.textContent = '';
        }, 5000);
    } else {
        alert(message);
    }
}

// Exports
export { currentUser, getCurrentUser };

function getCurrentUser() {
    return currentUser;
}
