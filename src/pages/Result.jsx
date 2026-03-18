/**
 * @fileoverview Result — Visually stunning Report Card with score ring, stats, and solution viewer.
 *
 * Route: /result/:examId
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useResult } from '@hooks/useResult';
import SolutionSheet from '@organisms/SolutionSheet';
import {
    Trophy, Target, XCircle, MinusCircle,
    CheckCircle2, ArrowLeft, FileText, Sparkles
} from 'lucide-react';

export default function Result() {
    const { examId } = useParams();
    const navigate = useNavigate();
    const { stats, error } = useResult(examId);
    const [showSolutions, setShowSolutions] = useState(false);
    const [animated, setAnimated] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => setAnimated(true), 300);
        return () => clearTimeout(timer);
    }, []);

    if (error || !stats) {
        return (
            <div style={styles.errorPage}>
                <XCircle size={48} color="var(--error)" />
                <h2 style={styles.errorTitle}>Result Not Found</h2>
                <p style={styles.errorText}>{error || 'No exam data available.'}</p>
                <button style={styles.outlineBtn} onClick={() => navigate('/dashboard')}>
                    <ArrowLeft size={16} /> Back to Dashboard
                </button>
            </div>
        );
    }

    const { score, maxScore, percentage, accuracy, correct, wrong, unattempted, attempted, totalQuestions, chapterName, subject } = stats;

    // Determine mood color + message
    const mood = percentage >= 80 ? 'excellent' : percentage >= 60 ? 'good' : percentage >= 40 ? 'average' : 'needsWork';
    const moodConfig = {
        excellent: { color: 'var(--success)', emoji: '🏆', message: 'Outstanding Performance!' },
        good: { color: 'var(--info)', emoji: '🎯', message: 'Great Job! Keep Going!' },
        average: { color: 'var(--warning)', emoji: '💪', message: 'Good Effort! Room to Improve.' },
        needsWork: { color: 'var(--error)', emoji: '📚', message: 'Don\'t Worry — Keep Practicing!' },
    };
    const { color: moodColor, emoji: moodEmoji, message: moodMessage } = moodConfig[mood];

    // SVG Ring
    const ringRadius = 70;
    const circumference = 2 * Math.PI * ringRadius;
    const offset = circumference - (animated ? (percentage / 100) * circumference : circumference);

    if (showSolutions) {
        return (
            <div style={styles.page}>
                <button style={styles.backLink} onClick={() => setShowSolutions(false)}>
                    <ArrowLeft size={16} /> Back to Report Card
                </button>
                <SolutionSheet 
                    breakdown={stats.breakdown} 
                    totalQuestions={totalQuestions} 
                    basePath={stats.basePath} 
                />
            </div>
        );
    }

    return (
        <div style={styles.page}>
            {/* Header */}
            <div style={styles.headerRow}>
                <button style={styles.backLink} onClick={() => navigate('/dashboard')}>
                    <ArrowLeft size={16} /> Dashboard
                </button>
            </div>

            {/* Exam Title */}
            <div style={styles.titleCard}>
                <h2 style={styles.examTitle}>{chapterName}</h2>
                <span style={styles.subjectBadge}>{subject} • Chapter Exam</span>
            </div>

            {/* Score Ring + Main Stats */}
            <div style={styles.scoreSection}>
                <div style={styles.ringCard}>
                    <svg width="180" height="180" viewBox="0 0 180 180">
                        <circle cx="90" cy="90" r={ringRadius} fill="none" stroke="var(--border-light)" strokeWidth="14" />
                        <circle
                            cx="90" cy="90" r={ringRadius} fill="none"
                            stroke={moodColor} strokeWidth="14"
                            strokeDasharray={circumference}
                            strokeDashoffset={offset}
                            strokeLinecap="round"
                            transform="rotate(-90 90 90)"
                            style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.4, 0, 0.2, 1)' }}
                        />
                        <text x="90" y="80" textAnchor="middle" fontSize="32" fontWeight="800" fill="var(--text-main)">
                            {animated ? percentage : 0}%
                        </text>
                        <text x="90" y="105" textAnchor="middle" fontSize="12" fontWeight="500" fill="var(--text-muted)">
                            {score}/{maxScore}
                        </text>
                    </svg>

                    <p style={styles.moodText}>
                        <span style={{ fontSize: '1.4rem' }}>{moodEmoji}</span> {moodMessage}
                    </p>
                </div>

                {/* Stat Cards Grid */}
                <div style={styles.statGrid}>
                    <StatBox icon={<Target size={20} />} value={attempted} label="Attempted" sub={`of ${totalQuestions}`} color="var(--primary)" />
                    <StatBox icon={<CheckCircle2 size={20} />} value={correct} label="Correct" sub={`+${correct * 4} marks`} color="var(--success)" />
                    <StatBox icon={<XCircle size={20} />} value={wrong} label="Wrong" sub={`−${wrong} marks`} color="var(--error)" />
                    <StatBox icon={<MinusCircle size={20} />} value={unattempted} label="Skipped" sub="0 marks" color="var(--text-muted)" />
                </div>
            </div>

            {/* Accuracy & Marking Scheme */}
            <div style={styles.insightRow}>
                <div style={styles.insightCard}>
                    <Sparkles size={18} color="var(--primary)" />
                    <div>
                        <span style={styles.insightLabel}>Accuracy</span>
                        <span style={styles.insightValue}>{accuracy}%</span>
                    </div>
                </div>
                <div style={styles.insightCard}>
                    <Trophy size={18} color="var(--warning)" />
                    <div>
                        <span style={styles.insightLabel}>Marking</span>
                        <span style={styles.insightValue}>+{stats.markingScheme.correct} / {stats.markingScheme.wrong} / {stats.markingScheme.unattempted}</span>
                    </div>
                </div>
                <div style={styles.insightCard}>
                    <FileText size={18} color="var(--info)" />
                    <div>
                        <span style={styles.insightLabel}>Total Questions</span>
                        <span style={styles.insightValue}>{totalQuestions}</span>
                    </div>
                </div>
            </div>

            {/* Action Buttons */}
            <div style={styles.actionRow}>
                <button style={styles.primaryBtn} onClick={() => setShowSolutions(true)}>
                    <FileText size={16} /> View Solutions
                </button>
                <button style={styles.outlineBtn} onClick={() => navigate('/dashboard')}>
                    <ArrowLeft size={16} /> Back to Dashboard
                </button>
            </div>
        </div>
    );
}

function StatBox({ icon, value, label, sub, color }) {
    return (
        <div style={styles.statBox}>
            <div style={{ ...styles.statIcon, color, background: color + '14' }}>{icon}</div>
            <span style={styles.statValue}>{value}</span>
            <span style={styles.statLabel}>{label}</span>
            <span style={styles.statSub}>{sub}</span>
        </div>
    );
}

/** @type {Record<string, import('react').CSSProperties>} */
const styles = {
    page: { minHeight: '100vh', padding: '24px 28px 48px', maxWidth: 900, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 },

    headerRow: { display: 'flex', alignItems: 'center' },
    backLink: { display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', background: 'transparent', border: 'none', cursor: 'pointer', padding: '8px 0' },

    titleCard: { textAlign: 'center' },
    examTitle: { fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: 6 },
    subjectBadge: { fontSize: '0.8rem', fontWeight: 600, color: 'var(--primary)', background: 'var(--primary-muted)', padding: '4px 14px', borderRadius: 'var(--radius-full)' },

    scoreSection: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, alignItems: 'center' },

    ringCard: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: 32, background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-sm)' },
    moodText: { display: 'flex', alignItems: 'center', gap: 8, fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)' },

    statGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 },
    statBox: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '18px 14px', background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-sm)' },
    statIcon: { width: 40, height: 40, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
    statValue: { fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)' },
    statLabel: { fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' },
    statSub: { fontSize: '0.68rem', color: 'var(--text-muted)' },

    insightRow: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 },
    insightCard: { display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px', background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-sm)' },
    insightLabel: { fontSize: '0.7rem', fontWeight: 500, color: 'var(--text-muted)', display: 'block' },
    insightValue: { fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)' },

    actionRow: { display: 'flex', justifyContent: 'center', gap: 14 },
    primaryBtn: { display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 28px', background: 'linear-gradient(135deg, var(--primary), #7C6BF0)', color: '#fff', border: 'none', borderRadius: 'var(--radius-full)', fontSize: '0.92rem', fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 12px rgba(90,75,218,0.3)' },
    outlineBtn: { display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 28px', background: 'var(--bg-card)', color: 'var(--text-main)', border: '1px solid var(--border)', borderRadius: 'var(--radius-full)', fontSize: '0.92rem', fontWeight: 600, cursor: 'pointer' },

    errorPage: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 16, textAlign: 'center', padding: 40 },
    errorTitle: { fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-main)' },
    errorText: { fontSize: '0.92rem', color: 'var(--text-muted)' },
};
