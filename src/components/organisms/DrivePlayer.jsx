/**
 * @fileoverview DrivePlayer — Google Drive Video Iframe wrapper.
 *
 * Since Drive iframes don't emit time events, we provide:
 * - A "Resume" popup if previous progress exists (> 60s).
 * - A manual "Mark as Completed" button.
 */

import { useState, useEffect } from 'react';
import { CheckCircle2, Loader2 } from 'lucide-react';
import ResumeModal from '@molecules/ResumeModal';

/**
 * @param {Object} props
 * @param {string}  props.videoId        - Google Drive file ID.
 * @param {import('@hooks/useProgress').VideoProgress | null} props.progress
 * @param {(videoId: string) => Promise<void>} props.onMarkComplete
 * @param {boolean} [props.completed]    - Whether already marked done.
 * @returns {JSX.Element}
 */
export default function DrivePlayer({ videoId, progress, onMarkComplete, completed = false }) {
    const [showResume, setShowResume] = useState(false);
    const [isCompleted, setIsCompleted] = useState(completed);
    const [marking, setMarking] = useState(false);
    const [iframeLoaded, setIframeLoaded] = useState(false);

    const isYouTube = videoId?.length <= 11;
    const embedUrl = isYouTube
        ? `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1`
        : `https://drive.google.com/file/d/${videoId}/preview`;

    /* Show resume modal if saved timestamp > 60s */
    useEffect(() => {
        if (progress && progress.timestamp > 60 && !progress.completed && !isYouTube) {
            setShowResume(true);
        }
    }, [progress, isYouTube]);

    useEffect(() => {
        setIsCompleted(completed);
    }, [completed]);

    /** Handle mark as completed */
    const handleMarkComplete = async () => {
        setMarking(true);
        setIsCompleted(true); // Optimistic
        try {
            await onMarkComplete(videoId);
        } catch (err) {
            console.error('[DrivePlayer] Failed to mark complete:', err);
            setIsCompleted(false);
        } finally {
            setMarking(false);
        }
    };

    return (
        <div style={styles.wrapper}>
            {/* ── Video container (16:9) ── */}
            <div style={styles.playerContainer}>
                {!iframeLoaded && (
                    <div style={styles.loadingOverlay}>
                        <Loader2 size={32} color="var(--primary)" className="spin" />
                        <span style={styles.loadingText}>Loading video…</span>
                    </div>
                )}
                <iframe
                    src={embedUrl}
                    style={styles.iframe}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    onLoad={() => setIframeLoaded(true)}
                    title="Class Video Player"
                />
            </div>

            {/* ── Mark as Completed ── */}
            <div style={styles.controlRow}>
                {isCompleted ? (
                    <div style={styles.completedChip}>
                        <CheckCircle2 size={18} /> Lecture Completed ✓
                    </div>
                ) : (
                    <button
                        style={styles.completeBtn}
                        onClick={handleMarkComplete}
                        disabled={marking}
                    >
                        {marking ? (
                            <><Loader2 size={16} className="spin" /> Saving…</>
                        ) : (
                            <><CheckCircle2 size={16} /> Mark as Completed</>
                        )}
                    </button>
                )}
            </div>

            {/* ── Resume Modal ── */}
            {showResume && (
                <ResumeModal
                    timestamp={progress.timestamp}
                    onResume={() => setShowResume(false)}
                    onRestart={() => setShowResume(false)}
                    onClose={() => setShowResume(false)}
                />
            )}
        </div>
    );
}

/** @type {Record<string, import('react').CSSProperties>} */
const styles = {
    wrapper: {
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
    },
    playerContainer: {
        position: 'relative',
        width: '100%',
        paddingTop: '56.25%', // 16:9
        borderRadius: 'var(--radius-card)',
        overflow: 'hidden',
        background: '#000',
        boxShadow: 'var(--shadow-md)',
    },
    iframe: {
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        border: 'none',
    },
    loadingOverlay: {
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        background: 'rgba(0,0,0,0.85)',
        zIndex: 2,
    },
    loadingText: {
        color: '#999',
        fontSize: '0.82rem',
        fontWeight: 500,
    },
    controlRow: {
        display: 'flex',
        justifyContent: 'center',
    },
    completeBtn: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        padding: '10px 24px',
        borderRadius: 'var(--radius-full)',
        background: 'linear-gradient(135deg, var(--success), #34D399)',
        color: '#fff',
        fontSize: '0.88rem',
        fontWeight: 600,
        border: 'none',
        cursor: 'pointer',
        boxShadow: '0 2px 10px rgba(16,185,129,0.3)',
        transition: 'transform var(--transition-fast)',
    },
    completedChip: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        padding: '10px 24px',
        borderRadius: 'var(--radius-full)',
        background: 'var(--success-muted)',
        color: 'var(--success)',
        fontSize: '0.88rem',
        fontWeight: 700,
    },
};
