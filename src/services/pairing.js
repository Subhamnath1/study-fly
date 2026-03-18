/**
 * @fileoverview Pairing Service — handles secure cross-device session transfers via Firestore.
 */

import {
    doc,
    setDoc,
    onSnapshot,
    deleteDoc,
    getDoc,
    serverTimestamp,
    updateDoc
} from 'firebase/firestore';
import { db } from './firebase';

const PAIRING_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Creates a unique pairing session in Firestore.
 * 
 * @param {string} pairingId Unique ID for this pairing attempt.
 * @param {import('./identity').StudyUser} user The user data to transfer.
 */
export async function createPairingSession(pairingId, user) {
    if (!db) throw new Error('Firestore is not configured. Ensure VITE_FIREBASE_* environment variables are set.');

    const pairingRef = doc(db, 'pairing_sessions', pairingId);
    await setDoc(pairingRef, {
        uid: user.uid,
        userData: user,
        status: 'pending',
        createdAt: serverTimestamp(),
        expiresAt: Date.now() + PAIRING_EXPIRY_MS
    });

    return pairingRef;
}

/**
 * Listens for a pairing session to be marked as successful by the target device.
 * 
 * @param {string} pairingId 
 * @param {(data: any) => void} onSuccess Callback when target device scans and confirms.
 */
export function listenForPairingSuccess(pairingId, onSuccess) {
    if (!db) return () => { };

    const pairingRef = doc(db, 'pairing_sessions', pairingId);
    return onSnapshot(pairingRef, (snapshot) => {
        if (snapshot.exists()) {
            const data = snapshot.data();
            if (data.status === 'success') {
                onSuccess(data);
                // Clean up after small delay
                setTimeout(() => deleteDoc(pairingRef), 2000);
            }
        }
    });
}

/**
 * Resolves a pairing ID from the target device side.
 * 
 * @param {string} pairingId 
 * @returns {Promise<import('./identity').StudyUser | null>}
 */
export async function resolvePairingSession(pairingId) {
    if (!db) return null;

    const pairingRef = doc(db, 'pairing_sessions', pairingId);
    const snap = await getDoc(pairingRef);

    if (snap.exists()) {
        const data = snap.data();

        // Check expiry
        if (data.expiresAt < Date.now()) {
            await deleteDoc(pairingRef);
            throw new Error('Pairing session has expired.');
        }

        if (data.status === 'pending') {
            // Mark as success to notify the source device
            await updateDoc(pairingRef, { status: 'success' });
            return data.userData;
        }
    }

    return null;
}
