import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { fullSync } from '@services/cloudSync';

/**
 * @typedef {Object} AuthState
 * @property {Object | null} user
 * @property {boolean} loading
 * @property {string | null} error
 * @property {(telegramUser: Object) => Promise<void>} login
 * @property {(userData: Object) => void} loginWithPairing
 * @property {() => void} logout
 */

/** @type {import('react').Context<AuthState | undefined>} */
const AuthContext = createContext(undefined);

const LOCAL_STORAGE_KEY = 'study_fly_user_session';

/**
 * Provides authentication state to the component tree.
 *
 * @param {{ children: import('react').ReactNode }} props
 * @returns {JSX.Element}
 */
export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    /* Rehydrate session from localStorage on mount */
    useEffect(() => {
        try {
            const storedSession = localStorage.getItem(LOCAL_STORAGE_KEY);
            if (storedSession) {
                const parsed = JSON.parse(storedSession);
                setUser(parsed);
                // Sync progress from cloud on page reload
                if (parsed?.username) {
                    fullSync(parsed.username).catch(() => {});
                }
            }
        } catch (e) {
            console.warn('[AuthContext] Failed to parse local session.', e);
            localStorage.removeItem(LOCAL_STORAGE_KEY);
        } finally {
            setLoading(false);
        }
    }, []);

    /**
     * Process a Telegram login payload.
     * Builds user object directly — no Firestore needed.
     *
     * @param {Object} telegramUser
     */
    const login = useCallback(async (telegramUser) => {
        try {
            setError(null);
            setLoading(true);

            // Build user object directly from Telegram payload
            const userData = {
                uid: `telegram_${telegramUser.id}`,
                name: [telegramUser.first_name, telegramUser.last_name].filter(Boolean).join(' '),
                username: telegramUser.username || '',
                photoURL: telegramUser.photo_url || '',
                createdAt: new Date().toISOString(),
                batch: 'Class 12',
            };

            // Update React state
            setUser(userData);

            // Persist session
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(userData));

            // Sync progress from cloud
            if (userData.username) {
                fullSync(userData.username).catch(() => {});
            }

        } catch (err) {
            console.error('[AuthContext] Login failed:', err);
            setError(err?.message ?? 'Sign-in failed. Please try again.');
        } finally {
            setLoading(false);
        }
    }, []);

    /**
     * Rehydrate session from a pairing transfer.
     * 
     * @param {import('@services/identity').StudyUser} userData
     */
    const loginWithPairing = useCallback((userData) => {
        setUser(userData);
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(userData));
        // Sync progress from cloud
        if (userData.username) {
            fullSync(userData.username).catch(() => {});
        }
    }, []);

    /**
     * Sign out the currently authenticated user.
     */
    const logout = useCallback(() => {
        setUser(null);
        setError(null);
        localStorage.removeItem(LOCAL_STORAGE_KEY);
    }, []);

    return (
        <AuthContext.Provider value={{ user, loading, error, login, loginWithPairing, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

/**
 * Hook to consume authentication state from the nearest `AuthProvider`.
 *
 * @returns {AuthState}
 * @throws {Error} If used outside of `<AuthProvider>`.
 */
export function useAuthContext() {
    const ctx = useContext(AuthContext);
    if (ctx === undefined) {
        throw new Error('useAuthContext must be used within an <AuthProvider>');
    }
    return ctx;
}

export default AuthContext;
