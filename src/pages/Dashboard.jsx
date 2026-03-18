/**
 * @fileoverview Dashboard — Redesigned study command center with sidebar-compatible layout.
 *
 * Layout: Welcome Banner (AI Chat) → Stats Row → [Subjects + Calendar] → Backlog
 */

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '@context/AuthContext';
import { useSchedule } from '@hooks/useSchedule';
import { useProgress } from '@hooks/useProgress';
import { useNotifications } from '@hooks/useNotifications';
import { format, parseISO } from 'date-fns';
import { ChevronRight, Flame, Target, Clock, BookOpen, Award, BellRing, Send, Smartphone, PlayCircle, FileQuestion, ArrowRightCircle, CheckCircle2 } from 'lucide-react';
import dppsData from '@data/dpps.json';
import SubjectTabs from '@molecules/SubjectTabs';
import VideoCard from '@molecules/VideoCard';
import GapCard from '@molecules/GapCard';
import AiChatBar from '@molecules/AiChatBar';
import CalendarWidget from '@molecules/CalendarWidget';
import QrPairingModal from '@components/organisms/QrPairingModal';
import HorizontalScroll from '@organisms/HorizontalScroll';

/* ---------------------------------------------------------------- */

const isGapDay = (dayType) =>
    dayType === 'GAP_PRACTICE' || dayType === 'CHAPTER_EXAM';

const DAY_LABELS = {
    CLASS: 'Regular Classes',
    REVISION: 'Revision Day',
    WEEKLY_TEST: 'Weekly Test',
    GAP_PRACTICE: 'Gap Practice',
    CHAPTER_EXAM: 'Chapter Exam',
};

/* ---------------------------------------------------------------- */

export default function Dashboard() {
    const { user } = useAuthContext();
    const { current, backlog, loading } = useSchedule();
    const { progressMap } = useProgress();
    const { permissionStatus, requestPermission } = useNotifications();
    const [activeTab, setActiveTab] = useState('all');
    const [isPairingOpen, setIsPairingOpen] = useState(false);

    const getStatus = (subj) => {
        if (progressMap[subj.videoId]?.completed) return 'completed';
        return undefined;
    };

    const doneCount = useMemo(() => {
        if (!current) return 0;
        return current.subjects.filter((s) => progressMap[s.videoId]?.completed).length;
    }, [current, progressMap]);

    const filteredBacklog = useMemo(() => {
        return backlog.reduce((acc, day) => {
            if (isGapDay(day.dayType)) {
                acc.push(day);
                return acc;
            }

            const pendingSubjects = day.subjects.filter((s) => {
                const isVideoPending = !progressMap[s.videoId]?.completed;
                const dppId = s.resourceLinks?.dpp;
                const isDppPending = dppId && !localStorage.getItem(`dpp_completed_${dppId}`);
                return isVideoPending || isDppPending;
            });

            if (pendingSubjects.length > 0) {
                acc.push({ ...day, subjects: pendingSubjects });
            }

            return acc;
        }, []);
    }, [backlog, progressMap]);

    // Today's DPPs: find DPPs associated with today's lectures (both pending and completed)
    const todayDpps = useMemo(() => {
        if (!current) return [];
        const dpps = [];
        current.subjects.forEach((subj) => {
            const dppKey = subj.resourceLinks?.dpp;
            if (!dppKey || !dppsData[dppKey]) return;
            const isLectureCompleted = !!progressMap[subj.videoId]?.completed;
            if (!isLectureCompleted) return; // Only show DPPs for completed lectures
            const isDppCompleted = !!localStorage.getItem(`dpp_completed_${dppKey}`);
            dpps.push({
                dppId: dppKey,
                dppInfo: dppsData[dppKey],
                subject: subj.subject,
                chapter: subj.chapterName,
                topic: subj.topic,
                isCompleted: isDppCompleted,
            });
        });
        return dpps;
    }, [current, progressMap]);

    const filteredSubjects = useMemo(() => {
        if (!current) return [];
        if (activeTab === 'all') return current.subjects;
        return current.subjects.filter((s) => s.subject === activeTab);
    }, [current, activeTab]);

    if (loading) {
        return (
            <div className="loader-container">
                <div className="spinner" />
                <span className="loader-text">Loading schedule…</span>
            </div>
        );
    }

    const greeting = getGreeting();

    return (
        <div style={styles.page}>
            {/* ── Welcome Banner with AI ── */}
            <div style={styles.welcomeBanner}>
                <div style={styles.welcomeTop}>
                    <div>
                        <h2 style={styles.welcomeTitle}>Welcome back, {user?.name ?? 'Student'}!</h2>
                        <p style={styles.welcomeSub}>Ready to power up your brain today?</p>
                    </div>
                    <button style={styles.pairBtn} onClick={() => setIsPairingOpen(true)} title="Link another device">
                        <Smartphone size={18} />
                        <span>Pair Device</span>
                    </button>
                </div>
                <AiChatBar />
            </div>

            {/* ── Notification Banner ── */}
            {permissionStatus === 'default' && (
                <div style={styles.notificationBanner}>
                    <div style={styles.notifInfo}>
                        <div style={styles.notifIcon}>
                            <BellRing size={20} color="var(--primary)" />
                        </div>
                        <div>
                            <h4 style={styles.notifTitle}>Never Miss a Class!</h4>
                            <p style={styles.notifSub}>Get notified with direct video links exactly when your lectures unlock.</p>
                        </div>
                    </div>
                    <div style={styles.notifActions}>
                        <a href="https://t.me/Notification_123_study_bot?start=subscribe" target="_blank" rel="noreferrer" style={styles.telegramBtn}>
                            <Send size={16} /> Get Telegram Alerts
                        </a>
                        <button style={styles.notifBtn} onClick={requestPermission}>
                            Browser Push
                        </button>
                    </div>
                </div>
            )}

            {/* ── Stats Row ── */}
            <div style={styles.statsRow}>
                <StatCard icon={<Flame size={18} />} value="9" label="Streak (days)" color="var(--warning)" />
                <StatCard icon={<Target size={18} />} value={current?.subjects.length ?? 0} label="Subjects Today" color="var(--primary)" />
                <StatCard icon={<Clock size={18} />} value="32" label="Hours Learned" color="var(--info)" />
                <StatCard icon={<BookOpen size={18} />} value={doneCount} label="Completed" color="var(--success)" />
                <StatCard icon={<Award size={18} />} value="85%" label="Avg. Score" color="var(--error)" />
            </div>

            <QrPairingModal isOpen={isPairingOpen} onClose={() => setIsPairingOpen(false)} />

            {/* ── Main Content Grid ── */}
            <div style={styles.contentGrid}>
                {/* Left: Today's Schedule */}
                <div style={styles.leftCol}>
                    {/* Section Header */}
                    <div style={styles.sectionHeader}>
                        <h3 style={styles.sectionTitle}>My Subjects</h3>
                        {current && (
                            <span style={styles.dayBadge}>{DAY_LABELS[current.dayType] ?? current.dayType}</span>
                        )}
                    </div>

                    {/* Subject Tabs */}
                    {current && !isGapDay(current.dayType) && (
                        <SubjectTabs active={activeTab} onChange={setActiveTab} />
                    )}

                    {/* Cards */}
                    {!current ? (
                        <div style={styles.emptyCard}>
                            <p style={styles.emptyText}>
                                No schedule for today. The journey starts <strong>March 9, 2026</strong>.
                            </p>
                        </div>
                    ) : isGapDay(current.dayType) ? (
                        <GapCard dayType={current.dayType} subjects={current.subjects} />
                    ) : (
                        <div style={styles.cardGrid}>
                            {filteredSubjects.map((subj, i) => (
                                <VideoCard key={`today-${i}`} data={subj} isToday status={getStatus(subj)} />
                            ))}
                            {filteredSubjects.length === 0 && (
                                <p style={styles.emptyText}>No classes for this subject today.</p>
                            )}
                        </div>
                    )}

                    {/* ── DPPs Section ── */}
                    {todayDpps.length > 0 && (
                        <div style={styles.section}>
                            <div style={styles.sectionHeader}>
                                <h3 style={styles.sectionTitle}>
                                    <FileQuestion size={18} color="var(--primary)" />
                                    Practice Time!
                                    <span style={styles.countBadge}>{todayDpps.filter(d => !d.isCompleted).length}</span>
                                </h3>
                            </div>
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: -6 }}>
                                You've completed lectures — now solve your DPPs!
                            </p>
                            <div style={styles.dppGrid}>
                                {todayDpps.map((dpp) => (
                                    <button
                                        key={dpp.dppId}
                                        style={{ ...styles.dppCard, opacity: dpp.isCompleted ? 0.7 : 1 }}
                                        onClick={() => navigate(`/dpp/${dpp.dppId}`)}
                                    >
                                        <div style={styles.dppCardIcon}>
                                            {dpp.isCompleted
                                                ? <CheckCircle2 size={20} color="#22C55E" />
                                                : <FileQuestion size={20} color="#6366F1" />
                                            }
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                                            <div style={styles.dppCardSubject}>{dpp.subject}</div>
                                            <h4 style={styles.dppCardTitle}>{dpp.dppInfo.title}</h4>
                                            <span style={styles.dppCardMeta}>
                                                {dpp.dppInfo.questions?.length || 10} Qs • {(dpp.dppInfo.questions?.length || 10) * 4} Marks
                                                {dpp.isCompleted && <span style={{ color: '#22C55E', marginLeft: 8 }}>✓ Completed</span>}
                                            </span>
                                        </div>
                                        <div style={styles.dppCardAction}>
                                            {dpp.isCompleted
                                                ? <CheckCircle2 size={20} color="#22C55E" />
                                                : <ArrowRightCircle size={20} color="#6366F1" />
                                            }
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Right: Calendar */}
                <div style={styles.rightCol}>
                    <CalendarWidget />
                </div>
            </div>

            {/* ── Backlog Carousel ── */}
            {filteredBacklog.length > 0 && (
                <section style={styles.section}>
                    <div style={styles.sectionHeader}>
                        <h3 style={styles.sectionTitle}>
                            Pending Tasks
                            <span style={styles.countBadge}>{filteredBacklog.length}</span>
                        </h3>
                    </div>
                    <HorizontalScroll>
                        {filteredBacklog.map((day) => (
                            <BacklogCard key={day.id} day={day} progressMap={progressMap} />
                        ))}
                    </HorizontalScroll>
                </section>
            )}
        </div>
    );
}

/* ──────── Sub-Components ──────── */

function StatCard({ icon, value, label, color }) {
    return (
        <div style={styles.statCard}>
            <div style={{ ...styles.statIcon, color }}>{icon}</div>
            <span style={styles.statValue}>{value}</span>
            <span style={styles.statLabel}>{label}</span>
        </div>
    );
}

function BacklogCard({ day, progressMap }) {
    const navigate = useNavigate();
    const dayLabel = format(parseISO(day.date), 'EEE, MMM d');
    const isGap = isGapDay(day.dayType);

    const handleReviewClick = () => {
        navigate(`/calendar?date=${day.date}`);
    };

    return (
        <div style={{ ...styles.backlogCard, cursor: 'pointer' }} onClick={handleReviewClick}>
            <div style={styles.backlogHead}>
                <span style={styles.backlogDate}>{dayLabel}</span>
                <span style={styles.backlogType}>{DAY_LABELS[day.dayType] ?? day.dayType}</span>
            </div>
            <div style={styles.backlogBody}>
                {isGap ? (
                    <p style={styles.backlogGap}>
                        {day.dayType === 'CHAPTER_EXAM' ? '📝 Chapter Exam' : '📚 Gap Practice & Self Study'}
                    </p>
                ) : (
                    day.subjects.map((s, i) => {
                        const isVideoPending = !progressMap[s.videoId]?.completed;
                        const dppId = s.resourceLinks?.dpp;
                        const isDppPending = dppId && !localStorage.getItem(`dpp_completed_${dppId}`);

                        const handleItemClick = (e) => {
                            e.stopPropagation();
                            if (s.type === 'TEST') {
                                const examId = `exam_${s.chapterName?.replace(/\s+/g, '') || 'unknown'}`;
                                navigate(`/exam/${examId}`, { state: { examData: s } });
                            } else if (isVideoPending && s.videoId) {
                                navigate(`/watch/${s.videoId}`);
                            } else if (isDppPending) {
                                navigate(`/dpp/${dppId}`);
                            }
                        };

                        return (
                            <div
                                key={i}
                                style={{ ...styles.backlogRow, alignItems: 'center', cursor: 'pointer' }}
                                onClick={handleItemClick}
                                title={isVideoPending ? "Watch this class" : "Solve this DPP"}
                            >
                                <span style={{ ...styles.dot, background: `var(--${s.subject.toLowerCase()})` }} />
                                <div style={{ minWidth: 0, flex: 1 }}>
                                    <p style={styles.backlogSubj}>
                                        {s.subject} {s.type === 'TEST' ? '(Test)' : ''}
                                        {!isVideoPending && isDppPending && <span style={{ color: '#6366F1', marginLeft: 4, fontWeight: 'bold' }}>[DPP]</span>}
                                    </p>
                                    <p style={styles.backlogTopic}>{s.topic}</p>
                                </div>
                                <div style={{ background: 'var(--primary-muted)', padding: '6px', borderRadius: '50%', display: 'flex' }}>
                                    {isVideoPending || s.type === 'TEST' ? <PlayCircle size={14} color="var(--primary)" /> : <FileQuestion size={14} color="var(--primary)" />}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
            <div style={styles.backlogFoot}>
                <span style={styles.reviewLink}>View Full Day <ChevronRight size={14} /></span>
            </div>
        </div>
    );
}

function getGreeting() {
    const h = new Date().getHours();
    if (h < 12) return 'Good Morning,';
    if (h < 17) return 'Good Afternoon,';
    return 'Good Evening,';
}

/* ──────── Styles ──────── */

const styles = {
    page: {
        padding: '24px 28px 40px',
        display: 'flex',
        flexDirection: 'column',
        gap: 24,
        maxWidth: 1200,
        margin: '0 auto',
    },

    /* Welcome Banner */
    welcomeBanner: {
        padding: '32px 36px',
        borderRadius: '16px',
        background: '#7c5cfa',
        color: '#fff',
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
    },
    welcomeTop: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    pairBtn: {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 14px',
        borderRadius: 'var(--radius-md)',
        background: 'rgba(255, 255, 255, 0.15)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        color: '#fff',
        fontSize: '0.82rem',
        fontWeight: 600,
        cursor: 'pointer',
        transition: 'all var(--transition-fast)',
        backdropFilter: 'blur(10px)',
    },
    welcomeTitle: {
        fontSize: '1.4rem',
        fontWeight: 800,
    },
    welcomeSub: {
        fontSize: '0.88rem',
        opacity: 0.85,
        marginTop: 2,
    },

    /* Notification Banner */
    notificationBanner: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 20px',
        borderRadius: '12px',
        background: '#fff',
        borderLeft: '4px solid var(--primary)',
        boxShadow: '0 4px 14px rgba(0,0,0,0.03)',
    },
    notifInfo: {
        display: 'flex',
        alignItems: 'center',
        gap: 14,
    },
    notifIcon: {
        width: 38,
        height: 38,
        borderRadius: '50%',
        background: 'var(--primary-muted)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    notifTitle: {
        fontSize: '0.95rem',
        fontWeight: 700,
        color: 'var(--text-main)',
    },
    notifSub: {
        fontSize: '0.82rem',
        color: 'var(--text-muted)',
        marginTop: 2,
    },
    notifActions: {
        display: 'flex',
        alignItems: 'center',
        gap: 12,
    },
    telegramBtn: {
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '8px 16px',
        borderRadius: 'var(--radius-sm)',
        background: '#229ED9',
        color: '#fff',
        fontWeight: 600,
        fontSize: '0.85rem',
        textDecoration: 'none',
        transition: 'background var(--transition-fast)',
    },
    notifBtn: {
        padding: '8px 16px',
        borderRadius: 'var(--radius-sm)',
        background: 'var(--primary)',
        color: '#fff',
        fontWeight: 600,
        fontSize: '0.85rem',
        border: 'none',
        cursor: 'pointer',
        transition: 'background var(--transition-fast)',
    },

    /* Stats */
    statsRow: {
        display: 'grid',
        gridTemplateColumns: 'repeat(5, 1fr)',
        gap: 14,
    },
    statCard: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        padding: '20px 10px',
        borderRadius: '12px',
        background: '#fff',
        boxShadow: '0 4px 14px rgba(0,0,0,0.03)',
    },
    statIcon: {
        marginBottom: 2,
    },
    statValue: {
        fontSize: '1.5rem',
        fontWeight: 800,
        color: 'var(--text-main)',
    },
    statLabel: {
        fontSize: '0.7rem',
        fontWeight: 600,
        color: 'var(--text-muted)',
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
        textAlign: 'center',
    },

    /* Content Grid */
    contentGrid: {
        display: 'grid',
        gridTemplateColumns: '1fr 320px',
        gap: 24,
        alignItems: 'start',
    },
    leftCol: {
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
    },
    rightCol: {
        position: 'sticky',
        top: 24,
    },

    /* Sections */
    section: {
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
    },
    sectionHeader: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    sectionTitle: {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        fontSize: '1.05rem',
        fontWeight: 700,
        color: 'var(--text-main)',
    },
    dayBadge: {
        fontSize: '0.72rem',
        fontWeight: 600,
        padding: '4px 12px',
        borderRadius: 'var(--radius-full)',
        background: 'var(--primary-muted)',
        color: 'var(--primary)',
    },
    countBadge: {
        fontSize: '0.68rem',
        fontWeight: 700,
        padding: '2px 8px',
        borderRadius: 'var(--radius-full)',
        background: 'var(--error-muted)',
        color: 'var(--error)',
        marginLeft: 2,
    },

    /* Card grid */
    cardGrid: {
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
    },

    /* Empty */
    emptyCard: {
        padding: '28px 20px',
        borderRadius: 'var(--radius-card)',
        background: 'var(--bg-card)',
        border: '1px solid var(--border-light)',
        textAlign: 'center',
        boxShadow: 'var(--shadow-sm)',
    },
    emptyText: {
        color: 'var(--text-muted)',
        fontSize: '0.88rem',
        lineHeight: 1.6,
    },

    /* Backlog cards */
    backlogCard: {
        flex: '0 0 260px',
        scrollSnapAlign: 'start',
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 'var(--radius-card)',
        background: 'var(--bg-card)',
        border: '1px solid var(--border-light)',
        boxShadow: 'var(--shadow-sm)',
        overflow: 'hidden',
    },
    backlogHead: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 14px',
        borderBottom: '1px solid var(--border-light)',
    },
    backlogDate: {
        fontSize: '0.82rem',
        fontWeight: 700,
        color: 'var(--text-main)',
    },
    backlogType: {
        fontSize: '0.65rem',
        fontWeight: 600,
        padding: '2px 8px',
        borderRadius: 'var(--radius-full)',
        background: 'var(--primary-muted)',
        color: 'var(--primary)',
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
    },
    backlogBody: {
        padding: '12px 14px',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        flex: 1,
    },
    backlogRow: {
        display: 'flex',
        alignItems: 'flex-start',
        gap: 8,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: '50%',
        marginTop: 4,
        flexShrink: 0,
    },
    backlogSubj: {
        fontSize: '0.78rem',
        fontWeight: 700,
        color: 'var(--text-main)',
    },
    backlogTopic: {
        fontSize: '0.7rem',
        color: 'var(--text-muted)',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        maxWidth: 180,
    },
    backlogGap: {
        fontSize: '0.88rem',
        fontWeight: 600,
        color: 'var(--text-secondary)',
        textAlign: 'center',
        padding: '12px 0',
    },
    backlogFoot: {
        padding: '8px 14px',
        borderTop: '1px solid var(--border-light)',
        display: 'flex',
        justifyContent: 'flex-end',
    },
    reviewLink: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 2,
        fontSize: '0.75rem',
        fontWeight: 600,
        color: 'var(--primary)',
        cursor: 'pointer',
    },

    /* DPP Section */
    dppGrid: {
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
    },
    dppCard: {
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '14px 18px',
        borderRadius: '12px',
        background: '#fff',
        border: '1px solid var(--border-light)',
        boxShadow: '0 2px 8px rgba(99, 102, 241, 0.06)',
        cursor: 'pointer',
        transition: 'transform var(--transition-fast), box-shadow var(--transition-fast)',
        width: '100%',
        fontFamily: 'inherit',
        textDecoration: 'none',
        textAlign: 'left',
    },
    dppCardIcon: {
        width: 42,
        height: 42,
        borderRadius: 10,
        background: 'var(--primary-muted)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
    },
    dppCardSubject: {
        fontSize: '0.68rem',
        fontWeight: 700,
        color: 'var(--primary)',
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
    },
    dppCardTitle: {
        fontSize: '0.92rem',
        fontWeight: 700,
        color: 'var(--text-main)',
        lineHeight: 1.3,
        margin: '2px 0',
    },
    dppCardMeta: {
        fontSize: '0.72rem',
        fontWeight: 600,
        color: 'var(--text-muted)',
    },
    dppCardAction: {
        flexShrink: 0,
    },
};
