import { auth } from './firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

onAuthStateChanged(auth, (user) => {
    if (!user) {
        window.location.href = 'login.html';
        return;
    }
    
    // Load user name
    const userName = user.displayName || 'Student';
    const userNameEl = document.getElementById('userName');
    if (userNameEl) userNameEl.textContent = userName;
});

// Global function for topic buttons
window.showContent = function(topicId) {
    // This function is defined in each subject HTML file
    console.log('Showing content for:', topicId);
};

window.closeContent = function() {
    const section = document.getElementById('readingSection');
    if (section) {
        section.innerHTML = `
            <div class="empty-reading">
                <i class="fas fa-book-open"></i>
                <h3>Select a Topic</h3>
                <p>Click on any topic button above to start reading</p>
            </div>
        `;
    }
};

// Logout function (duplicate for subject pages)
window.logout = async function() {
    try {
        const { signOut } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js");
        const { auth } = await import('./firebase-config.js');
        await signOut(auth);
        window.location.href = 'index.html';
    } catch (error) {
        console.error('Logout error:', error);
    }
};

