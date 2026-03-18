/**
 * @fileoverview Login page — Telegram bot-based sign-in gateway.
 * PW Light Theme styled with gradient and animated elements.
 */

import { useAuthContext } from '@context/AuthContext';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { AlertCircle, Loader2, Zap, Shield, BookOpen, Smartphone } from 'lucide-react';
import TelegramLogin from '@components/atoms/TelegramLogin';
import { resolvePairingSession } from '@services/pairing';

/**
 * Login page component.
 * @returns {import('react').JSX.Element}
 */
export default function Login() {
    const { user, loading, error, login, loginWithPairing } = useAuthContext();
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams] = useSearchParams();
    const [pairingLoading, setPairingLoading] = useState(false);
    const [pairingError, setPairingError] = useState(null);

    const from = location.state?.from?.pathname || '/dashboard';
    const pairingId = searchParams.get('pairingId');

    useEffect(() => {
        if (user && !loading && !pairingLoading) {
            navigate(from, { replace: true });
        }
    }, [user, loading, navigate, from, pairingLoading]);

    /* Handle Pairing ID if present */
    useEffect(() => {
        if (pairingId && !user && !loading) {
            const handlePairing = async () => {
                try {
                    setPairingLoading(true);
                    setPairingError(null);
                    const pairedUser = await resolvePairingSession(pairingId);
                    if (pairedUser) {
                        loginWithPairing(pairedUser);
                    } else {
                        setPairingError('Invalid or expired pairing session.');
                    }
                } catch (err) {
                    setPairingError(err.message || 'Failed to link device.');
                } finally {
                    setPairingLoading(false);
                }
            };
            handlePairing();
        }
    }, [pairingId, user, loading, loginWithPairing]);

    const handleTelegramAuth = async (telegramUser) => {
        await login(telegramUser);
    };

    return (
        <div style={styles.page}>
            {/* Decorative Background Blobs */}
            <div style={styles.blob1} />
            <div style={styles.blob2} />

            <div style={styles.card}>
                {/* Logo */}
                <div style={styles.logoWrapper}>
                    <div style={styles.logoCircle}>
                        <Zap size={28} color="#fff" />
                    </div>
                </div>

                {/* Header */}
                <div style={styles.header}>
                    <h1 style={styles.title}>
                        Study <span style={{ color: 'var(--primary)' }}>Fly</span>
                    </h1>
                    <p style={styles.subtitle}>Your AI-powered study companion</p>
                </div>

                {/* Error */}
                {(error || pairingError) && (
                    <div style={styles.errorBox}>
                        <AlertCircle size={16} />
                        <span>{error || pairingError}</span>
                    </div>
                )}

                {/* Auth Section */}
                <div style={styles.authSection}>
                    {loading || pairingLoading ? (
                        <div style={styles.loadingBox}>
                            <Loader2 size={24} className="spin" color="var(--primary)" />
                            <span>{pairingLoading ? 'Linking device...' : 'Authenticating identity...'}</span>
                        </div>
                    ) : (
                        <TelegramLogin onAuth={handleTelegramAuth} />
                    )}
                </div>

                {/* Features */}
                <div style={styles.features}>
                    <div style={styles.featureItem}>
                        <Shield size={14} color="var(--primary)" />
                        <span>Secure & Passwordless</span>
                    </div>
                    <div style={styles.featureItem}>
                        <BookOpen size={14} color="var(--primary)" />
                        <span>Class 12 • PCM</span>
                    </div>
                    {pairingId && (
                        <div style={styles.featureItem}>
                            <Smartphone size={14} color="var(--primary)" />
                            <span>Pairing Active</span>
                        </div>
                    )}
                </div>

                <p style={styles.subtext}>
                    Sign in with Telegram to access your personalized study dashboard.
                </p>
            </div>
        </div>
    );
}

/** @type {Record<string, import('react').CSSProperties>} */
const styles = {
    page: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: 24,
        background: 'var(--bg-app)',
        position: 'relative',
        overflow: 'hidden',
    },
    blob1: {
        position: 'absolute',
        width: 400,
        height: 400,
        borderRadius: '50%',
        background: 'rgba(90, 75, 218, 0.06)',
        top: -100,
        right: -100,
        filter: 'blur(60px)',
    },
    blob2: {
        position: 'absolute',
        width: 300,
        height: 300,
        borderRadius: '50%',
        background: 'rgba(0, 136, 204, 0.06)',
        bottom: -80,
        left: -60,
        filter: 'blur(60px)',
    },
    card: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 24,
        padding: '48px 40px',
        borderRadius: 'var(--radius-lg)',
        background: 'var(--bg-card)',
        border: '1px solid var(--border-light)',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.06)',
        maxWidth: 420,
        width: '100%',
        textAlign: 'center',
        position: 'relative',
        zIndex: 1,
    },
    logoWrapper: {
        marginBottom: -8,
    },
    logoCircle: {
        width: 56,
        height: 56,
        borderRadius: 16,
        background: 'linear-gradient(135deg, var(--primary), #7C6BF0)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 6px 20px rgba(90, 75, 218, 0.3)',
    },
    header: {
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
    },
    title: {
        fontSize: '1.8rem',
        fontWeight: 800,
        color: 'var(--text-main)',
        lineHeight: 1.1,
    },
    subtitle: {
        fontSize: '0.88rem',
        color: 'var(--text-muted)',
        fontWeight: 500,
    },
    errorBox: {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '12px 16px',
        borderRadius: 'var(--radius-md)',
        background: 'var(--error-muted)',
        color: 'var(--error)',
        fontSize: '0.85rem',
        width: '100%',
        textAlign: 'left',
    },
    authSection: {
        width: '100%',
        minHeight: 60,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    loadingBox: {
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        color: 'var(--text-main)',
        fontSize: '0.95rem',
        fontWeight: 500,
    },
    features: {
        display: 'flex',
        gap: 20,
    },
    featureItem: {
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        fontSize: '0.75rem',
        fontWeight: 600,
        color: 'var(--text-muted)',
    },
    subtext: {
        fontSize: '0.72rem',
        color: 'var(--text-muted)',
        lineHeight: 1.5,
        maxWidth: 300,
    },
};
