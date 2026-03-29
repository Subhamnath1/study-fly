/**
 * @fileoverview DrivePlayer — Google Drive Video Iframe wrapper with extension tracking.
 *
 * Since Drive iframes don't emit time events natively, we rely on:
 * - The Study Fly Chrome Extension to report real-time progress via postMessage
 * - A "Resume" popup if previous progress exists (> 60s)
 * - Auto-completion when 90%+ of the video is watched
 * - A manual "Mark as Completed" fallback button
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { CheckCircle2, Loader2, Wifi, WifiOff, Clock, Gauge } from 'lucide-react';
import ResumeModal from '@molecules/ResumeModal';

/**
 * @param {Object} props
 * @param {string}  props.videoId        - Google Drive file ID.
 * @param {import('@hooks/useProgress').VideoProgress | null} props.progress
 * @param {(videoId: string) => Promise<void>} props.onMarkComplete
 * @param {(videoId: string, timestamp: number, extra?: Object) => void} props.onSaveProgress
 * @param {boolean} [props.completed]    - Whether already marked done.
 * @returns {JSX.Element}
 */
export default function DrivePlayer({ videoId, progress, onMarkComplete, onSaveProgress, completed = false }) {
    const [showResume, setShowResume] = useState(false);
    const [isCompleted, setIsCompleted] = useState(completed);
    const [marking, setMarking] = useState(false);
    const [iframeLoaded, setIframeLoaded] = useState(false);

    // Extension tracking state
    const [extConnected, setExtConnected] = useState(false);
    const [liveProgress, setLiveProgress] = useState(null);
    const extTimerRef = useRef(null);
    const autoCompleteRef = useRef(false);

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

    // ── EXTENSION MESSAGE LISTENER ──
    useEffect(() => {
        function handleMessage(event) {
            const data = event.data;
            if (!data || typeof data !== 'object') return;

            // Extension announces it's ready
            if (data.type === 'STUDYFLY_EXT_READY') {
                resetExtTimer();
            }

            // Extension sends real-time progress
            if (data.type === 'STUDYFLY_PROGRESS' && data.videoId === videoId) {
                resetExtTimer();
                handleProgressUpdate(data);
            }
        }

        // CustomEvent listeners (more reliable for same-page communication)
        function handleExtReady() {
            resetExtTimer();
        }

        function handleProgressEvent(e) {
            const data = e.detail;
            if (data && data.videoId === videoId) {
                resetExtTimer();
                handleProgressUpdate(data);
            }
        }

        function resetExtTimer() {
            setExtConnected(true);
            if (extTimerRef.current) clearTimeout(extTimerRef.current);
            extTimerRef.current = setTimeout(() => setExtConnected(false), 15000);
        }

        function handleProgressUpdate(data) {
            setLiveProgress({
                currentTime: data.currentTime,
                duration: data.duration,
                speed: data.speed,
                percentWatched: data.percentWatched,
                paused: data.paused,
                activeWatchTime: data.activeWatchTime,
                bufferedPct: data.bufferedPct,
            });

            // Save progress to localStorage
            if (onSaveProgress && data.currentTime > 0) {
                onSaveProgress(videoId, data.currentTime, {
                    percentWatched: data.percentWatched,
                    speed: data.speed,
                    videoDuration: data.duration,
                });
            }

            // Auto-complete at 90%
            if (data.percentWatched >= 90 && !isCompleted && !autoCompleteRef.current) {
                autoCompleteRef.current = true;
                handleAutoComplete();
            }
        }

        window.addEventListener('message', handleMessage);
        window.addEventListener('studyfly-ext-ready', handleExtReady);
        window.addEventListener('studyfly-progress', handleProgressEvent);

        return () => {
            window.removeEventListener('message', handleMessage);
            window.removeEventListener('studyfly-ext-ready', handleExtReady);
            window.removeEventListener('studyfly-progress', handleProgressEvent);
            if (extTimerRef.current) clearTimeout(extTimerRef.current);
        };
    }, [videoId, isCompleted, onSaveProgress]);

    /** Handle resume — seek to saved position via extension */
    const handleResume = useCallback(() => {
        if (progress?.timestamp) {
            window.postMessage({
                type: 'STUDYFLY_SEEK',
                time: progress.timestamp,
            }, '*');
        }
        setShowResume(false);
    }, [progress]);

    /** Handle auto-completion at 90% */
    const handleAutoComplete = async () => {
        setMarking(true);
        setIsCompleted(true);
        try {
            await onMarkComplete(videoId);
        } catch (err) {
            console.error('[DrivePlayer] Auto-complete failed:', err);
            setIsCompleted(false);
            autoCompleteRef.current = false;
        } finally {
            setMarking(false);
        }
    };

    /** Handle manual mark as completed */
    const handleMarkComplete = async () => {
        setMarking(true);
        setIsCompleted(true);
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
            {/* ── Extension Status Indicator ── */}
            <div style={styles.extStatusRow}>
                <div style={{
                    ...styles.extBadge,
                    background: extConnected ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                    borderColor: extConnected ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.2)',
                }}>
                    {extConnected ? (
                        <Wifi size={13} color="#22C55E" />
                    ) : (
                        <WifiOff size={13} color="#EF4444" />
                    )}
                    <span style={{
                        color: extConnected ? '#22C55E' : '#EF4444',
                        fontSize: '0.72rem',
                        fontWeight: 600,
                    }}>
                        {extConnected ? 'Tracker Active' : 'Extension Not Detected'}
                    </span>
                </div>

                {/* Live speed badge */}
                {extConnected && liveProgress?.speed && liveProgress.speed !== 1 && (
                    <div style={styles.speedBadge}>
                        <Gauge size={12} />
                        {liveProgress.speed}x
                    </div>
                )}
            </div>

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

            {/* ── Live Progress Bar (from extension) ── */}
            {extConnected && liveProgress && liveProgress.duration > 0 && (
                <div style={styles.progressSection}>
                    <div style={styles.progressBarBg}>
                        {/* Buffered bar (behind) */}
                        {liveProgress.bufferedPct > 0 && (
                            <div
                                style={{
                                    ...styles.bufferedBarFill,
                                    width: `${liveProgress.bufferedPct}%`,
                                }}
                            />
                        )}
                        {/* Watched bar (front) */}
                        <div
                            style={{
                                ...styles.progressBarFill,
                                width: `${liveProgress.percentWatched || 0}%`,
                            }}
                        />
                    </div>
                    <div style={styles.progressMeta}>
                        <span style={styles.progressTime}>
                            <Clock size={12} />
                            {formatSecs(liveProgress.currentTime)} / {formatSecs(liveProgress.duration)}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            {liveProgress.paused && (
                                <span style={{
                                    fontSize: '0.65rem', fontWeight: 700, color: '#F59E0B',
                                    background: 'rgba(245,158,11,0.1)', padding: '2px 6px',
                                    borderRadius: 'var(--radius-full)',
                                }}>⏸ Paused</span>
                            )}
                            <span style={styles.progressPct}>
                                {liveProgress.percentWatched}%
                            </span>
                        </div>
                    </div>
                    {/* Keyboard hint */}
                    <div style={styles.shortcutHint}>
                        Space ▶️⏸ | ← → Seek 10s | [ ] Speed
                    </div>
                </div>
            )}

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
                    onResume={handleResume}
                    onRestart={() => setShowResume(false)}
                    onClose={() => setShowResume(false)}
                />
            )}
        </div>
    );
}

/** Format seconds to MM:SS or H:MM:SS */
function formatSecs(secs) {
    if (!secs || secs <= 0) return '0:00';
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    const mm = String(m).padStart(2, '0');
    const ss = String(s).padStart(2, '0');
    return h > 0 ? `${h}:${mm}:${ss}` : `${m}:${ss}`;
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

    /* Extension status */
    extStatusRow: {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        justifyContent: 'flex-end',
    },
    extBadge: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        padding: '4px 10px',
        borderRadius: 'var(--radius-full)',
        border: '1px solid',
        fontSize: '0.72rem',
        fontWeight: 600,
    },
    speedBadge: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '4px 10px',
        borderRadius: 'var(--radius-full)',
        background: 'rgba(245, 158, 11, 0.1)',
        border: '1px solid rgba(245, 158, 11, 0.3)',
        color: '#F59E0B',
        fontSize: '0.72rem',
        fontWeight: 700,
    },

    /* Progress bar */
    progressSection: {
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        padding: '0 4px',
    },
    progressBarBg: {
        height: 5,
        borderRadius: 3,
        background: 'var(--border-light)',
        overflow: 'hidden',
        position: 'relative',
    },
    bufferedBarFill: {
        position: 'absolute',
        top: 0,
        left: 0,
        height: '100%',
        borderRadius: 3,
        background: 'rgba(99, 102, 241, 0.15)',
        transition: 'width 1s ease',
    },
    progressBarFill: {
        position: 'absolute',
        top: 0,
        left: 0,
        height: '100%',
        borderRadius: 3,
        background: 'linear-gradient(90deg, var(--primary), #7C6BF0)',
        transition: 'width 1s ease',
        zIndex: 1,
    },
    shortcutHint: {
        fontSize: '0.62rem',
        fontWeight: 500,
        color: 'var(--text-muted)',
        textAlign: 'center',
        opacity: 0.6,
    },
    progressMeta: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    progressTime: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        fontSize: '0.72rem',
        fontWeight: 600,
        color: 'var(--text-muted)',
    },
    progressPct: {
        fontSize: '0.72rem',
        fontWeight: 700,
        color: 'var(--primary)',
    },

    /* Controls */
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
