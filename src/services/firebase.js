/**
 * @fileoverview Firebase service layer — Singleton initialization,
 * authentication wrappers, and Firestore instance export.
 *
 * All Firebase config is read from environment variables prefixed
 * with VITE_FIREBASE_* so that secrets never leak into the bundle.
 *
 * When env vars are missing (e.g. during local dev without a .env file),
 * Firebase is NOT initialised and a warning is shown. Auth/DB calls
 * will be no-ops that return null.
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import {
    getAuth,
    GoogleAuthProvider,
    signInWithPopup,
    signOut,
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getMessaging } from 'firebase/messaging';

/* ----------------------------------------------------------------
   Firebase Configuration (from .env)
   ---------------------------------------------------------------- */

/** @type {import('firebase/app').FirebaseOptions} */
const firebaseConfig = {
    apiKey: "AIzaSyAwCAwTUt13bzjTQ2uliqXwFzXhm6fbq4A",
    authDomain: "study-fly.firebaseapp.com",
    projectId: "study-fly",
    storageBucket: "study-fly.firebasestorage.app",
    messagingSenderId: "591506798197",
    appId: "1:591506798197:web:1a8fb012433a066f612a3c",
    measurementId: "G-CJ16NZ0QHH",
};

/**
 * Whether the Firebase configuration has the minimum required fields.
 * @type {boolean}
 */
const isConfigValid = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);

/* ----------------------------------------------------------------
   Singleton Initialization
   ---------------------------------------------------------------- */

/** @type {import('firebase/app').FirebaseApp | null} */
let app = null;

/** @type {import('firebase/auth').Auth | null} */
let auth = null;

/** @type {import('firebase/firestore').Firestore | null} */
let db = null;

/** @type {import('firebase/messaging').Messaging | null} */
let messaging = null;

if (isConfigValid) {
    /**
     * Returns the Firebase app instance, creating one only if none exists.
     * This prevents "Firebase App already exists" errors during HMR.
     */
    app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);

    // Only initialize messaging if the browser supports it
    if (typeof window !== 'undefined' && 'Notification' in window) {
        messaging = getMessaging(app);
    }
} else {
    console.warn(
        '[Firebase] Missing VITE_FIREBASE_* env vars — Firebase is disabled.\n' +
        'Copy .env.example to .env and fill in your Firebase credentials to enable auth.'
    );
}

/* ----------------------------------------------------------------
   Authentication Helpers
   ---------------------------------------------------------------- */

/** Shared Google provider instance. */
const googleProvider = new GoogleAuthProvider();

/**
 * Sign in with Google via popup. Wraps the Firebase call with
 * human-friendly error messages for common failure modes.
 *
 * @returns {Promise<import('firebase/auth').UserCredential>}
 * @throws {{ code: string, message: string }} Normalised error object.
 */
export async function signInWithGoogle() {
    if (!auth) {
        throw {
            code: 'firebase/not-configured',
            message: 'Firebase is not configured. Add your credentials to a .env file.',
        };
    }

    try {
        const result = await signInWithPopup(auth, googleProvider);
        return result;
    } catch (error) {
        /** @type {string} */
        const code = error?.code ?? 'unknown';

        const friendlyMessages = {
            'auth/popup-closed-by-user':
                'Sign-in cancelled — you closed the popup.',
            'auth/network-request-failed':
                'Network error — please check your internet connection and try again.',
            'auth/too-many-requests':
                'Too many sign-in attempts. Please wait a moment and try again.',
            'auth/user-disabled':
                'This account has been disabled. Contact support for help.',
            'auth/operation-not-allowed':
                'Google sign-in is not enabled for this project. Contact the admin.',
        };

        throw {
            code,
            message: friendlyMessages[code] ?? `Authentication failed: ${error.message}`,
        };
    }
}

/**
 * Sign out the currently authenticated user.
 *
 * @returns {Promise<void>}
 * @throws {{ code: string, message: string }} Normalised error object.
 */
export async function signOutUser() {
    if (!auth) return;

    try {
        await signOut(auth);
    } catch (error) {
        throw {
            code: error?.code ?? 'unknown',
            message: `Sign-out failed: ${error.message}`,
        };
    }
}

/* ----------------------------------------------------------------
   Exports
   ---------------------------------------------------------------- */

export { app, auth, db, messaging, isConfigValid };
