/**
 * @fileoverview TelegramLogin — Bot-based deep-link login component.
 *
 * Flow:
 *   1. Generate a unique token
 *   2. POST token to Worker API (/api/auth/token)
 *   3. Open t.me/Study_login_9793_bot?start={token} in new tab
 *   4. Poll Worker API (/api/auth/status) every 2s
 *   5. When status === 'confirmed' → call onAuth(telegramUser)
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Send, Loader2, CheckCircle2, ExternalLink } from 'lucide-react';

const BOT_USERNAME = 'Study_login_9793_bot';

const API_BASE = import.meta.env.VITE_WORKER_URL
    || 'https://study-fly-bot.study-fly-bot.workers.dev';

/**
 * @typedef {Object} TelegramUser
 * @property {number} id
 * @property {string} first_name
 * @property {string} [last_name]
 * @property {string} [username]
 * @property {string} [photo_url]
 */

/**
 * Generates a cryptographically random token.
 * @returns {string}
 */
function generateToken() {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * @param {{ onAuth: (user: TelegramUser) => void }} props
 */
export default function TelegramLogin({ onAuth }) {
    const [status, setStatus] = useState('idle'); // idle | waiting | confirmed | error
    const [token, setToken] = useState(null);
    const unsubRef = useRef(null);

    // Clean up listener
    useEffect(() => {
        return () => {
            if (unsubRef.current) unsubRef.current();
        };
    }, []);

    const startLogin = useCallback(async () => {
        try {
            setStatus('waiting');
            const newToken = generateToken();
            setToken(newToken);

            // 1. Register token with Worker API
            await fetch(`${API_BASE}/api/auth/token`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: newToken })
            });

            // 2. Open Telegram bot in new tab
            window.open(`https://t.me/${BOT_USERNAME}?start=${newToken}`, '_blank');

            // 3. Poll for confirmation
            const pollInterval = setInterval(async () => {
                try {
                    const res = await fetch(`${API_BASE}/api/auth/status?token=${newToken}`);
                    const data = await res.json();

                    if (data.status === 'confirmed' && data.telegramUser) {
                        clearInterval(pollInterval);
                        setStatus('confirmed');
                        onAuth(data.telegramUser);
                    } else if (data.status === 'invalid') {
                        clearInterval(pollInterval);
                        setStatus('error');
                    }
                } catch (err) {
                    // Ignore fetch errors during polling
                }
            }, 2000);

            // Attach cleanup
            unsubRef.current = () => clearInterval(pollInterval);

            // Timeout after 5 minutes
            setTimeout(() => {
                if (unsubRef.current) {
                    unsubRef.current();
                    setStatus('idle');
                    setToken(null);
                }
            }, 5 * 60 * 1000);

        } catch (err) {
            console.error('[TelegramLogin] Error:', err);
            setStatus('error');
        }
    }, [onAuth]);

    return (
        <div style={styles.wrapper}>
            {status === 'idle' && (
                <button style={styles.loginBtn} onClick={startLogin}>
                    <Send size={20} />
                    <span>Login with Telegram</span>
                </button>
            )}

            {status === 'waiting' && (
                <div style={styles.waitingBox}>
                    <Loader2 size={22} className="spin" color="var(--primary)" />
                    <div>
                        <p style={styles.waitTitle}>Waiting for Telegram...</p>
                        <p style={styles.waitSub}>
                            Complete the login in the Telegram app.
                            <br />
                            Click the <strong>/start</strong> button, then tap <strong>Login Now</strong>.
                        </p>
                    </div>
                    <button
                        style={styles.retryLink}
                        onClick={() => window.open(`https://t.me/${BOT_USERNAME}?start=${token}`, '_blank')}
                    >
                        <ExternalLink size={13} /> Reopen Telegram
                    </button>
                </div>
            )}

            {status === 'confirmed' && (
                <div style={styles.confirmedBox}>
                    <CheckCircle2 size={24} color="var(--success)" />
                    <span style={styles.confirmedText}>Login Successful! Redirecting...</span>
                </div>
            )}

            {status === 'error' && (
                <div style={styles.errorBox}>
                    <p>Something went wrong. Firebase may not be configured.</p>
                    <button style={styles.retryBtn} onClick={() => setStatus('idle')}>
                        Try Again
                    </button>
                </div>
            )}
        </div>
    );
}

/** @type {Record<string, import('react').CSSProperties>} */
const styles = {
    wrapper: {
        display: 'flex',
        justifyContent: 'center',
        width: '100%',
    },
    loginBtn: {
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '14px 36px',
        background: 'linear-gradient(135deg, #0088cc, #229ED9)',
        color: '#fff',
        border: 'none',
        borderRadius: 'var(--radius-full)',
        fontSize: '1rem',
        fontWeight: 700,
        cursor: 'pointer',
        boxShadow: '0 4px 16px rgba(0, 136, 204, 0.35)',
        transition: 'transform 0.15s ease, box-shadow 0.15s ease',
    },
    waitingBox: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 12,
        padding: '20px',
        background: 'var(--primary-muted)',
        borderRadius: 'var(--radius-lg)',
        width: '100%',
        textAlign: 'center',
    },
    waitTitle: {
        fontSize: '0.95rem',
        fontWeight: 700,
        color: 'var(--text-main)',
        marginBottom: 4,
    },
    waitSub: {
        fontSize: '0.82rem',
        color: 'var(--text-muted)',
        lineHeight: 1.5,
    },
    retryLink: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        marginTop: 4,
        fontSize: '0.78rem',
        fontWeight: 600,
        color: 'var(--primary)',
        background: 'transparent',
        border: 'none',
        cursor: 'pointer',
        textDecoration: 'underline',
    },
    confirmedBox: {
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '16px 24px',
        background: 'var(--success-muted)',
        borderRadius: 'var(--radius-lg)',
    },
    confirmedText: {
        fontSize: '0.95rem',
        fontWeight: 700,
        color: 'var(--success)',
    },
    errorBox: {
        textAlign: 'center',
        padding: '16px',
        background: 'var(--error-muted)',
        borderRadius: 'var(--radius-md)',
        width: '100%',
        color: 'var(--error)',
        fontSize: '0.85rem',
    },
    retryBtn: {
        marginTop: 8,
        padding: '8px 20px',
        background: 'var(--error)',
        color: '#fff',
        border: 'none',
        borderRadius: 'var(--radius-full)',
        fontSize: '0.82rem',
        fontWeight: 600,
        cursor: 'pointer',
    },
};
