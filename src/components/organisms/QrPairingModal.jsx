/**
 * @fileoverview QR Pairing Modal — Generates a pairing session and displays a QR code.
 */

import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, Smartphone, CheckCircle, Loader2, ShieldCheck, AlertCircle } from 'lucide-react';
import { createPairingSession, listenForPairingSuccess } from '@services/pairing';
import { useAuthContext } from '@context/AuthContext';

/**
 * QR Pairing Modal Component.
 * @param {{ isOpen: boolean, onClose: () => void }} props
 * @returns {import('react').JSX.Element | null}
 */
export default function QrPairingModal({ isOpen, onClose }) {
    const { user } = useAuthContext();
    const [pairingId, setPairingId] = useState(null);
    const [status, setStatus] = useState('initializing'); // initializing, pending, success, error
    const [error, setError] = useState(null);
    const [retryCount, setRetryCount] = useState(0);

    // Generate pairing ID and start listener on mount/open
    useEffect(() => {
        if (!isOpen || !user) return;

        let unsubscribe = () => { };

        const initPairing = async () => {
            try {
                setStatus('initializing');
                const newId = Math.random().toString(36).substring(2, 10).toUpperCase();
                setPairingId(newId);

                await createPairingSession(newId, user);
                setStatus('pending');

                unsubscribe = listenForPairingSuccess(newId, () => {
                    setStatus('success');
                });
            } catch (err) {
                console.error('[QrPairing] Init failed:', err);
                setError('Failed to start pairing session.');
                setStatus('error');
            }
        };

        initPairing();

        return () => unsubscribe();
    }, [isOpen, user, retryCount]);

    if (!isOpen) return null;

    const pairingUrl = `${window.location.origin}/login?pairingId=${pairingId}`;

    return (
        <div style={styles.overlay}>
            <div style={styles.modal}>
                <button style={styles.closeBtn} onClick={onClose}>
                    <X size={20} />
                </button>

                <div style={styles.header}>
                    <div style={styles.iconCircle}>
                        <Smartphone size={24} color="var(--primary)" />
                    </div>
                    <h3 style={styles.title}>Pair New Device</h3>
                    <p style={styles.subtitle}>Scan this QR code with the device you want to log in to.</p>
                </div>

                <div style={styles.content}>
                    {status === 'initializing' && (
                        <div style={styles.placeholder}>
                            <Loader2 size={32} className="spin" color="var(--primary)" />
                            <span>Generating code...</span>
                        </div>
                    )}

                    {status === 'pending' && (
                        <div style={styles.qrWrapper}>
                            <div style={styles.qrContainer}>
                                <QRCodeSVG value={pairingUrl} size={180} level="H" includeMargin />
                            </div>
                            <div style={styles.idBadge}>
                                <span style={styles.idLabel}>ID:</span>
                                <span style={styles.idValue}>{pairingId}</span>
                            </div>
                            <p style={styles.tip}>
                                This code expires in 5 minutes for security.
                            </p>
                        </div>
                    )}

                    {status === 'success' && (
                        <div style={styles.successWrapper}>
                            <div style={styles.successIcon}>
                                <CheckCircle size={48} color="var(--success)" />
                            </div>
                            <h4 style={styles.successTitle}>Device Linked!</h4>
                            <p style={styles.successSub}>Your session has been successfully shared.</p>
                            <button style={styles.doneBtn} onClick={onClose}>Done</button>
                        </div>
                    )}

                    {status === 'error' && (
                        <div style={styles.errorWrapper}>
                            <AlertCircle size={48} color="var(--error)" />
                            <h4 style={styles.errorTitle}>Pairing Failed</h4>
                            <p style={styles.errorSub}>{error}</p>
                            <button style={styles.retryBtn} onClick={() => { setError(null); setStatus('initializing'); setRetryCount(c => c + 1); }}>Retry</button>
                        </div>
                    )}
                </div>

                <div style={styles.footer}>
                    <ShieldCheck size={14} color="var(--text-muted)" />
                    <span>Secure End-to-End Transfer</span>
                </div>
            </div>
        </div>
    );
}

/** @type {Record<string, import('react').CSSProperties>} */
const styles = {
    overlay: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.4)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: 20,
    },
    modal: {
        background: 'var(--bg-card)',
        borderRadius: 'var(--radius-lg)',
        width: '100%',
        maxWidth: 360,
        padding: '32px 24px',
        position: 'relative',
        boxShadow: '0 20px 50px rgba(0, 0, 0, 0.15)',
        textAlign: 'center',
    },
    closeBtn: {
        position: 'absolute',
        top: 16,
        right: 16,
        background: 'none',
        border: 'none',
        color: 'var(--text-muted)',
        cursor: 'pointer',
        padding: 4,
    },
    header: {
        marginBottom: 24,
    },
    iconCircle: {
        width: 48,
        height: 48,
        borderRadius: '50%',
        background: 'rgba(92, 75, 218, 0.1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '0 auto 16px',
    },
    title: {
        fontSize: '1.25rem',
        fontWeight: 700,
        color: 'var(--text-main)',
        marginBottom: 6,
    },
    subtitle: {
        fontSize: '0.85rem',
        color: 'var(--text-muted)',
        lineHeight: 1.4,
    },
    content: {
        minHeight: 220,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    placeholder: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 12,
        color: 'var(--text-muted)',
        fontSize: '0.9rem',
    },
    qrWrapper: {
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
    },
    qrContainer: {
        padding: 12,
        background: '#fff',
        borderRadius: 'var(--radius-md)',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
        marginBottom: 16,
    },
    idBadge: {
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '4px 12px',
        background: 'var(--bg-app)',
        borderRadius: 20,
        marginBottom: 12,
    },
    idLabel: {
        fontSize: '0.75rem',
        fontWeight: 600,
        color: 'var(--text-muted)',
    },
    idValue: {
        fontSize: '0.85rem',
        fontWeight: 700,
        color: 'var(--primary)',
        letterSpacing: 1,
    },
    tip: {
        fontSize: '0.75rem',
        color: 'var(--text-muted)',
        fontStyle: 'italic',
    },
    successWrapper: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '20px 0',
    },
    successIcon: {
        marginBottom: 16,
        animation: 'scaleIn 0.3s ease-out',
    },
    successTitle: {
        fontSize: '1.1rem',
        fontWeight: 700,
        color: 'var(--text-main)',
        marginBottom: 4,
    },
    successSub: {
        fontSize: '0.85rem',
        color: 'var(--text-muted)',
        marginBottom: 20,
    },
    doneBtn: {
        padding: '10px 32px',
        borderRadius: 'var(--radius-md)',
        background: 'var(--primary)',
        color: '#fff',
        fontWeight: 600,
        border: 'none',
        cursor: 'pointer',
    },
    errorWrapper: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
    },
    errorTitle: {
        fontSize: '1.1rem',
        color: 'var(--error)',
        marginTop: 12,
    },
    errorSub: {
        fontSize: '0.85rem',
        color: 'var(--text-muted)',
        marginTop: 4,
        marginBottom: 16,
    },
    retryBtn: {
        padding: '8px 24px',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border-light)',
        background: 'none',
        color: 'var(--text-main)',
        fontWeight: 500,
        cursor: 'pointer',
    },
    footer: {
        marginTop: 24,
        paddingTop: 16,
        borderTop: '1px solid var(--border-light)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        fontSize: '0.7rem',
        color: 'var(--text-muted)',
        fontWeight: 500,
    }
};
