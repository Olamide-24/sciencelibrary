/**
 * Science Library - Authentication Module
 * Handles signup, login, logout, and auth state
 */

import { auth, db } from './firebase-config.js';
import { 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword,
    onAuthStateChanged,
    signOut,
    updateProfile
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { 
    doc, 
    setDoc, 
    serverTimestamp,
    getDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// ==================== UTILITY FUNCTIONS ====================

/**
 * Generate unique registration ID
 * Format: SCI-YYYY-XXXX (e.g., SCI-2026-A8B2)
 */
function generateRegId() {
    const year = new Date().getFullYear();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `SCI-${year}-${random}`;
}

/**
 * Toggle password visibility
 * @param {string} inputId - ID of password input
 */
window.togglePassword = function(inputId) {
    const input = document.getElementById(inputId);
    const button = input.nextElementSibling;
    const icon = button.querySelector('i');
    
    if (input.type === 'password') {
        input.type = 'text';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
    } else {
        input.type = 'password';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
    }
};

/**
 * Show error message
 * @param {string} message - Error message to display
 */
function showError(message) {
    const errorDiv = document.getElementById('errorMessage');
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.classList.add('show');
        setTimeout(() => errorDiv.classList.remove('show'), 5000);
    }
}

/**
 * Show success message
 * @param {string} message - Success message to display
 */
function showSuccess(message) {
    const successDiv = document.getElementById('successMessage');
    if (successDiv) {
        successDiv.textContent = message;
        successDiv.classList.add('show');
    }
}

/**
 * Set loading state on button
 * @param {string} buttonId - ID of button
 * @param {boolean} isLoading - Loading state
 */
function setLoading(buttonId, isLoading) {
    const btn = document.getElementById(buttonId);
    if (btn) {
        btn.disabled = isLoading;
        btn.classList.toggle('loading', isLoading);
    }
}

// ==================== PASSWORD STRENGTH ====================

const passwordInput = document.getElementById('password');
const strengthIndicator = document.getElementById('passwordStrength');

if (passwordInput && strengthIndicator) {
    passwordInput.addEventListener('input', (e) => {
        const password = e.target.value;
        strengthIndicator.classList.add('show');
        
        let strength = 0;
        if (password.length >= 6) strength++;
        if (password.length >= 10) strength++;
        if (/[A-Z]/.test(password)) strength++;
        if (/[0-9]/.test(password)) strength++;
        if (/[^A-Za-z0-9]/.test(password)) strength++;
        
        strengthIndicator.className = 'password-strength show';
        if (strength <= 2) {
            strengthIndicator.classList.add('weak');
        } else if (strength <= 4) {
            strengthIndicator.classList.add('medium');
        } else {
            strengthIndicator.classList.add('strong');
        }
    });
}

// ==================== SIGN UP ====================

const signupForm = document.getElementById('signupForm');
if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const fullName = document.getElementById('fullName').value.trim();
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        
        // Validation
        if (!fullName || !email || !password || !confirmPassword) {
            showError('Please fill in all fields');
            return;
        }
        
        if (fullName.length < 2) {
            showError('Full name must be at least 2 characters');
            return;
        }
        
        if (password.length < 6) {
            showError('Password must be at least 6 characters');
            return;
        }
        
        if (password !== confirmPassword) {
            showError('Passwords do not match');
            return;
        }
        
        setLoading('signupBtn', true);
        
        try {
            // Create user in Firebase Auth
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            
            // Update profile with display name
            await updateProfile(user, { displayName: fullName });
            
            // Generate registration ID
            const regId = generateRegId();
            
            // Save user data to Firestore
            await setDoc(doc(db, 'users', user.uid), {
                uid: user.uid,
                regId: regId,
                fullName: fullName,
                email: email,
                createdAt: serverTimestamp(),
                lastLoginAt: serverTimestamp()
            });
            
            showSuccess('Account created successfully! Redirecting...');
            
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1500);
            
        } catch (error) {
            console.error('Signup error:', error);
            let errorMsg = 'Failed to create account. Please try again.';
            
            switch (error.code) {
                case 'auth/email-already-in-use':
                    errorMsg = 'Email already registered. Please sign in.';
                    break;
                case 'auth/invalid-email':
                    errorMsg = 'Invalid email address format.';
                    break;
                case 'auth/weak-password':
                    errorMsg = 'Password is too weak. Use at least 6 characters.';
                    break;
                case 'auth/network-request-failed':
                    errorMsg = 'Network error. Please check your connection.';
                    break;
            }
            
            showError(errorMsg);
            setLoading('signupBtn', false);
        }
    });
}

// ==================== LOGIN ====================

const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        
        if (!email || !password) {
            showError('Please enter email and password');
            return;
        }
        
        setLoading('loginBtn', true);
        
        try {
            await signInWithEmailAndPassword(auth, email, password);
            
            // Update last login timestamp
            const user = auth.currentUser;
            if (user) {
                await setDoc(doc(db, 'users', user.uid), {
                    lastLoginAt: serverTimestamp()
                }, { merge: true });
            }
            
            window.location.href = 'dashboard.html';
            
        } catch (error) {
            console.error('Login error:', error);
            let errorMsg = 'Failed to sign in. Please try again.';
            
            switch (error.code) {
                case 'auth/user-not-found':
                case 'auth/wrong-password':
                case 'auth/invalid-credential':
                    errorMsg = 'Invalid email or password.';
                    break;
                case 'auth/user-disabled':
                    errorMsg = 'Account has been disabled. Contact support.';
                    break;
                case 'auth/too-many-requests':
                    errorMsg = 'Too many failed attempts. Please try again later.';
                    break;
                case 'auth/network-request-failed':
                    errorMsg = 'Network error. Please check your connection.';
                    break;
            }
            
            showError(errorMsg);
            setLoading('loginBtn', false);
        }
    });
}

// ==================== AUTH STATE CHECK ====================

onAuthStateChanged(auth, (user) => {
    const publicPages = ['index.html', 'login.html', 'signup.html', ''];
    const currentPage = window.location.pathname.split('/').pop();
    
    if (user) {
        // User is logged in - redirect away from public pages
        if (publicPages.includes(currentPage)) {
            window.location.href = 'dashboard.html';
        }
    } else {
        // User is logged out - redirect to login if accessing protected pages
        if (!publicPages.includes(currentPage) && !currentPage.includes('index')) {
            window.location.href = 'login.html';
        }
    }
});

// ==================== GLOBAL LOGOUT ====================

window.logout = async function() {
    try {
        await signOut(auth);
        window.location.href = 'index.html';
    } catch (error) {
        console.error('Logout error:', error);
        alert('Failed to logout. Please try again.');
    }
};
