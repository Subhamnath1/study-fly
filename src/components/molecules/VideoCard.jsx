/**
 * @fileoverview VideoCard — PW-style lecture card with colored banner, info, and action.
 */

import { useNavigate } from 'react-router-dom';
import { Play, Lock, CheckCircle2, Clock, BarChart3, FileQuestion } from 'lucide-react';
import { isUnlocked } from '@utils/timeHelpers';
import { useExam } from '@hooks/useExam';
import { useResult } from '@hooks/useResult';

/** Subject → banner gradient */
const SUBJECT_GRADIENT = {
    Physics: 'linear-gradient(135deg, #3B82F6, #60A5FA)',
    Math: 'linear-gradient(135deg, #EF4444, #F87171)',
    Chemistry: 'linear-gradient(135deg, #10B981, #34D399)',
};

/**
 * @typedef {'locked' | 'unlocked' | 'completed'} CardStatus
 */

/**
 * @param {Object} props
 * @param {Object} props.data          - Subject entry from schedule.json.
 * @param {CardStatus} [props.status]  - Override status.
 * @param {boolean} [props.isToday]    - Whether this card belongs to today.
 * @returns {import('react').JSX.Element}
 */
export default function VideoCard({ data, status, isToday = true }) {
    const navigate = useNavigate();
    const isTest = data.type === 'TEST';
    const gradient = SUBJECT_GRADIENT[data.subject] ?? SUBJECT_GRADIENT.Physics;

    // For videos
    const videoResolved = status ?? (isToday && isUnlocked(data.unlockTime) ? 'unlocked' : 'locked');
    const isVideoCompleted = videoResolved === 'completed';
    const isVideoLocked = videoResolved === 'locked';

    // For exams (only active if isTest is true)
    const examId = isTest ? `exam_${data.chapterName.replace(/\s+/g, '')}_${data.topic.replace(/\s+/g, '')}` : null;
    const { status: examStatus, secondsLeft: examSeconds, isSubmitted } = useExam(
        examId,
        data.unlockTime,
        data.duration || 60
    );

    const isExamCompleted = isSubmitted || examStatus === 'completed';
    const isExamLocked = examStatus === 'upcoming' || examStatus === 'missed';
    const canEnterExam = examStatus === 'ready' || examStatus === 'live';

    // Fetch score for completed exams
    const { stats: examResult } = useResult(isExamCompleted ? examId : null);

    // Unified action handler
    const handleAction = () => {
        if (isTest) {
            if (canEnterExam) navigate(`/exam/${examId}`, { state: { examData: data } });
        } else {
            if (!isVideoLocked && data.videoId) navigate(`/watch/${data.videoId}`);
        }
    };

    // Determine opacity/cursor
    const isDone = isTest ? isExamCompleted : isVideoCompleted;
    const isDisallowed = isTest ? !canEnterExam : isVideoLocked;

    return (
        <div
            style={{ ...styles.card, opacity: isDone ? 0.7 : 1, cursor: isDisallowed ? 'default' : 'pointer' }}
            onClick={isDisallowed ? undefined : handleAction}
        >
            {/* ── Colored Top Banner ── */}
            <div style={{ ...styles.banner, background: gradient }}>
                <span style={styles.bannerSubject}>{data.subject}</span>
                <span style={styles.bannerType}>{data.type}</span>
            </div>

            {/* ── Body ── */}
            <div style={styles.body}>
                <h3 style={styles.chapter}>{data.chapterName}</h3>
                <p style={styles.topic}>{data.topic}</p>

                {/* Meta row */}
                <div style={styles.metaRow}>
                    <span style={styles.timeBadge}>
                        <Clock size={13} /> {data.unlockTime}
                    </span>
                    {data.duration && (
                        <span style={styles.durationBadge}>{data.duration} min</span>
                    )}
                </div>
            </div>

            {/* ── Action Button ── */}
            <div style={styles.actionArea}>
                {/* Exam Render */}
                {isTest ? (
                    isExamCompleted ? (
                        <div style={styles.examResultArea}>
                            <div style={{ ...styles.statusChip, background: 'var(--success-muted)', color: 'var(--success)' }}>
                                <CheckCircle2 size={14} />
                                {examResult ? `Score: ${examResult.score}/${examResult.maxScore}` : 'Submitted'}
                            </div>
                            {examResult && (
                                <button
                                    style={styles.analysisLink}
                                    onClick={(e) => { e.stopPropagation(); navigate(`/result/${examId}`); }}
                                >
                                    <BarChart3 size={13} /> View Analysis
                                </button>
                            )}
                        </div>
                    ) : examStatus === 'missed' ? (
                        <div style={{ ...styles.statusChip, background: 'var(--error-muted)', color: 'var(--error)' }}>
                            <Lock size={14} /> Missed
                        </div>
                    ) : canEnterExam ? (
                        <button style={{ ...styles.playBtn, background: gradient }} onClick={(e) => { e.stopPropagation(); handleAction(); }}>
                            {examStatus === 'live' ? 'Resume Exam' : 'Enter Exam'}
                        </button>
                    ) : (
                        <div style={{ ...styles.statusChip, background: 'var(--bg-app)', color: 'var(--text-muted)' }}>
                            Starts in {Math.floor(examSeconds / 3600)}h {Math.floor((examSeconds % 3600) / 60)}m
                        </div>
                    )
                ) : (
                    /* Normal Video Render */
                    isVideoCompleted ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                            <div style={{ ...styles.statusChip, background: 'var(--success-muted)', color: 'var(--success)' }}>
                                <CheckCircle2 size={16} /> Done
                            </div>
                            {data.resourceLinks?.dpp && (
                                <button
                                    style={styles.dppLink}
                                    onClick={(e) => { e.stopPropagation(); navigate(`/dpp/${data.resourceLinks.dpp}`); }}
                                >
                                    <FileQuestion size={13} /> Attempt DPP
                                </button>
                            )}
                        </div>
                    ) : isVideoLocked ? (
                        <div style={{ ...styles.statusChip, background: 'var(--bg-app)', color: 'var(--text-muted)' }}>
                            <Lock size={14} /> Locked
                        </div>
                    ) : (
                        <button style={{ ...styles.playBtn, background: gradient }} onClick={(e) => { e.stopPropagation(); handleAction(); }}>
                            <Play size={16} fill="#fff" color="#fff" /> Watch Now
                        </button>
                    )
                )}
            </div>
        </div>
    );
}

/** @type {Record<string, import('react').CSSProperties>} */
const styles = {
    card: {
        borderRadius: 'var(--radius-card)',
        background: 'var(--bg-card)',
        border: '1px solid var(--border-light)',
        boxShadow: 'var(--shadow-card)',
        overflow: 'hidden',
        transition: 'transform var(--transition-fast), box-shadow var(--transition-fast)',
    },

    /* Top colored strip */
    banner: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 16px',
    },
    bannerSubject: {
        fontSize: '0.78rem',
        fontWeight: 700,
        color: '#fff',
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
    },
    bannerType: {
        fontSize: '0.68rem',
        fontWeight: 600,
        color: 'rgba(255,255,255,0.8)',
        padding: '2px 8px',
        borderRadius: 'var(--radius-full)',
        background: 'rgba(255,255,255,0.2)',
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
    },

    /* Content */
    body: {
        padding: '14px 16px 10px',
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
    },
    chapter: {
        fontSize: '0.95rem',
        fontWeight: 700,
        color: 'var(--text-main)',
        lineHeight: 1.3,
    },
    topic: {
        fontSize: '0.82rem',
        color: 'var(--text-muted)',
        lineHeight: 1.4,
    },
    metaRow: {
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        marginTop: 6,
    },
    timeBadge: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        fontSize: '0.72rem',
        fontWeight: 600,
        color: 'var(--text-muted)',
        padding: '3px 8px',
        background: 'var(--bg-app)',
        borderRadius: 'var(--radius-full)',
    },
    durationBadge: {
        fontSize: '0.72rem',
        fontWeight: 600,
        color: 'var(--primary)',
        padding: '3px 8px',
        background: 'var(--primary-muted)',
        borderRadius: 'var(--radius-full)',
    },

    /* Action area */
    actionArea: {
        padding: '10px 16px 14px',
    },
    statusChip: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '6px 14px',
        borderRadius: 'var(--radius-full)',
        fontSize: '0.78rem',
        fontWeight: 600,
    },
    playBtn: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '8px 20px',
        borderRadius: 'var(--radius-full)',
        color: '#fff',
        fontSize: '0.82rem',
        fontWeight: 600,
        border: 'none',
        cursor: 'pointer',
        boxShadow: '0 2px 8px rgba(90, 75, 218, 0.3)',
        transition: 'transform var(--transition-fast)',
    },
    examResultArea: {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        flexWrap: 'wrap',
    },
    analysisLink: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        fontSize: '0.72rem',
        fontWeight: 600,
        color: 'var(--primary)',
        background: 'transparent',
        border: 'none',
        cursor: 'pointer',
        textDecoration: 'underline',
        padding: 0,
    },
    dppLink: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        fontSize: '0.72rem',
        fontWeight: 700,
        color: '#6366F1',
        background: 'var(--primary-muted)',
        border: 'none',
        cursor: 'pointer',
        padding: '5px 12px',
        borderRadius: 'var(--radius-full)',
        transition: 'background var(--transition-fast)',
    },
};
