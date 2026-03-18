/**
 * @fileoverview Identity Service — handles mapping Telegram users to Firestore documents.
 */

import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

/**
 * @typedef {Object} StudyUser
 * @property {string} uid
 * @property {string} name
 * @property {string} [username]
 * @property {string} [photoURL]
 * @property {any}    createdAt
 * @property {string} batch
 * @property {Record<string, any>} progress
 * @property {any[]}  backlog
 */

/**
 * Checks if a user document already exists for the given Telegram ID.
 *
 * @param {number|string} telegramId
 * @returns {Promise<StudyUser | null>} Returns the user doc if found, otherwise null.
 */
export async function checkUserExists(telegramId) {
    if (!db) {
        console.warn('[IdentityService] Firestore is disabled.');
        return null;
    }

    try {
        const uid = `telegram_${telegramId}`;
        const userRef = doc(db, 'users', uid);
        const snap = await getDoc(userRef);

        if (snap.exists()) {
            return /** @type {StudyUser} */ (snap.data());
        }
        return null;
    } catch (error) {
        console.error('[IdentityService] Error checking user existence:', error);
        throw new Error('Failed to verify user identity.');
    }
}

/**
 * Creates a new user document from a Telegram payload.
 *
 * @param {import('@atoms/TelegramLogin').TelegramUser} telegramUser
 * @returns {Promise<StudyUser>} The newly created user object.
 */
export async function createUser(telegramUser) {
    if (!db) {
        console.warn('[IdentityService] Firestore is disabled.');
        // Return a mock user for local dev UI testing if Firebase is off
        return {
            uid: `telegram_${telegramUser.id}`,
            name: telegramUser.first_name,
            username: telegramUser.username,
            photoURL: telegramUser.photo_url,
            createdAt: new Date().toISOString(),
            batch: 'Class 12',
            progress: {},
            backlog: [],
        };
    }

    try {
        const uid = `telegram_${telegramUser.id}`;

        /** @type {StudyUser} */
        const newUser = {
            uid,
            name: telegramUser.first_name,
            username: telegramUser.username || '',
            photoURL: telegramUser.photo_url || '',
            createdAt: serverTimestamp(),
            batch: 'Class 12',
            progress: {},
            backlog: [],
        };

        const userRef = doc(db, 'users', uid);
        await setDoc(userRef, newUser);

        return newUser;
    } catch (error) {
        console.error('[IdentityService] Error creating user profile:', error);
        throw new Error('Failed to create user profile.');
    }
}
