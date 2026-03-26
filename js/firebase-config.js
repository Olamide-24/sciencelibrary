/**
 * Science Library - Firebase Configuration
 * Version: 10.7.1 (Modular SDK)
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, connectAuthEmulator } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, connectFirestoreEmulator } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyBkxnwhuheoO6cbEqJ98RT1zIiB6s4w128",
    authDomain: "science-library-2nd.firebaseapp.com",
    projectId: "science-library-2nd",
    storageBucket: "science-library-2nd.firebasestorage.app",
    messagingSenderId: "440704551630",
    appId: "1:440704551630:web:135fc2ef5f6adf67001e9f"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
const auth = getAuth(app);
const db = getFirestore(app);

// Uncomment for local development with emulators
// if (location.hostname === "localhost") {
//     connectAuthEmulator(auth, "http://localhost:9099");
//     connectFirestoreEmulator(db, "localhost", 8080);
// }

export { auth, db, app };
