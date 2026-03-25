// Firebase Configuration
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyAgFH-cEkAUJiyb3eitcy5K735WvkWlrZA",
    authDomain: "science-library-fdab3.firebaseapp.com",
    projectId: "science-library-fdab3",
    storageBucket: "science-library-fdab3.firebasestorage.app",
    messagingSenderId: "573740024170",
    appId: "1:573740024170:web:c8f7b0c8655864158da513"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Make available globally
window.auth = auth;
window.db = db;

export { app, auth, db };
