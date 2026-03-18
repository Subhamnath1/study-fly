/**
 * @fileoverview DppPortal — Max Level Upgrade
 * Includes Auto-save, Keyboard Nav, Time-per-question, Fullscreen, and Bookmarks.
 * Route: /dpp/:dppId
 */

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowLeft, Bookmark, ChevronLeft, ChevronRight,
    Maximize, Minimize, Pause, Play, AlertTriangle, Lightbulb, CheckCircle2, Loader2
} from 'lucide-react';
import dppsData from '@data/dpps.json';
import { schedulePush } from '@services/cloudSync';
import { streamMistralVision } from '@services/mistralService';
import AiSlidePanel from '@organisms/AiSlidePanel';

// Constants
const MARKS_CORRECT = 4;
const MARKS_INCORRECT = -1;
const OPTIONS = ['A', 'B', 'C', 'D'];

export default function DppPortal() {
    const { dppId } = useParams();
    const navigate = useNavigate();

    const dpp = dppsData[dppId];

    // --- INITIALIZE FROM LOCAL STORAGE ---
    const loadSavedState = () => {
        try {
            const saved = localStorage.getItem(`dpp_save_${dppId}`);
            if (saved) return JSON.parse(saved);
        } catch (e) {
            console.error("Failed to parse saved DPP state", e);
        }
        return null;
    };

    const savedState = loadSavedState();

    // Core State
    const [currentIndex, setCurrentIndex] = useState(0);
    const [answers, setAnswers] = useState(savedState?.answers || {});
    const [bookmarks, setBookmarks] = useState(savedState?.bookmarks || []);
    const [timeElapsed, setTimeElapsed] = useState(savedState?.timeElapsed || 0);
    const [timePerQuestion, setTimePerQuestion] = useState(savedState?.timePerQuestion || {});

    // UI State
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [showSubmitWarning, setShowSubmitWarning] = useState(false);

    // AI State
    const [aiPanelOpen, setAiPanelOpen] = useState(false);
    const [aiMode, setAiMode] = useState(null); // 'hint' | 'solution'
    const [aiContent, setAiContent] = useState('');
    const [aiLoading, setAiLoading] = useState(false);
    const [aiError, setAiError] = useState(null);
    const [revealedAnswers, setRevealedAnswers] = useState(new Set(savedState?.revealedAnswers || []));

    // Refs for debouncing input
    const inputTimeoutRef = useRef(null);

    // Context Menu Protection
    useEffect(() => {
        const handleContextMenu = (e) => e.preventDefault();
        document.addEventListener('contextmenu', handleContextMenu);
        return () => document.removeEventListener('contextmenu', handleContextMenu);
    }, []);

    const totalQuestions = dpp?.questions?.length || 0;
    const currentQ = dpp?.questions?.[currentIndex];

    // Save to LocalStorage Effect
    useEffect(() => {
        if (!isSubmitted && currentQ) {
            localStorage.setItem(`dpp_save_${dppId}`, JSON.stringify({
                answers, bookmarks, timeElapsed, timePerQuestion, revealedAnswers: Array.from(revealedAnswers)
            }));
        }
    }, [answers, bookmarks, timeElapsed, timePerQuestion, revealedAnswers, dppId, isSubmitted, currentQ]);

    // Timer Logic
    useEffect(() => {
        if (isSubmitted || isPaused || !currentQ) return;

        const timer = setInterval(() => {
            setTimeElapsed(prev => prev + 1);
            setTimePerQuestion(prev => ({
                ...prev,
                [currentQ.q]: (prev[currentQ.q] || 0) + 1
            }));
        }, 1000);

        return () => clearInterval(timer);
    }, [isSubmitted, isPaused, currentQ]);

    // Format timer hh:mm:ss
    const formatTimer = (secs) => {
        const h = Math.floor(secs / 3600);
        const m = Math.floor((secs % 3600) / 60);
        const s = secs % 60;
        return `${h > 0 ? h.toString().padStart(2, '0') + ':' : ''}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    // Navigation Handlers
    const handleNext = useCallback(() => {
        if (currentIndex < totalQuestions - 1) {
            setCurrentIndex(prev => prev + 1);
            setAiPanelOpen(false); // Close AI panel on next
            setAiContent('');
        }
    }, [currentIndex, totalQuestions]);

    const handlePrev = useCallback(() => {
        if (currentIndex > 0) {
            setCurrentIndex(prev => prev - 1);
            setAiPanelOpen(false); // Close AI panel on prev
            setAiContent('');
        }
    }, [currentIndex]);

    // Keyboard Navigation
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (isSubmitted || isPaused || !currentQ) return;
            // Don't capture keys if user is typing in the integer input
            if (e.target.tagName.toLowerCase() === 'input') return;

            switch (e.key) {
                case 'ArrowRight': handleNext(); break;
                case 'ArrowLeft': handlePrev(); break;
                case 'a': case 'A': handleSelectOption('A'); break;
                case 'b': case 'B': handleSelectOption('B'); break;
                case 'c': case 'C': handleSelectOption('C'); break;
                case 'd': case 'D': handleSelectOption('D'); break;
                default: break;
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isSubmitted, isPaused, currentQ, handleNext, handlePrev]);

    // Fullscreen Toggle
    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => console.error(err));
            setIsFullscreen(true);
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
                setIsFullscreen(false);
            }
        }
    };

    // Listen to ESC key exiting fullscreen natively
    useEffect(() => {
        const onFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', onFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
    }, []);

    // Warn on refresh/close
    useEffect(() => {
        const handleBeforeUnload = (e) => {
            if (!isSubmitted) {
                e.preventDefault();
                e.returnValue = ''; // Needed for Chrome
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [isSubmitted]);


    if (!dpp) {
        return (
            <div style={styles.blocker}>
                <h2 style={styles.blockerTitle}>DPP Not Found</h2>
                <button style={styles.backBtnWrapper} onClick={() => navigate(-1)}>
                    <ArrowLeft size={16} /> Go Back
                </button>
            </div>
        );
    }

    // Handlers
    const handleSelectOption = (opt) => {
        if (isSubmitted || isPaused) return;
        setAnswers(prev => ({ ...prev, [currentQ.q]: opt }));
    };

    const handleIntegerInput = (e) => {
        if (isSubmitted || isPaused) return;
        const val = e.target.value;
        setAnswers(prev => ({ ...prev, [currentQ.q]: val }));
    };

    const clearAnswer = () => {
        if (isSubmitted || isPaused) return;
        setAnswers(prev => {
            const next = { ...prev };
            delete next[currentQ.q];
            return next;
        });
    };

    const toggleBookmark = () => {
        setBookmarks(prev =>
            prev.includes(currentQ.q) ? prev.filter(q => q !== currentQ.q) : [...prev, currentQ.q]
        );
    };

    // AI Handlers
    const handleAiRequest = async (mode) => {
        if (isSubmitted || isPaused) return;

        setAiMode(mode);
        setAiPanelOpen(true);
        setAiContent('');
        setAiError(null);
        setAiLoading(true);

        if (mode === 'solution') {
            setRevealedAnswers(prev => new Set([...prev, currentQ.q]));
        }

        const prompt = mode === 'hint'
            ? "Look at this question image from a Class 12 exam. Give a helpful HINT to guide the student — do NOT reveal the answer. Mention relevant formulas, concepts, or the approach to use."
            : "Look at this question image from a Class 12 exam. Solve it step-by-step using the easiest and shortest method. Show all work clearly with LaTeX for formulas. State the final answer clearly.";

        try {
            // Must provide full URL to fetchImageAsBase64 later
            const fullImageUrl = window.location.origin + currentQ.image;
            const stream = streamMistralVision(fullImageUrl, prompt);

            let fullText = '';
            for await (const chunk of stream) {
                fullText += chunk;
                setAiContent(fullText);
            }
        } catch (err) {
            console.error('[AI] request failed:', err);
            setAiError(err.message || 'Failed to generate AI response. Please try again.');
        } finally {
            setAiLoading(false);
        }
    };

    // Derived Status for Sidebar
    const statusCounts = useMemo(() => {
        let answered = 0;
        dpp.questions.forEach((q) => {
            const userAns = answers[q.q];
            if (userAns !== undefined && userAns !== '') {
                answered++;
            }
        });
        return { answered, notAnswered: totalQuestions - answered };
    }, [answers, dpp.questions, totalQuestions]);

    const getSidebarBtnStyle = (qNum) => {
        const userAns = answers[qNum];
        const isActive = currentQ.q === qNum;
        const isBookmarked = bookmarks.includes(qNum);

        let baseStyle = { ...styles.gridBtn };

        if (userAns !== undefined && userAns !== '') {
            baseStyle = { ...baseStyle, ...styles.gridBtnAnswered };
        } else {
            baseStyle = { ...baseStyle, ...styles.gridBtnUnanswered };
        }

        if (isActive) baseStyle = { ...baseStyle, ...styles.gridBtnActive };
        // Apply a purple bottom border if bookmarked
        if (isBookmarked) baseStyle = { ...baseStyle, borderBottom: '4px solid #A855F7' };

        return baseStyle;
    };

    const triggerSubmitCheck = () => {
        if (statusCounts.notAnswered > 0) {
            setShowSubmitWarning(true);
        } else {
            processFinalSubmit();
        }
    };

    const processFinalSubmit = useCallback(() => {
        setIsSubmitted(true);
        // Clear saved session
        localStorage.removeItem(`dpp_save_${dppId}`);
        // Mark DPP as completed for Dashboard tracking
        localStorage.setItem(`dpp_completed_${dppId}`, 'true');
        // Sync to cloud
        schedulePush();

        let correct = 0, incorrect = 0, skipped = 0, score = 0;

        dpp.questions.forEach(q => {
            const userAns = answers[q.q];
            if (userAns === undefined || userAns === '') {
                skipped++;
            } else if (q.type === 'integer') {
                // Self-assessed integer questions — no marks, but counts for completion
                if (userAns === 'SOLVED') {
                    correct++;
                } else {
                    incorrect++;
                }
            } else {
                if (q.answer) {
                    if (userAns.toString() === q.answer.toString()) {
                        correct++; score += MARKS_CORRECT;
                    } else {
                        incorrect++; score += MARKS_INCORRECT;
                    }
                } else {
                    skipped++;
                }
            }
        });

        const totalMarks = totalQuestions * MARKS_CORRECT;
        const accuracy = correct + incorrect > 0 ? Math.round((correct / (correct + incorrect)) * 100) : 0;
        const completedPct = Math.round(((totalQuestions - skipped) / totalQuestions) * 100);

        const resultData = {
            dppId, dppTitle: dpp.title, totalQuestions, totalMarks,
            score, correct, incorrect, skipped, accuracy, completedPct,
            timeElapsed, timePerQuestion, userAnswers: answers
        };

        navigate('/dpp-result', { state: { resultData }, replace: true });
    }, [answers, dpp, dppId, navigate, timeElapsed, timePerQuestion, totalQuestions]);

    const OPTIONS = ['A', 'B', 'C', 'D'];

    return (
        <div style={styles.page}>
            {/* Top Toolbar */}
            <header style={styles.header}>
                <button style={styles.backBtn} onClick={() => navigate(-1)}>
                    <ChevronLeft size={16} /> Exit
                </button>

                <div style={styles.headerControls}>
                    <button style={styles.iconBtn} onClick={toggleFullscreen} title="Toggle Fullscreen">
                        {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
                    </button>
                    <button style={styles.iconBtn} onClick={() => setIsPaused(!isPaused)} title={isPaused ? "Resume" : "Pause"}>
                        {isPaused ? <Play size={18} color="#10B981" /> : <Pause size={18} />}
                    </button>
                    <div style={styles.timerBox}>
                        <span className={timeElapsed > 3600 ? "timer-overtime" : ""} style={{ color: timeElapsed > 3600 ? '#EF4444' : '#1E293B' }}>
                            {formatTimer(timeElapsed)}
                        </span>
                    </div>
                </div>

                <button style={styles.submitBtn} onClick={triggerSubmitCheck}>
                    Submit DPP
                </button>
            </header>

            <main style={styles.mainArea}>
                {/* Left Area: Main Question Content */}
                <div style={styles.contentArea}>

                    {/* Pause Overlay Blur */}
                    {isPaused && (
                        <div style={styles.pauseOverlay}>
                            <h2 style={{ fontSize: '2rem', color: '#1E293B' }}>Paused</h2>
                            <p style={{ color: '#64748B' }}>Click play above to resume.</p>
                        </div>
                    )}

                    {/* Question Header */}
                    <div style={styles.qHeader}>
                        <div style={styles.qHeaderLeft}>
                            <div style={styles.qNumBadge}>Q{currentQ.q}</div>
                            <span style={styles.timePerQBadge}>
                                ⏱ {formatTimer(timePerQuestion[currentQ.q] || 0)}
                            </span>
                        </div>

                        <div style={styles.qHeaderIcons}>
                            <button
                                style={{
                                    ...styles.iconBtn,
                                    color: bookmarks.includes(currentQ.q) ? '#A855F7' : '#64748B'
                                }}
                                onClick={toggleBookmark}
                                title="Mark for Review"
                            >
                                <Bookmark size={20} fill={bookmarks.includes(currentQ.q) ? '#A855F7' : 'none'} />
                            </button>
                        </div>
                    </div>

                    {/* Image Area */}
                    <div style={styles.imageContainer}>
                        <img
                            key={`img-${currentIndex}`} // Forces re-render for animation
                            src={currentQ.image}
                            alt={`Question ${currentQ.q}`}
                            style={styles.qImage}
                            className="dpp-q-animate"
                        />

                        {/* Hidden Preload Anchors */}
                        {currentIndex < totalQuestions - 1 && (
                            <img src={dpp.questions[currentIndex + 1].image} style={{ display: 'none' }} alt="" />
                        )}
                        {currentIndex > 0 && (
                            <img src={dpp.questions[currentIndex - 1].image} style={{ display: 'none' }} alt="" />
                        )}
                    </div>

                    {/* AI Buttons Row */}
                    {!isSubmitted && currentQ.type === 'mcq' && (
                        <div style={styles.aiBtnRow}>
                            <button
                                style={styles.aiHintBtn}
                                onClick={() => handleAiRequest('hint')}
                                disabled={aiLoading && aiMode === 'hint'}
                            >
                                {aiLoading && aiMode === 'hint' ? <Loader2 size={16} className="spin" /> : <Lightbulb size={16} />}
                                Get Hint
                            </button>
                            <button
                                style={styles.aiSolutionBtn}
                                onClick={() => handleAiRequest('solution')}
                                disabled={aiLoading && aiMode === 'solution'}
                            >
                                {aiLoading && aiMode === 'solution' ? <Loader2 size={16} className="spin" /> : <CheckCircle2 size={16} />}
                                View Solution
                            </button>
                        </div>
                    )}

                    {/* Options Area */}
                    <div style={styles.optionsContainer}>
                        {currentQ.type === 'mcq' ? (
                            <div style={styles.radioGroup}>
                                {OPTIONS.map((opt) => {
                                    const isSelected = answers[currentQ.q] === opt;
                                    const isRevealedAnswer = revealedAnswers.has(currentQ.q) && currentQ.answer === opt;

                                    return (
                                        <button
                                            key={opt}
                                            className="radio-option-hover"
                                            style={{
                                                ...styles.radioOption,
                                                ...(isSelected ? styles.radioOptionSelected : {}),
                                                ...(isRevealedAnswer ? styles.radioOptionRevealed : {})
                                            }}
                                            onClick={() => handleSelectOption(opt)}
                                            disabled={revealedAnswers.has(currentQ.q) && isSelected} // Prevent toggling off if they clicked solution while having it selected
                                        >
                                            <div style={{
                                                ...styles.radioCircle,
                                                ...(isSelected ? styles.radioCircleSelected : {}),
                                                ...(isRevealedAnswer ? styles.radioCircleRevealed : {})
                                            }} />
                                            <span style={{
                                                ...styles.radioLabel,
                                                ...(isRevealedAnswer ? { color: '#065F46' } : {})
                                            }}>{opt}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        ) : (
                            <div style={styles.integerGroup}>
                                <p style={styles.integerLabel}>
                                    This is a self-practice question. Write your solution on paper, then mark below:
                                </p>
                                <div style={styles.integerOptions}>
                                    <button
                                        className="radio-option-hover"
                                        style={answers[currentQ.q] === 'SOLVED' ? styles.intOptionSolved : styles.intOption}
                                        onClick={() => handleSelectOption('SOLVED')}
                                    >
                                        <span style={{ fontSize: '1.1rem' }}>✅</span>
                                        <span>I solved this question</span>
                                    </button>
                                    <button
                                        className="radio-option-hover"
                                        style={answers[currentQ.q] === 'UNSOLVED' ? styles.intOptionUnsolved : styles.intOption}
                                        onClick={() => handleSelectOption('UNSOLVED')}
                                    >
                                        <span style={{ fontSize: '1.1rem' }}>❌</span>
                                        <span>I couldn't solve this</span>
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Bottom Action Bar */}
                    <div style={styles.bottomBar}>
                        <button
                            style={styles.clearBtn}
                            onClick={clearAnswer}
                            disabled={!answers[currentQ.q]}
                        >
                            Clear Answer
                        </button>

                        <div style={{ display: 'flex', gap: 12 }}>
                            <button
                                style={{ ...styles.navBtn, display: currentIndex === 0 ? 'none' : 'flex' }}
                                onClick={handlePrev}
                            >
                                <ChevronLeft size={16} /> Prev
                            </button>

                            {currentIndex < totalQuestions - 1 ? (
                                <button style={styles.navBtnPrimary} onClick={handleNext}>
                                    Next <ChevronRight size={16} />
                                </button>
                            ) : (
                                <button style={styles.nextBtnSubmit} onClick={triggerSubmitCheck}>
                                    Submit
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Area: Sidebar Grid */}
                <aside style={styles.sidebar}>
                    {/* Status Legend */}
                    <div style={styles.legendBox}>
                        <div style={styles.legendRow}>
                            <span style={styles.legendItem}>
                                <div style={{ ...styles.legendColorBox, backgroundColor: '#6366F1' }}>{statusCounts.answered}</div>
                                <span style={styles.legendText}>Answered</span>
                            </span>
                            <span style={styles.legendItem}>
                                <div style={{ ...styles.legendColorBox, backgroundColor: '#94A3B8' }}>{statusCounts.notAnswered}</div>
                                <span style={styles.legendText}>Unanswered</span>
                            </span>
                        </div>
                        <div style={{ ...styles.legendRow, marginTop: 8 }}>
                            <span style={styles.legendItem}>
                                {/* Using 0 just as visual guide for bookmark */}
                                <div style={{ ...styles.legendColorBox, backgroundColor: '#fff', color: '#1E', border: '1px solid #CBD5E1', borderBottom: '3px solid #A855F7' }}>★</div>
                                <span style={styles.legendText}>Review</span>
                            </span>
                        </div>
                    </div>

                    {/* Question Grid */}
                    <div style={styles.gridContainer}>
                        {dpp.questions.map((q, idx) => (
                            <button
                                key={q.q}
                                onClick={() => {
                                    setCurrentIndex(idx);
                                    setAiPanelOpen(false);
                                }}
                                style={getSidebarBtnStyle(q.q)}
                            >
                                {q.q}
                            </button>
                        ))}
                    </div>
                </aside>
            </main>

            <AiSlidePanel
                isOpen={aiPanelOpen}
                onClose={() => setAiPanelOpen(false)}
                mode={aiMode}
                content={aiContent}
                isLoading={aiLoading}
                error={aiError}
            />

            {/* Warning Dialog Modal */}
            {showSubmitWarning && (
                <div style={styles.modalBackdrop}>
                    <div style={styles.modalCard}>
                        <div style={styles.modalIconBox}>
                            <AlertTriangle size={32} color="#F59E0B" />
                        </div>
                        <h3 style={styles.modalTitle}>Unanswered Questions!</h3>
                        <p style={styles.modalDesc}>
                            You still have <strong>{statusCounts.notAnswered}</strong> unanswered questions. Are you sure you want to submit?
                        </p>
                        <div style={styles.modalActions}>
                            <button style={styles.modalBtnCancel} onClick={() => setShowSubmitWarning(false)}>
                                Keep Trying
                            </button>
                            <button style={styles.modalBtnConfirm} onClick={processFinalSubmit}>
                                Submit Anyway
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

const styles = {
    blocker: { height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#F8FAFC' },
    blockerTitle: { fontSize: '1.5rem', fontWeight: 800, color: '#1E293B' },
    backBtnWrapper: { marginTop: 16, display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 20px', borderRadius: 24, border: '1px solid #E2E8F0', cursor: 'pointer', background: '#fff' },

    page: { display: 'flex', flexDirection: 'column', height: '100vh', background: '#F8FAFC' },

    // Header
    header: {
        height: 60, background: '#fff', borderBottom: '1px solid #E2E8F0',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 24px', flexShrink: 0
    },
    backBtn: {
        background: 'none', border: 'none', fontSize: '0.9rem', fontWeight: 700,
        color: '#64748B', display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer',
        transition: 'color 0.2s'
    },
    headerControls: {
        display: 'flex', alignItems: 'center', gap: 16
    },
    timerBox: {
        fontSize: '1.1rem', fontWeight: 700, background: '#F1F5F9', padding: '4px 12px',
        borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', width: 90
    },
    iconBtn: {
        background: '#F1F5F9', border: 'none', width: 32, height: 32, borderRadius: 8,
        display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
        color: '#475569', transition: 'background 0.2s'
    },
    submitBtn: {
        background: '#6366F1', border: 'none', color: '#fff',
        fontWeight: 600, fontSize: '0.9rem', padding: '8px 20px', borderRadius: 8,
        cursor: 'pointer', boxShadow: '0 2px 4px rgba(99, 102, 241, 0.2)'
    },

    // Main Layout
    mainArea: { flex: 1, display: 'flex', overflow: 'hidden' },

    // Content Area
    contentArea: {
        flex: 1, display: 'flex', flexDirection: 'column', position: 'relative',
        background: '#fff', margin: '16px 16px 16px 24px', borderRadius: 12,
        boxShadow: '0 4px 12px rgba(0,0,0,0.05)', overflow: 'hidden',
        border: '1px solid #E2E8F0',
    },
    pauseOverlay: {
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        backdropFilter: 'blur(10px)', background: 'rgba(255,255,255,0.8)',
        zIndex: 50, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
    },

    qHeader: {
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px',
        borderBottom: '1px solid #F1F5F9'
    },
    qHeaderLeft: { display: 'flex', alignItems: 'center', gap: 12 },
    qNumBadge: {
        background: '#1E293B', color: '#fff', fontWeight: 700, fontSize: '0.9rem',
        padding: '6px 12px', borderRadius: 6
    },
    timePerQBadge: {
        color: '#64748B', fontSize: '0.8rem', fontWeight: 600,
        background: '#F8FAFC', padding: '4px 10px', borderRadius: 16, border: '1px solid #E2E8F0'
    },
    qHeaderIcons: { display: 'flex', gap: 8 },

    imageContainer: {
        padding: '24px', overflowY: 'auto', flex: 1,
        display: 'flex', justifyContent: 'flex-start', alignItems: 'flex-start'
    },
    qImage: {
        maxWidth: '100%', objectFit: 'contain'
    },

    optionsContainer: {
        padding: '0 24px 24px',
    },
    radioGroup: { display: 'flex', flexDirection: 'column', gap: 12 },
    radioOption: {
        display: 'flex', alignItems: 'center', padding: '16px',
        border: '1px solid #E2E8F0', borderRadius: 8, background: '#fff',
        cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s ease'
    },
    radioOptionSelected: { borderColor: '#6366F1', background: '#EEECFF' },
    radioOptionRevealed: { borderColor: '#10B981', background: '#ECFDF5' }, // Green for correct solution
    radioCircle: {
        width: 20, height: 20, borderRadius: '50%', border: '2px solid #CBD5E1', marginRight: 16, transition: 'all 0.2s'
    },
    radioCircleSelected: {
        borderColor: '#6366F1', borderWidth: 6
    },
    radioCircleRevealed: {
        borderColor: '#10B981', background: '#10B981' // Solid green inner
    },
    radioLabel: { fontSize: '1rem', fontWeight: 600, color: '#1E293B', width: 24, textAlign: 'center' },

    // AI Buttons
    aiBtnRow: {
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16,
        padding: '0 24px 16px', borderBottom: '1px solid #F1F5F9', marginBottom: 16
    },
    aiHintBtn: {
        display: 'flex', alignItems: 'center', gap: 6,
        background: '#FFFBEB', color: '#D97706', border: '1px solid #FDE68A',
        padding: '8px 16px', borderRadius: 20, fontSize: '0.9rem', fontWeight: 600,
        cursor: 'pointer', transition: 'filter 0.2s'
    },
    aiSolutionBtn: {
        display: 'flex', alignItems: 'center', gap: 6,
        background: '#ECFDF5', color: '#059669', border: '1px solid #A7F3D0',
        padding: '8px 16px', borderRadius: 20, fontSize: '0.9rem', fontWeight: 600,
        cursor: 'pointer', transition: 'filter 0.2s'
    },

    integerGroup: { padding: '16px 0' },
    integerLabel: {
        fontSize: '0.95rem', fontWeight: 600, color: '#475569', marginBottom: 16, lineHeight: 1.5
    },
    integerOptions: {
        display: 'flex', flexDirection: 'column', gap: 12
    },
    intOption: {
        display: 'flex', alignItems: 'center', gap: 14, padding: '18px 20px',
        border: '2px solid #E2E8F0', borderRadius: 12, background: '#fff',
        cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s ease',
        fontSize: '0.95rem', fontWeight: 600, color: '#1E293B'
    },
    intOptionSolved: {
        display: 'flex', alignItems: 'center', gap: 14, padding: '18px 20px',
        border: '2px solid #10B981', borderRadius: 12, background: '#ECFDF5',
        cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s ease',
        fontSize: '0.95rem', fontWeight: 600, color: '#065F46'
    },
    intOptionUnsolved: {
        display: 'flex', alignItems: 'center', gap: 14, padding: '18px 20px',
        border: '2px solid #EF4444', borderRadius: 12, background: '#FEF2F2',
        cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s ease',
        fontSize: '0.95rem', fontWeight: 600, color: '#991B1B'
    },

    bottomBar: {
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px',
        borderTop: '1px solid #E2E8F0', background: '#F8FAFC'
    },
    clearBtn: {
        background: 'none', border: '1px solid #CBD5E1', color: '#64748B',
        fontWeight: 600, fontSize: '0.85rem', padding: '8px 16px', borderRadius: 6,
        cursor: 'pointer', opacity: 0.8
    },
    navBtn: {
        background: '#fff', border: '1px solid #CBD5E1', color: '#1E293B',
        fontWeight: 600, fontSize: '0.95rem', padding: '8px 20px', borderRadius: 6,
        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4
    },
    navBtnPrimary: {
        background: '#1E293B', border: 'none', color: '#fff',
        fontWeight: 600, fontSize: '0.95rem', padding: '8px 24px', borderRadius: 6,
        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4
    },
    nextBtnSubmit: {
        background: '#10B981', border: 'none', color: '#fff',
        fontWeight: 700, fontSize: '0.95rem', padding: '8px 32px', borderRadius: 6,
        cursor: 'pointer'
    },

    // Sidebar
    sidebar: {
        width: 320, background: '#F8FAFC', borderLeft: '1px solid #E2E8F0',
        padding: '16px 24px', display: 'flex', flexDirection: 'column'
    },
    legendBox: {
        background: '#fff', borderRadius: 8, padding: '12px 16px', marginBottom: 24,
        border: '1px solid #E2E8F0', boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
    },
    legendRow: { display: 'flex', justifyContent: 'space-between' },
    legendItem: { display: 'flex', alignItems: 'center', gap: 8, width: '48%' },
    legendColorBox: {
        width: 20, height: 16, borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#fff', fontSize: '0.65rem', fontWeight: 700
    },
    legendText: { fontSize: '0.75rem', color: '#475569', fontWeight: 600 },

    gridContainer: {
        display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8, overflowY: 'auto',
        paddingRight: 4 // for scrollbar
    },
    gridBtn: {
        width: '100%', aspectRatio: '1/1', border: '1px solid #CBD5E1', borderRadius: 6,
        background: '#fff', color: '#1E293B', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box',
        transition: 'transform 0.1s, background 0.2s'
    },
    gridBtnActive: { borderColor: '#1E293B', borderWidth: 2, transform: 'scale(1.05)', zIndex: 2 },
    gridBtnCorrect: { background: '#22C55E', color: '#fff', borderColor: '#22C55E' },
    gridBtnIncorrect: { background: '#EF4444', color: '#fff', borderColor: '#EF4444' },
    gridBtnAnswered: { background: '#6366F1', color: '#fff', borderColor: '#6366F1' },
    gridBtnUnanswered: { background: '#fff', color: '#64748B' },

    // Modal
    modalBackdrop: {
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(4px)',
        zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center'
    },
    modalCard: {
        background: '#fff', padding: '32px', borderRadius: 16, width: '90%', maxWidth: 400,
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
        textAlign: 'center'
    },
    modalIconBox: {
        width: 64, height: 64, background: '#FEF3C7', borderRadius: '50%',
        display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px'
    },
    modalTitle: { fontSize: '1.25rem', fontWeight: 800, color: '#1E293B', marginBottom: 8 },
    modalDesc: { fontSize: '0.95rem', color: '#475569', lineHeight: 1.5, marginBottom: 24 },
    modalActions: { display: 'flex', gap: 12 },
    modalBtnCancel: {
        flex: 1, padding: '10px', borderRadius: 8, border: '1px solid #CBD5E1',
        background: '#fff', color: '#475569', fontWeight: 600, cursor: 'pointer'
    },
    modalBtnConfirm: {
        flex: 1, padding: '10px', borderRadius: 8, border: 'none',
        background: '#10B981', color: '#fff', fontWeight: 600, cursor: 'pointer'
    }
};
