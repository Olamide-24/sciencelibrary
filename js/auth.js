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
    serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

function generateRegId() {
    const year = new Date().getFullYear();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `SCI-${year}-${random}`;
}

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

function showError(message) {
    const errorDiv = document.getElementById('errorMessage');
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
        setTimeout(() => errorDiv.style.display = 'none', 5000);
    }
}

function showSuccess(message) {
    const successDiv = document.getElementById('successMessage');
    if (successDiv) {
        successDiv.textContent = message;
        successDiv.style.display = 'block';
    }
}

function setLoading(buttonId, isLoading) {
    const btn = document.getElementById(buttonId);
    if (btn) {
        btn.disabled = isLoading;
        const btnText = btn.querySelector('.btn-text');
        const btnLoader = btn.querySelector('.btn-loader');
        if (btnText) btnText.style.display = isLoading ? 'none' : 'inline';
        if (btnLoader) btnLoader.style.display = isLoading ? 'inline' : 'none';
    }
}

const signupForm = document.getElementById('signupForm');
if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const fullName = document.getElementById('fullName').value.trim();
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        
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
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            
            await updateProfile(user, { displayName: fullName });
            
            const regId = generateRegId();
            
            await setDoc(doc(db, 'users', user.uid), {
                uid: user.uid,
                regId: regId,
                fullName: fullName,
                email: email,
                createdAt: serverTimestamp()
            });
            
            showSuccess('Account created! Redirecting...');
            setTimeout(() => window.location.href = 'dashboard.html', 1500);
            
        } catch (error) {
            console.error('Signup error:', error);
            let errorMsg = 'Failed to create account';
            
            if (error.code === 'auth/email-already-in-use') {
                errorMsg = 'Email already registered. Please sign in.';
            } else if (error.code === 'auth/invalid-email') {
                errorMsg = 'Invalid email address';
            } else if (error.code === 'auth/weak-password') {
                errorMsg = 'Password is too weak';
            } else if (error.code === 'permission-denied') {
                errorMsg = 'Permission denied. Check Firestore rules.';
            }
            
            showError(errorMsg);
            setLoading('signupBtn', false);
        }
    });
}

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
            
            if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
                errorMsg = 'Invalid email or password';
            } else if (error.code === 'auth/wrong-password') {
                errorMsg = 'Incorrect password';
            } else if (error.code === 'auth/invalid-email') {
                errorMsg = 'Invalid email address';
            } else if (error.code === 'auth/too-many-requests') {
                errorMsg = 'Too many failed attempts. Please try again later.';
            }
            
            showError(errorMsg);
            setLoading('loginBtn', false);
        }
    });
}

onAuthStateChanged(auth, (user) => {
    const publicPages = ['index.html', 'login.html', 'signup.html', ''];
    const currentPage = window.location.pathname.split('/').pop();
    
    if (user) {
        if (publicPages.includes(currentPage)) {
            window.location.href = 'dashboard.html';
        }
    } else {
        if (!publicPages.includes(currentPage) && !currentPage.includes('index')) {
            window.location.href = 'login.html';
        }
    }
});

window.logout = async function() {
    try {
        await signOut(auth);
        window.location.href = 'index.html';
    } catch (error) {
        console.error('Logout error:', error);
        alert('Failed to logout. Please try again.');
    }
};
