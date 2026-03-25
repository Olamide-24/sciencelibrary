import { auth, db } from './firebase-config.js';
import { 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword,
    onAuthStateChanged,
    signOut,
    updateProfile
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { 
    setDoc, 
    doc, 
    serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Generate Registration ID
function generateRegId() {
    const year = new Date().getFullYear();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `SCI-${year}-${random}`;
}

// Toggle password visibility
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

// Show error message
function showError(message) {
    const errorDiv = document.getElementById('errorMessage');
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
        setTimeout(() => {
            errorDiv.style.display = 'none';
        }, 5000);
    }
}

// Show success message
function showSuccess(message) {
    const successDiv = document.getElementById('successMessage');
    if (successDiv) {
        successDiv.textContent = message;
        successDiv.style.display = 'block';
    }
}

// Set loading state
function setLoading(buttonId, isLoading) {
    const btn = document.getElementById(buttonId);
    if (btn) {
        const btnText = btn.querySelector('.btn-text');
        const btnLoader = btn.querySelector('.btn-loader');
        
        btn.disabled = isLoading;
        if (btnText) btnText.style.display = isLoading ? 'none' : 'inline';
        if (btnLoader) btnLoader.style.display = isLoading ? 'inline-flex' : 'none';
    }
}

// Handle Sign Up
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
            
            // Update profile with full name
            await updateProfile(user, { displayName: fullName });
            
            // Generate Registration ID
            const regId = generateRegId();
            
            // Save user data to Firestore
            await setDoc(doc(db, 'users', user.uid), {
                uid: user.uid,
                regId: regId,
                fullName: fullName,
                email: email,
                createdAt: serverTimestamp()
            });
            
            showSuccess('Account created successfully! Redirecting...');
            
            // Redirect to dashboard after 1.5 seconds
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1500);
            
        } catch (error) {
            console.error('Signup error:', error);
            let errorMsg = 'Failed to create account';
            
            switch(error.code) {
                case 'auth/email-already-in-use':
                    errorMsg = 'Email already registered. Please sign in.';
                    break;
                case 'auth/invalid-email':
                    errorMsg = 'Invalid email address';
                    break;
                case 'auth/weak-password':
                    errorMsg = 'Password is too weak';
                    break;
                default:
                    errorMsg = error.message;
            }
            
            showError(errorMsg);
            setLoading('signupBtn', false);
        }
    });
}

// Handle Login
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
            window.location.href = 'dashboard.html';
        } catch (error) {
            console.error('Login error:', error);
            let errorMsg = 'Failed to sign in';
            
            switch(error.code) {
                case 'auth/user-not-found':
                    errorMsg = 'No account found with this email';
                    break;
                case 'auth/wrong-password':
                    errorMsg = 'Incorrect password';
                    break;
                case 'auth/invalid-email':
                    errorMsg = 'Invalid email address';
                    break;
                case 'auth/too-many-requests':
                    errorMsg = 'Too many attempts. Please try later';
                    break;
                default:
                    errorMsg = error.message;
            }
            
            showError(errorMsg);
            setLoading('loginBtn', false);
        }
    });
}

// Check auth state and redirect if needed
onAuthStateChanged(auth, (user) => {
    const publicPages = ['index.html', 'login.html', 'signup.html', ''];
    const currentPage = window.location.pathname.split('/').pop();
    
    if (user) {
        // User is signed in - redirect from public pages to dashboard
        if (publicPages.includes(currentPage)) {
            window.location.href = 'dashboard.html';
        }
    } else {
        // User is signed out - redirect from protected pages to login
        if (!publicPages.includes(currentPage) && !currentPage.includes('index')) {
            window.location.href = 'login.html';
        }
    }
});

// Logout function
window.logout = async function() {
    try {
        await signOut(auth);
        window.location.href = 'index.html';
    } catch (error) {
        console.error('Logout error:', error);
        alert('Failed to logout. Please try again.');
    }
};

