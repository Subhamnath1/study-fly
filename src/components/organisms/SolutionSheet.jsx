/**
 * @fileoverview SolutionSheet — Detailed question-by-question review after exam.
 *
 * Displays:
 * - Color-coded question list (green/red/gray)
 * - User answer vs correct answer
 * - Status badge per question
 */

import { useState } from 'react';
import { CheckCircle2, XCircle, MinusCircle, Eye, EyeOff } from 'lucide-react';

const STATUS_CONFIG = {
    correct: { color: 'var(--success)', bg: 'var(--success-muted)', icon: CheckCircle2, label: 'Correct' },
    wrong: { color: 'var(--error)', bg: 'var(--error-muted)', icon: XCircle, label: 'Wrong' },
    unattempted: { color: 'var(--text-muted)', bg: 'var(--bg-app)', icon: MinusCircle, label: 'Skipped' },
};

const OPTIONS = ['A', 'B', 'C', 'D'];

/**
 * @param {Object} props
 * @param {Record<string, { userAnswer: string|null, correctAnswer: string, status: string }>} props.breakdown
 * @param {number} props.totalQuestions
 * @param {string} [props.basePath]
 */
export default function SolutionSheet({ breakdown, totalQuestions, basePath }) {
    const [expandedQs, setExpandedQs] = useState({});

    const toggleQuestion = (qNum) => {
        setExpandedQs(prev => ({ ...prev, [qNum]: !prev[qNum] }));
    };

    return (
        <div style={styles.wrapper}>
            <h3 style={styles.title}>📝 Solution Review</h3>
            <p style={styles.subtitle}>
                Review your answers. Green = Correct, Red = Wrong, Gray = Skipped.
            </p>

            {/* Legend */}
            <div style={styles.legend}>
                {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                    <span key={key} style={{ ...styles.legendItem, color: cfg.color }}>
                        <cfg.icon size={14} /> {cfg.label}
                    </span>
                ))}
            </div>

            {/* Question List */}
            <div style={styles.list}>
                {Array.from({ length: totalQuestions }, (_, i) => {
                    const qNum = String(i + 1);
                    const entry = breakdown[qNum];
                    if (!entry) return null;

                    const cfg = STATUS_CONFIG[entry.status];
                    const Icon = cfg.icon;
                    const isExpanded = expandedQs[qNum];

                    return (
                        <div key={qNum} style={{ ...styles.questionCard, borderLeftColor: cfg.color }}>
                            <div style={styles.qHeader}>
                                <div style={styles.qHeaderLeft}>
                                    <span style={styles.qNum}>Q{qNum}</span>
                                    {basePath && (
                                        <button 
                                            style={styles.viewBtn} 
                                            onClick={() => toggleQuestion(qNum)}
                                            title={isExpanded ? "Hide Question" : "View Question"}
                                        >
                                            {isExpanded ? <EyeOff size={14} /> : <Eye size={14} />}
                                            {isExpanded ? "Hide Question" : "View Question"}
                                        </button>
                                    )}
                                </div>
                                <div style={{ ...styles.statusBadge, background: cfg.bg, color: cfg.color }}>
                                    <Icon size={14} /> {cfg.label}
                                </div>
                            </div>

                            {/* Question Image (Conditional) */}
                            {isExpanded && basePath && (
                                <div style={styles.imagePreview}>
                                    <img 
                                        src={`${basePath}/Q${qNum}.png`} 
                                        alt={`Question ${qNum}`}
                                        style={styles.qImg}
                                    />
                                </div>
                            )}

                            {/* Options Grid */}
                            <div style={styles.optionsRow}>
                                {OPTIONS.map((opt) => {
                                    const isCorrectOpt = opt === entry.correctAnswer;
                                    const isUserOpt = opt === entry.userAnswer;
                                    const isWrongPick = isUserOpt && entry.status === 'wrong';

                                    let optStyle = { ...styles.option };
                                    if (isCorrectOpt) {
                                        optStyle = { ...optStyle, ...styles.optionCorrect };
                                    } else if (isWrongPick) {
                                        optStyle = { ...optStyle, ...styles.optionWrong };
                                    }

                                    return (
                                        <div key={opt} style={optStyle}>
                                            <span style={styles.optLetter}>{opt}</span>
                                            {isCorrectOpt && <CheckCircle2 size={12} color="var(--success)" />}
                                            {isWrongPick && <XCircle size={12} color="var(--error)" />}
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Answers Text */}
                            <div style={styles.answerText}>
                                {entry.userAnswer ? (
                                    <span>
                                        Your Answer: <strong style={{ color: entry.status === 'correct' ? 'var(--success)' : 'var(--error)' }}>{entry.userAnswer}</strong>
                                    </span>
                                ) : (
                                    <span style={{ color: 'var(--text-muted)' }}>Not Attempted</span>
                                )}
                                <span style={{ margin: '0 8px', color: 'var(--border-light)' }}>|</span>
                                <span>Correct: <strong style={{ color: 'var(--success)' }}>{entry.correctAnswer}</strong></span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

/** @type {Record<string, import('react').CSSProperties>} */
const styles = {
    wrapper: { display: 'flex', flexDirection: 'column', gap: 16 },
    title: { fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)' },
    subtitle: { fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: -8 },

    legend: { display: 'flex', gap: 16, flexWrap: 'wrap' },
    legendItem: { display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.78rem', fontWeight: 600 },

    list: { display: 'flex', flexDirection: 'column', gap: 10 },

    questionCard: {
        padding: '14px 18px',
        background: 'var(--bg-card)',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border-light)',
        borderLeft: '4px solid var(--text-muted)',
        boxShadow: 'var(--shadow-sm)',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
    },
    qHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
    qHeaderLeft: { display: 'flex', alignItems: 'center', gap: 12 },
    qNum: { fontSize: '0.92rem', fontWeight: 800, color: 'var(--text-main)' },
    viewBtn: { 
        display: 'inline-flex', 
        alignItems: 'center', 
        gap: 6, 
        fontSize: '0.72rem', 
        fontWeight: 600, 
        color: 'var(--primary)', 
        background: 'var(--primary-muted)', 
        border: 'none', 
        padding: '4px 10px', 
        borderRadius: 'var(--radius-full)', 
        cursor: 'pointer',
        transition: 'all 0.2s ease',
    },
    statusBadge: { display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 'var(--radius-full)', fontSize: '0.72rem', fontWeight: 600 },

    imagePreview: {
        background: '#fff',
        padding: 12,
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border-light)',
        marginTop: 4,
    },
    qImg: {
        maxWidth: '100%',
        height: 'auto',
        borderRadius: 'var(--radius-sm)',
        display: 'block',
    },

    optionsRow: { display: 'flex', gap: 8 },
    option: {
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        padding: '6px 16px',
        borderRadius: 'var(--radius-md)',
        background: 'var(--bg-app)',
        border: '1.5px solid var(--border-light)',
        fontSize: '0.82rem',
        fontWeight: 600,
        color: 'var(--text-secondary)',
    },
    optionCorrect: {
        background: 'var(--success-muted)',
        borderColor: 'var(--success)',
        color: 'var(--success)',
    },
    optionWrong: {
        background: 'var(--error-muted)',
        borderColor: 'var(--error)',
        color: 'var(--error)',
    },
    optLetter: { fontWeight: 700 },

    answerText: { fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 500 },
};
