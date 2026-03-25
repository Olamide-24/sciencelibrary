import { auth, db } from './firebase-config(1).js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

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
    
    // Load user name
    const userNameEl = document.getElementById('userName');
    if (userNameEl) {
        userNameEl.textContent = user.displayName || 'Student';
    }
});
