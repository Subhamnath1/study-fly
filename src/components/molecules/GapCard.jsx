/**
 * @fileoverview GapCard — PW-style announcement banner for gap / exam days.
 */

import { AlertTriangle, FileCheck2, PenTool, Clock, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useExam } from '@hooks/useExam';
import { formatCountdown } from '@utils/timeHelpers';

/**
 * @param {Object} props
 * @param {'GAP_PRACTICE' | 'CHAPTER_EXAM'} props.dayType
 * @param {Object[]} [props.subjects]
 * @returns {JSX.Element}
 */
export default function GapCard({ dayType, subjects = [] }) {
    const navigate = useNavigate();
    const isExam = dayType === 'CHAPTER_EXAM';
    const examData = subjects[0]; // Usually only one exam per gap day

    // For exam calculation (mock examId based on chapter)
    const examId = examData ? `exam_${examData.chapterName.replace(/\s+/g, '')}` : 'test';
    const { status, secondsLeft, isSubmitted } = useExam(
        examId,
        examData?.unlockTime || '19:00',
        examData?.duration || 90
    );

    const Icon = isExam ? FileCheck2 : PenTool;
    const gradient = isExam
        ? 'linear-gradient(135deg, var(--error), #ef4444)'
        : 'linear-gradient(135deg, var(--success), #10b981)';
    const title = isExam ? 'Chapter Exam Tonight' : 'Self-Study Day';

    // Dynamic Subtitle for Exams
    let subtitle = 'No video lectures today. Focus on DPPs and solve past papers.';
    if (isExam) {
        if (isSubmitted || status === 'completed') subtitle = 'Exam completed successfully.';
        else if (status === 'missed') subtitle = 'Exam window has closed.';
        else if (status === 'live') subtitle = 'Exam is live right now! Join immediately.';
        else subtitle = `Full chapter test at ${examData?.unlockTime || '19:00'} — Revise thoroughly.`;
    }

    const canEnter = status === 'ready' || status === 'live';

    return (
        <div style={styles.card}>
            <div style={{ ...styles.strip, background: gradient }} />

            <div style={styles.content}>
                <div style={{ ...styles.iconCircle, background: gradient }}>
                    <Icon size={22} color="#fff" />
                </div>

                <div style={styles.info}>
                    <div style={styles.titleRow}>
                        <AlertTriangle size={14} color={isExam ? 'var(--error)' : 'var(--success)'} />
                        <h3 style={styles.title}>{title}</h3>
                    </div>
                    <p style={styles.subtitle}>{subtitle}</p>

                    {subjects.length > 0 && !isExam && (
                        <div style={styles.chips}>
                            {subjects.map((s, i) => (
                                <span key={i} style={styles.chip}>{s.subject}</span>
                            ))}
                        </div>
                    )}

                    {isExam && status !== 'completed' && status !== 'missed' && (
                        <div style={styles.examActions}>
                            {(status === 'upcoming' || status === 'ready') && (
                                <div style={styles.countdown}>
                                    <Clock size={14} color="var(--text-muted)" />
                                    <span>Starts in {formatCountdown(secondsLeft)}</span>
                                </div>
                            )}

                            <button
                                style={{
                                    ...styles.enterBtn,
                                    ...(canEnter ? styles.enterBtnActive : styles.enterBtnDisabled)
                                }}
                                disabled={!canEnter}
                                onClick={() => navigate(`/exam/${examId}`, { state: { examData } })}
                            >
                                {status === 'live' ? 'Resume Exam' : 'Enter Exam Hall'} <ArrowRight size={14} />
                            </button>
                        </div>
                    )}
                </div>
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
    },
    strip: {
        height: 4,
    },
    content: {
        display: 'flex',
        alignItems: 'flex-start',
        gap: 14,
        padding: '16px 20px',
    },
    iconCircle: {
        width: 44,
        height: 44,
        borderRadius: 12,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
    },
    info: {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
    },
    titleRow: {
        display: 'flex',
        alignItems: 'center',
        gap: 6,
    },
    title: {
        fontSize: '0.95rem',
        fontWeight: 700,
        color: 'var(--text-main)',
    },
    subtitle: {
        fontSize: '0.82rem',
        color: 'var(--text-muted)',
        lineHeight: 1.5,
    },
    chips: {
        display: 'flex',
        gap: 6,
        marginTop: 6,
    },
    chip: {
        fontSize: '0.7rem',
        fontWeight: 600,
        padding: '3px 10px',
        borderRadius: 'var(--radius-full)',
        background: 'var(--bg-app)',
        border: '1px solid var(--border-light)',
        color: 'var(--text-muted)',
    },
};
