import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, updateDoc, doc } from "firebase/firestore";
import fs from 'fs';
import path from 'path';

// Read config from .env or just hardcode if needed
// Actually, I can just use the config from the project

const firebaseConfig = {
    apiKey: process.env.VITE_FIREBASE_API_KEY,
    authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.VITE_FIREBASE_APP_ID
};

console.log("To clear localStorage, please run this in your browser console:");
console.log("localStorage.removeItem('study_fly_progress');");
console.log("localStorage.removeItem('study_fly_exam_progress');");
console.log("window.location.reload();");
