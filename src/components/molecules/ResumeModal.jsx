/**
 * @fileoverview ResumeModal — asks the user if they want to resume from a saved timestamp.
 */

import { X, Play, RotateCcw } from 'lucide-react';

/**
 * Formats seconds into MM:SS or HH:MM:SS.
 * @param {number} secs
 * @returns {string}
 */
function formatTime(secs) {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    const mm = String(m).padStart(2, '0');
    const ss = String(s).padStart(2, '0');
    return h > 0 ? `${h}:${mm}:${ss}` : `${m}:${ss}`;
}

/**
 * @param {Object} props
 * @param {number}     props.timestamp  - Saved playback position in seconds.
 * @param {() => void} props.onResume   - Resume from saved position.
 * @param {() => void} props.onRestart  - Start from the beginning.
 * @param {() => void} props.onClose    - Close the modal.
 * @returns {JSX.Element}
 */
export default function ResumeModal({ timestamp, onResume, onRestart, onClose }) {
    return (
        <div style={styles.overlay} onClick={onClose}>
            <div style={styles.card} onClick={(e) => e.stopPropagation()}>
                <button style={styles.closeBtn} onClick={onClose} aria-label="Close">
                    <X size={18} />
                </button>

                <div style={styles.iconCircle}>
                    <Play size={24} color="#fff" fill="#fff" />
                </div>

                <h3 style={styles.title}>Continue Watching?</h3>
                <p style={styles.body}>
                    You left off at <strong style={{ color: 'var(--primary)' }}>{formatTime(timestamp)}</strong>
                </p>

                <div style={styles.actions}>
                    <button style={styles.secondaryBtn} onClick={onRestart}>
                        <RotateCcw size={15} /> Start Over
                    </button>
                    <button style={styles.primaryBtn} onClick={onResume}>
                        <Play size={15} fill="#fff" color="#fff" /> Resume
                    </button>
                </div>
            </div>
        </div>
    );
}

/** @type {Record<string, import('react').CSSProperties>} */
const styles = {
    overlay: {
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 'var(--z-modal)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
    },
    card: {
        position: 'relative',
        background: 'var(--bg-card)',
        borderRadius: 'var(--radius-lg)',
        padding: '32px 28px 24px',
        textAlign: 'center',
        maxWidth: 360,
        width: '90%',
        boxShadow: 'var(--shadow-lg)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 14,
    },
    closeBtn: {
        position: 'absolute',
        top: 12,
        right: 12,
        width: 32,
        height: 32,
        borderRadius: 8,
        background: 'var(--bg-app)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: 'none',
        cursor: 'pointer',
        color: 'var(--text-muted)',
    },
    iconCircle: {
        width: 56,
        height: 56,
        borderRadius: 16,
        background: 'linear-gradient(135deg, var(--primary), #7C6BF0)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    title: {
        fontSize: '1.1rem',
        fontWeight: 700,
        color: 'var(--text-main)',
    },
    body: {
        fontSize: '0.88rem',
        color: 'var(--text-muted)',
        lineHeight: 1.5,
    },
    actions: {
        display: 'flex',
        gap: 10,
        marginTop: 6,
        width: '100%',
    },
    secondaryBtn: {
        flex: 1,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        padding: '10px 16px',
        borderRadius: 'var(--radius-full)',
        background: 'var(--bg-app)',
        color: 'var(--text-secondary)',
        fontSize: '0.82rem',
        fontWeight: 600,
        border: '1px solid var(--border-light)',
        cursor: 'pointer',
    },
    primaryBtn: {
        flex: 1,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        padding: '10px 16px',
        borderRadius: 'var(--radius-full)',
        background: 'linear-gradient(135deg, var(--primary), #7C6BF0)',
        color: '#fff',
        fontSize: '0.82rem',
        fontWeight: 600,
        border: 'none',
        cursor: 'pointer',
        boxShadow: '0 2px 8px rgba(90,75,218,0.3)',
    },
};
