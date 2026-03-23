// ============================================
// AUTHENTICATION LOGIC - MODULAR FIREBASE
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

// Auth state observer
onAuthStateChanged(auth, async (user) => {
    currentUser = user;
    updateUIForAuthState(user);
    
    if (user) {
        console.log('User signed in:', user.email);
        // Update last login
        await updateLastLogin(user);
    } else {
        console.log('User signed out');
        // Check if we're on a protected page
        checkProtectedPage();
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
            <a href="login.html?mode=signup" class="btn-primary">Get Started</a>
        `;
    }
}

function checkProtectedPage() {
    const protectedPages = ['book-viewer.html', 'quiz.html', 'subjects.html', 'topic.html', 'profile.html'];
    const currentPage = window.location.pathname.split('/').pop();
    
    if (protectedPages.includes(currentPage)) {
        // Store current page for redirect after login
        sessionStorage.setItem('redirectAfterLogin', window.location.href);
        window.location.href = 'login.html';
    }
}

async function updateLastLogin(user) {
    try {
        const userRef = doc(db, 'users', user.uid);
        await setDoc(userRef, { lastLogin: serverTimestamp() }, { merge: true });
    } catch (error) {
        console.error('Error updating last login:', error);
    }
}

// ============================================
// AUTHENTICATION FUNCTIONS
// ============================================

export async function signUp(email, password, name) {
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        // Update profile
        await updateProfile(user, { displayName: name });
        
        // Create user document
        await createUserDocument(user, { name });
        
        return { success: true, user };
    } catch (error) {
        console.error('Sign up error:', error);
        return { success: false, error: getAuthErrorMessage(error.code) };
    }
}

export async function signIn(email, password) {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        return { success: true, user: userCredential.user };
    } catch (error) {
        console.error('Sign in error:', error);
        return { success: false, error: getAuthErrorMessage(error.code) };
    }
}

export async function logout() {
    try {
        await signOut(auth);
        window.location.href = 'index.html';
    } catch (error) {
        console.error('Logout error:', error);
    }
}

export async function resetPassword(email) {
    try {
        await sendPasswordResetEmail(auth, email);
        return { success: true };
    } catch (error) {
        console.error('Password reset error:', error);
        return { success: false, error: getAuthErrorMessage(error.code) };
    }
}

// ============================================
// USER DOCUMENT MANAGEMENT
// ============================================

async function createUserDocument(user, additionalData = {}) {
    const userRef = doc(db, 'users', user.uid);
    
    await setDoc(userRef, {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || additionalData.name || '',
        photoURL: user.photoURL || '',
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
}

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

// ============================================
// EXPORTS
// ============================================

export { currentUser, auth, db };

