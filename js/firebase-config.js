// ============================================
// FIREBASE CONFIGURATION & INITIALIZATION
// ============================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-analytics.js";

// Your Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyDw8zTDsZHqrZ961pUxAtKeAJc8bY2EQhE",
    authDomain: "science-library-6a11c.firebaseapp.com",
    projectId: "science-library-6a11c",
    storageBucket: "science-library-6a11c.firebasestorage.app",
    messagingSenderId: "120978968407",
    appId: "1:120978968407:web:aef81422bd1b2c60703812",
    measurementId: "G-4EDPNYRHS0"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const analytics = getAnalytics(app);

// Export for use in other modules
export { app, auth, db, analytics };
