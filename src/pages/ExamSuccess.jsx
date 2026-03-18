/**
 * @fileoverview ExamSuccess — Submission confirmation screen.
 */

import { useLocation, useNavigate, Navigate } from 'react-router-dom';
import { CheckCircle, ArrowRight, BarChart3, MinusCircle, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';

// Confetti effect helper
function fireConfetti() {
    import('canvas-confetti').then((confetti) => {
        const fire = confetti.default;
        const duration = 3000;
        const animationEnd = Date.now() + duration;

        const interval = setInterval(() => {
            const timeLeft = animationEnd - Date.now();
            if (timeLeft <= 0) {
                return clearInterval(interval);
            }
            const particleCount = 50 * (timeLeft / duration);
            fire({ startVelocity: 30, spread: 360, ticks: 60, zIndex: 0, particleCount, origin: { x: Math.random(), y: Math.random() - 0.2 } });
        }, 250);
    }).catch(() => { });
}

export default function ExamSuccess() {
    const { state } = useLocation();
    const navigate = useNavigate();
    const [scoreRevealed, setScoreRevealed] = useState(false);

    useEffect(() => {
        if (state?.score !== undefined) {
            setTimeout(() => {
                setScoreRevealed(true);
                fireConfetti();
            }, 800);
        }
    }, [state]);

    if (!state) {
        return <Navigate to="/dashboard" replace />;
    }

    const { score, maxScore, correctCount, wrongCount, skippedCount, answers, examId } = state;
    const attempted = Object.keys(answers || {}).length;
    // Fallback if maxScore wasn't provided (e.g. from an older test layout)
    const baseMax = maxScore || Math.max(120, attempted * 4);

    return (
        <div style={styles.page}>
            <div style={styles.card}>
                <div style={styles.iconWrapper}>
                    <CheckCircle size={64} color="var(--success)" />
                </div>

                <h1 style={styles.title}>Exam Submitted Successfully!</h1>
                <p style={styles.subtitle}>
                    Your responses have been recorded and saved securely.
                </p>

                <div style={{ ...styles.statsBox, opacity: scoreRevealed ? 1 : 0, transform: `translateY(${scoreRevealed ? 0 : 20}px)` }}>
                    {/* Advanced Grading Breakdown */}
                    {correctCount !== undefined ? (
                        <div style={styles.gradingGrid}>
                            <div style={styles.gridItem}>
                                <CheckCircle size={20} color="var(--success)" />
                                <span style={styles.gridItemValue}>{correctCount}</span>
                                <span style={styles.gridItemLabel}>Correct</span>
                            </div>
                            <div style={styles.gridItem}>
                                <XCircle size={20} color="var(--error)" />
                                <span style={styles.gridItemValue}>{wrongCount}</span>
                                <span style={styles.gridItemLabel}>Wrong</span>
                            </div>
                            <div style={styles.gridItem}>
                                <MinusCircle size={20} color="var(--primary-muted)" />
                                <span style={styles.gridItemValue}>{skippedCount}</span>
                                <span style={styles.gridItemLabel}>Skipped</span>
                            </div>
                            <div style={styles.gridItemScore}>
                                <span style={styles.scoreHighlight}>{score}</span>
                                <span style={styles.scoreTotal}>/ {baseMax}</span>
                                <div style={styles.scoreLabel}>Final Score</div>
                            </div>
                        </div>
                    ) : (
                        /* Fallback Layout */
                        <>
                            <div style={styles.statItem}>
                                <span style={styles.statLabel}>Questions Attempted</span>
                                <span style={styles.statValue}>{attempted}</span>
                            </div>
                            <div style={styles.divider} />
                            <div style={styles.statItem}>
                                <span style={styles.statLabel}>Estimated Score</span>
                                <span style={{ ...styles.statValue, color: 'var(--primary)' }}>{score} / {baseMax}</span>
                            </div>
                        </>
                    )}
                </div>

                <div style={styles.btnRow}>
                    <button style={styles.btn} onClick={() => navigate(`/result/${state?.examId || 'unknown'}`)}>
                        <BarChart3 size={16} /> View Detailed Report
                    </button>
                    <button style={styles.btnOutline} onClick={() => navigate('/dashboard')}>
                        Return to Dashboard <ArrowRight size={16} />
                    </button>
                </div>
            </div>
        </div>
    );
}

/** @type {Record<string, import('react').CSSProperties>} */
const styles = {
    page: {
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-app)',
        padding: 20,
    },
    card: {
        background: 'var(--bg-card)',
        padding: '48px 40px',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-lg)',
        maxWidth: 480,
        width: '100%',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
    },
    iconWrapper: {
        width: 100,
        height: 100,
        borderRadius: '50%',
        background: 'var(--success-muted)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
    },
    title: {
        fontSize: '1.6rem',
        fontWeight: 800,
        color: 'var(--text-main)',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: '1.05rem',
        color: 'var(--text-muted)',
        marginBottom: 32,
    },
    statsBox: {
        width: '100%',
        background: 'var(--bg-app)',
        border: '1px solid var(--border-light)',
        borderRadius: 'var(--radius-md)',
        padding: 20,
        display: 'flex',
        justifyContent: 'space-around',
        marginBottom: 32,
        transition: 'all 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
    },
    statItem: {
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
    },
    statLabel: {
        fontSize: '0.8rem',
        fontWeight: 600,
        color: 'var(--text-muted)',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
    },
    statValue: {
        fontSize: '1.8rem',
        fontWeight: 800,
        color: 'var(--text-main)',
    },
    divider: {
        width: 1,
        background: 'var(--border-light)',
        margin: '0 16px',
    },
    gradingGrid: {
        width: '100%',
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 16,
    },
    gridItem: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '12px 8px',
        background: 'var(--bg-app)',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border-light)',
        gap: 4,
    },
    gridItemValue: {
        fontSize: '1.4rem',
        fontWeight: 700,
        color: 'var(--text-main)',
        marginTop: 4,
    },
    gridItemLabel: {
        fontSize: '0.75rem',
        fontWeight: 600,
        color: 'var(--text-muted)',
        textTransform: 'uppercase',
    },
    gridItemScore: {
        gridColumn: 'span 3',
        background: 'var(--bg-card)',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--primary-muted)',
        padding: 16,
        marginTop: 8,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
    },
    scoreHighlight: {
        fontSize: '2.5rem',
        fontWeight: 900,
        color: 'var(--primary)',
        lineHeight: 1,
    },
    scoreTotal: {
        fontSize: '1.2rem',
        fontWeight: 700,
        color: 'var(--text-muted)',
        marginTop: 4,
    },
    scoreLabel: {
        fontSize: '0.85rem',
        fontWeight: 700,
        color: 'var(--text-main)',
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        marginTop: 8,
    },
    btn: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        padding: '12px 32px',
        background: 'linear-gradient(135deg, var(--primary), #7C6BF0)',
        color: '#fff',
        border: 'none',
        borderRadius: 'var(--radius-full)',
        fontSize: '1rem',
        fontWeight: 600,
        cursor: 'pointer',
        boxShadow: '0 4px 12px rgba(90, 75, 218, 0.25)',
        transition: 'transform var(--transition-fast)',
    },
    btnOutline: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        padding: '12px 32px',
        background: 'var(--bg-card)',
        color: 'var(--text-main)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-full)',
        fontSize: '1rem',
        fontWeight: 600,
        cursor: 'pointer',
    },
    btnRow: {
        display: 'flex',
        gap: 12,
        flexWrap: 'wrap',
        justifyContent: 'center',
    },
};
