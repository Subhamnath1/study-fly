/**
 * @fileoverview Player — the classroom page for watching lectures.
 *
 * Route: /watch/:videoId
 * Layout: TopBar → Header → Video Player → Study Material buttons
 */

import { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDataContext } from '@context/DataContext';
import { useProgress } from '@hooks/useProgress';
import { ArrowLeft, FileText, FileImage, BookOpen, FlaskConical, Sigma } from 'lucide-react';
import TopBar from '@organisms/TopBar';
import DrivePlayer from '@organisms/DrivePlayer';
import notesData from '@data/notes.json';

const SUBJECT_GRADIENT = {
    Physics: 'linear-gradient(135deg, #3B82F6, #60A5FA)',
    Math: 'linear-gradient(135deg, #EF4444, #F87171)',
    Chemistry: 'linear-gradient(135deg, #10B981, #34D399)',
};

const SUBJECT_ICON = {
    Physics: BookOpen,
    Chemistry: FlaskConical,
    Math: Sigma,
};

/**
 * @returns {JSX.Element}
 */
export default function Player() {
    const { videoId } = useParams();
    const navigate = useNavigate();
    const { schedule } = useDataContext();
    const { getProgress, markAsCompleted, saveProgress } = useProgress();

    /* Find the subject entry matching the videoId */
    const lectureData = useMemo(() => {
        for (const day of schedule) {
            for (const subj of day.subjects) {
                if (subj.videoId === videoId) {
                    return { ...subj, date: day.date, dayType: day.dayType };
                }
            }
        }
        return null;
    }, [schedule, videoId]);

    const progress = getProgress(videoId);
    const isCompleted = progress?.completed ?? false;

    if (!lectureData) {
        return (
            <div style={styles.page}>
                <TopBar />
                <div style={styles.content}>
                    <div style={styles.emptyCard}>
                        <p style={styles.emptyText}>Lecture not found for video ID: <code>{videoId}</code></p>
                        <button style={styles.backBtn} onClick={() => navigate('/dashboard')}>
                            <ArrowLeft size={16} /> Back to Dashboard
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    const gradient = SUBJECT_GRADIENT[lectureData.subject] ?? SUBJECT_GRADIENT.Physics;
    const SubjIcon = SUBJECT_ICON[lectureData.subject] ?? BookOpen;

    return (
        <div style={styles.page}>
            <TopBar />

            <div style={styles.content}>
                {/* ── Back + Header ── */}
                <div style={styles.headerRow}>
                    <button style={styles.backBtn} onClick={() => navigate('/dashboard')}>
                        <ArrowLeft size={16} /> Dashboard
                    </button>
                </div>

                {/* ── Lecture Info Banner ── */}
                <div style={{ ...styles.infoBanner, background: gradient }}>
                    <div style={styles.bannerIcon}>
                        <SubjIcon size={20} color="#fff" />
                    </div>
                    <div>
                        <span style={styles.bannerSubject}>{lectureData.subject}</span>
                        <h2 style={styles.bannerTitle}>{lectureData.chapterName}</h2>
                        <p style={styles.bannerTopic}>{lectureData.topic}</p>
                    </div>
                </div>

                {/* ── Video Player ── */}
                <DrivePlayer
                    videoId={videoId}
                    progress={progress}
                    onMarkComplete={markAsCompleted}
                    onSaveProgress={saveProgress}
                    completed={isCompleted}
                />

                {/* ── Study Material ── */}
                <section style={styles.materialSection}>
                    <h3 style={styles.materialTitle}>Study Material</h3>
                    <div style={styles.materialGrid}>
                        <a
                            href={(() => {
                                const notesUrl = lectureData.resourceLinks?.notes;
                                if (!notesUrl) return '#';
                                const matchedNote = Object.values(notesData).find(n => n.driveUrl === notesUrl);
                                return matchedNote ? `/notes/${matchedNote.id}` : notesUrl;
                            })()}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={styles.materialCard}
                        >
                            <div style={{ ...styles.materialIcon, background: 'var(--primary-muted)' }}>
                                <FileText size={22} color="var(--primary)" />
                            </div>
                            <div>
                                <p style={styles.materialLabel}>Class Notes</p>
                                <p style={styles.materialSub}>PDF • View in Reader</p>
                            </div>
                        </a>

                        <a
                            href={lectureData.resourceLinks?.dpp}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={styles.materialCard}
                        >
                            <div style={{ ...styles.materialIcon, background: 'var(--accent-muted)' }}>
                                <FileImage size={22} color="var(--accent-hover)" />
                            </div>
                            <div>
                                <p style={styles.materialLabel}>Download DPP</p>
                                <p style={styles.materialSub}>Image • Practice Sheet</p>
                            </div>
                        </a>
                    </div>
                </section>
            </div>
        </div>
    );
}

/** @type {Record<string, import('react').CSSProperties>} */
const styles = {
    page: {
        minHeight: '100vh',
        background: 'var(--bg-app)',
    },
    content: {
        maxWidth: 720,
        margin: '0 auto',
        padding: '16px 16px 48px',
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
    },

    /* Header */
    headerRow: {
        display: 'flex',
        alignItems: 'center',
    },
    backBtn: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '8px 16px',
        borderRadius: 'var(--radius-full)',
        background: 'var(--bg-card)',
        border: '1px solid var(--border-light)',
        fontSize: '0.82rem',
        fontWeight: 600,
        color: 'var(--text-secondary)',
        cursor: 'pointer',
        transition: 'background var(--transition-fast)',
    },

    /* Info Banner */
    infoBanner: {
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '16px 20px',
        borderRadius: 'var(--radius-card)',
        color: '#fff',
    },
    bannerIcon: {
        width: 44,
        height: 44,
        borderRadius: 12,
        background: 'rgba(255,255,255,0.2)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
    },
    bannerSubject: {
        fontSize: '0.7rem',
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
        opacity: 0.85,
    },
    bannerTitle: {
        fontSize: '1.05rem',
        fontWeight: 800,
        lineHeight: 1.2,
        marginTop: 2,
    },
    bannerTopic: {
        fontSize: '0.82rem',
        opacity: 0.85,
        marginTop: 2,
    },

    /* Material */
    materialSection: {
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
    },
    materialTitle: {
        fontSize: '1.05rem',
        fontWeight: 700,
        color: 'var(--text-main)',
    },
    materialGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: 12,
    },
    materialCard: {
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '14px 16px',
        borderRadius: 'var(--radius-card)',
        background: 'var(--bg-card)',
        border: '1px solid var(--border-light)',
        boxShadow: 'var(--shadow-sm)',
        textDecoration: 'none',
        cursor: 'pointer',
        transition: 'box-shadow var(--transition-fast)',
    },
    materialIcon: {
        width: 44,
        height: 44,
        borderRadius: 12,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
    },
    materialLabel: {
        fontSize: '0.85rem',
        fontWeight: 700,
        color: 'var(--text-main)',
    },
    materialSub: {
        fontSize: '0.72rem',
        color: 'var(--text-muted)',
        marginTop: 2,
    },

    /* Empty */
    emptyCard: {
        padding: '40px 20px',
        borderRadius: 'var(--radius-card)',
        background: 'var(--bg-card)',
        border: '1px solid var(--border-light)',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 16,
    },
    emptyText: {
        color: 'var(--text-muted)',
        fontSize: '0.9rem',
    },
};
