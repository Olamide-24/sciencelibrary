import { auth, db } from './firebase-config.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

onAuthStateChanged(auth, (user) => {
    if (!user) {
        window.location.href = 'login.html';
        return;
    }
    
    // Load user name
    const userNameEl = document.getElementById('userName');
    if (userNameEl) {
        userNameEl.textContent = user.displayName || 'Student';
    }
});

// GLOBAL LOGOUT - Works on all pages
window.logout = async function() {
    try {
        await signOut(auth);
        window.location.href = 'index.html';
    } catch (error) {
        console.error('Logout error:', error);
        alert('Failed to logout. Please try again.');
    }
};
