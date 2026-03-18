/**
 * @fileoverview ExamPortal — the time-locked exam layout with Question Paper & OMR sheet.
 *
 * Route: /exam/:examId
 * Handles 'upcoming', 'ready', 'live', 'missed', and 'completed' states securely via useExam.
 */

import { useMemo, useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useDataContext } from '@context/DataContext';
import { useExam } from '@hooks/useExam';
import { formatCountdown } from '@utils/timeHelpers';
import OmrSheet from '@molecules/OmrSheet';
import { Clock, ShieldAlert, CheckCircle2, ArrowLeft, ShieldCheck, AlertTriangle } from 'lucide-react';

export default function ExamPortal() {
    const { examId } = useParams();
    const { schedule } = useDataContext();
    const navigate = useNavigate();

    // The Dashboard passes the exam data via state to avoid complex inner-schedule lookups here.
    const { state } = useLocation();
    const examData = state?.examData;

    // Use dummy values if visited directly without state, though protecting it is better in reality.
    const unlockTime = examData?.unlockTime || '19:00';
    const durationMins = examData?.duration || 75; // 1 hr 15 mins default
    const testData = examData?.testData || {};
    const TOTAL_QUESTIONS = testData.totalQuestions || 30;
    const basePath = testData.basePath || '';
    const answerKeyPath = testData.answerKeyPath || '';

    const [isSubmitting, setIsSubmitting] = useState(false);

    const {
        status,
        secondsLeft,
        answers,
        setAnswer,
        clearAnswer,
        submitExam,
        isSubmitted
    } = useExam(examId, unlockTime, durationMins);

    // Auto-submission effect & Strict Scoring
    useEffect(() => {
        if (isSubmitted && status === 'completed' && !isSubmitting) {
            setIsSubmitting(true);
            const calculateScore = async () => {
                let correctCount = 0;
                let wrongCount = 0;
                let skippedCount = 0;

                try {
                    if (answerKeyPath) {
                        const response = await fetch(answerKeyPath);
                        if (response.ok) {
                            const answerKey = await response.json();
                            
                            // Iterate over all possible questions
                            for (let i = 1; i <= TOTAL_QUESTIONS; i++) {
                                const qKey = `Q${i}`;
                                const userAnswer = answers[i];
                                const correctAnswerRecord = answerKey.find(item => item.q === qKey);
                                const correctAnswer = correctAnswerRecord ? correctAnswerRecord.answer : null;

                                if (!userAnswer) {
                                    skippedCount++;
                                } else if (userAnswer === correctAnswer) {
                                    correctCount++;
                                } else {
                                    wrongCount++;
                                }
                            }
                        }
                    }
                } catch (error) {
                    console.error("Failed to fetch answer key for scoring:", error);
                } finally {
                    const finalScore = correctCount;
                    const maxScore = TOTAL_QUESTIONS;
                    navigate('/exam-success', { 
                        replace: true, 
                        state: { 
                            answers, 
                            score: finalScore, 
                            maxScore,
                            correctCount,
                            wrongCount,
                            skippedCount,
                            examId 
                        } 
                    });
                }
            };

            calculateScore();
        }
    }, [isSubmitted, status, navigate, answers, answerKeyPath, TOTAL_QUESTIONS, isSubmitting, examId]);

    // Disable Right Click intentionally
    useEffect(() => {
        const handleContextMenu = (e) => e.preventDefault();
        document.addEventListener('contextmenu', handleContextMenu);
        return () => document.removeEventListener('contextmenu', handleContextMenu);
    }, []);

    // ── Pre-Exam / Post-Exam Full Screen Blocking ──
    const isLive = status === 'live';

    if (status === 'upcoming' || status === 'ready') {
        const bgColors = status === 'ready' ? 'var(--primary-muted)' : 'var(--bg-app)';
        const textColors = status === 'ready' ? 'var(--primary)' : 'var(--text-main)';
        return (
            <div style={{ ...styles.blocker, background: bgColors }}>
                {status === 'ready' ? <Clock size={48} color="var(--primary)" /> : <ShieldAlert size={48} color="var(--text-muted)" />}
                <h2 style={{ ...styles.blockerTitle, color: textColors }}>
                    {status === 'ready' ? 'Exam Hall Opening Soon' : 'Exam Not Started'}
                </h2>
                <p style={styles.blockerText}>
                    Starts sharply at {unlockTime}.<br />
                    Time Remaining: <strong>{formatCountdown(secondsLeft)}</strong>
                </p>
                <button style={styles.backBtn} onClick={() => navigate('/dashboard')}>
                    <ArrowLeft size={16} /> Return to Dashboard
                </button>
            </div>
        );
    }

    if (status === 'missed') {
        return (
            <div style={{ ...styles.blocker, background: 'var(--error-muted)' }}>
                <AlertTriangle size={48} color="var(--error)" />
                <h2 style={{ ...styles.blockerTitle, color: 'var(--error)' }}>Exam Missed</h2>
                <p style={styles.blockerText}>The window for this exam has permanently closed.</p>
                <button style={styles.backBtn} onClick={() => navigate('/dashboard')}>
                    <ArrowLeft size={16} /> Return to Dashboard
                </button>
            </div>
        );
    }

    // ── Live Exam UI ──
    return (
        <div style={styles.page}>
            {/* Top Navigation Bar */}
            <header style={styles.header}>
                <div style={styles.headerTitle}>
                    <ShieldCheck size={20} color="var(--primary)" />
                    <h2 style={styles.headerTitleText}>{examData?.title}</h2>
                </div>

                <div style={styles.timerCluster}>
                    <div style={{ ...styles.timer, color: secondsLeft < 600 ? 'var(--error)' : 'var(--text-main)' }}>
                        <Clock size={16} />
                        <span>{formatCountdown(secondsLeft)}</span>
                    </div>
                    <button style={styles.submitBtn} onClick={submitExam} disabled={isSubmitting}>
                        <CheckCircle2 size={16} /> {isSubmitting ? 'Submitting...' : 'Finish Exam'}
                    </button>
                </div>
            </header>

            {/* Split Layout */}
            <main style={styles.main}>
                {/* Left: Question Paper Renderer */}
                <section style={styles.paperSection}>
                    <div style={styles.questionList}>
                        {basePath ? (
                            Array.from({ length: TOTAL_QUESTIONS }, (_, i) => (
                                <div key={i} style={styles.questionImageWrapper}>
                                    <div style={styles.questionOverlayLabel}>Q{i + 1}</div>
                                    <img 
                                        src={`${basePath}/Q${i + 1}.png`} 
                                        alt={`Question ${i + 1}`} 
                                        style={styles.questionImage} 
                                        loading="lazy"
                                    />
                                </div>
                            ))
                        ) : (
                           <div style={styles.paperPlaceholder}>
                               <div style={styles.overlayText}>
                                   <h2 style={styles.overlayHeading}>EXAM STARTED</h2>
                                   <p style={styles.overlaySub}>Best of Luck</p>
                               </div>
                               <p style={styles.paperInstructions}>
                                   Question Paper Module is missing data.<br />
                                   Please contact support.
                               </p>
                           </div>
                        )}
                    </div>
                </section>

                {/* Right: OMR Sheet */}
                <aside style={styles.omrSection}>
                    <OmrSheet
                        totalQuestions={TOTAL_QUESTIONS}
                        answers={answers}
                        onSelect={setAnswer}
                        onClear={clearAnswer}
                        disabled={!isLive}
                    />
                </aside>
            </main>
        </div>
    );
}

/** @type {Record<string, import('react').CSSProperties>} */
const styles = {
    // Blocking Screens
    blocker: {
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: 20,
        gap: 16,
    },
    blockerTitle: {
        fontSize: '1.5rem',
        fontWeight: 800,
    },
    blockerText: {
        fontSize: '1rem',
        color: 'var(--text-muted)',
        lineHeight: 1.5,
    },
    backBtn: {
        marginTop: 12,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        padding: '10px 20px',
        borderRadius: 'var(--radius-full)',
        background: 'var(--bg-card)',
        color: 'var(--text-main)',
        border: '1px solid var(--border)',
        fontWeight: 600,
        cursor: 'pointer',
    },

    // Layout
    page: {
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--bg-app)',
    },
    header: {
        height: 64,
        background: 'var(--bg-card)',
        borderBottom: '1px solid var(--border-light)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        flexShrink: 0,
    },
    headerTitle: {
        display: 'flex',
        alignItems: 'center',
        gap: 10,
    },
    headerTitleText: {
        fontSize: '1rem',
        fontWeight: 700,
        color: 'var(--text-main)',
    },
    timerCluster: {
        display: 'flex',
        alignItems: 'center',
        gap: 16,
    },
    timer: {
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        fontSize: '1.05rem',
        fontWeight: 800,
        fontVariantNumeric: 'tabular-nums',
        background: 'var(--bg-app)',
        padding: '6px 14px',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border-light)',
    },
    submitBtn: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 20px',
        background: 'var(--error)',
        color: '#fff',
        border: 'none',
        borderRadius: 'var(--radius-full)',
        fontWeight: 600,
        fontSize: '0.9rem',
        cursor: 'pointer',
        boxShadow: '0 2px 8px rgba(239, 68, 68, 0.4)',
    },

    main: {
        flex: 1,
        display: 'flex',
        overflow: 'hidden', // children scroll independently
    },
    paperSection: {
        flex: 7, // 70%
        padding: 24,
        background: 'var(--bg-app)',
        overflowY: 'auto',
    },
    paperPlaceholder: {
        minHeight: '100%',
        background: '#fff',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-sm)',
        border: '1px solid var(--border-light)',
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: 40,
    },
    overlayText: {
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        opacity: 0.1,
        pointerEvents: 'none',
    },
    overlayHeading: {
        fontSize: '4rem',
        textTransform: 'uppercase',
    },
    overlaySub: {
        fontSize: '1.5rem',
        marginTop: 10,
        letterSpacing: '2px',
    },
    paperInstructions: {
        color: 'var(--text-muted)',
        fontSize: '1.1rem',
        lineHeight: 1.6,
        maxWidth: 400,
    },

    omrSection: {
        flex: 3, // 30%
        padding: '24px 24px 24px 0',
    },
    questionList: {
        display: 'flex',
        flexDirection: 'column',
        gap: 32,
        paddingBottom: 64, // spacer at bottom
        maxWidth: 900,
        margin: '0 auto',
    },
    questionImageWrapper: {
        background: '#fff',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-sm)',
        border: '1px solid var(--border-light)',
        overflow: 'hidden',
        position: 'relative',
        padding: 24,
    },
    questionOverlayLabel: {
        position: 'absolute',
        top: 0,
        left: 0,
        background: 'var(--primary)',
        color: '#fff',
        padding: '4px 12px',
        borderBottomRightRadius: 'var(--radius-lg)',
        fontWeight: 700,
        fontSize: '0.9rem',
        zIndex: 10,
    },
    questionImage: {
        width: '100%',
        height: 'auto',
        display: 'block',
        userSelect: 'none',
        pointerEvents: 'none', // helps prevent drag-to-save
    }
};
