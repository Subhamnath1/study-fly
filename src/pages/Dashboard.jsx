/**
 * @fileoverview Dashboard — Premium study command center.
 *
 * Features:
 *  - Animated gradient welcome banner with AI chat
 *  - Real-time streak counter from progress data
 *  - Animated SVG daily progress ring
 *  - Dynamic stats (hours, score, streak)
 *  - Subject-wise progress bars
 *  - Next class countdown timer
 *  - Motivational quote (daily rotation)
 *  - Weekly achievement card
 *  - Glassmorphic stat/backlog cards
 *  - Upgraded backlog carousel
 */

import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '@context/AuthContext';
import { useSchedule } from '@hooks/useSchedule';
import { useProgress } from '@hooks/useProgress';
import { useNotifications } from '@hooks/useNotifications';
import { format, parseISO, differenceInDays } from 'date-fns';
import {
    ChevronRight, Flame, Target, Clock, BookOpen, Award, BellRing, Send,
    Smartphone, PlayCircle, FileQuestion, ArrowRightCircle, CheckCircle2,
    TrendingUp, Trophy, Zap, Quote, Timer
} from 'lucide-react';
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
    HOLIDAY: 'Vacation / Holiday',
};

const MOTIVATIONAL_QUOTES = [
    { text: "The expert in anything was once a beginner.", author: "Helen Hayes" },
    { text: "Success is the sum of small efforts repeated day in and day out.", author: "Robert Collier" },
    { text: "Don't watch the clock; do what it does. Keep going.", author: "Sam Levenson" },
    { text: "Education is the passport to the future.", author: "Malcolm X" },
    { text: "The beautiful thing about learning is that no one can take it away from you.", author: "B.B. King" },
    { text: "It does not matter how slowly you go as long as you do not stop.", author: "Confucius" },
    { text: "Push yourself, because no one else is going to do it for you.", author: "Unknown" },
    { text: "Great things never come from comfort zones.", author: "Unknown" },
    { text: "Dream big. Start small. Act now.", author: "Robin Sharma" },
    { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
    { text: "Believe you can and you're halfway there.", author: "Theodore Roosevelt" },
    { text: "Your limitation—it's only your imagination.", author: "Unknown" },
];

/* ---------------------------------------------------------------- */

export default function Dashboard() {
    const navigate = useNavigate();
    const { user } = useAuthContext();
    const { current, backlog, upcoming, schedule, loading } = useSchedule();
    const { progressMap } = useProgress();
    const { permissionStatus, requestPermission } = useNotifications();
    const [activeTab, setActiveTab] = useState('all');
    const [isPairingOpen, setIsPairingOpen] = useState(false);

    /* ── Greeting ── */
    const greeting = useMemo(() => {
        const h = new Date().getHours();
        if (h < 5) return '🌙 Late night study,';
        if (h < 12) return '☀️ Good Morning,';
        if (h < 17) return '🌤️ Good Afternoon,';
        if (h < 21) return '🌅 Good Evening,';
        return '🌙 Good Night,';
    }, []);

    /* ── Real Streak ── */
    const streak = useMemo(() => {
        if (!schedule || Object.keys(progressMap).length === 0) return 0;
        const todayStr = format(new Date(), 'yyyy-MM-dd');
        let count = 0;
        const sortedDays = [...schedule]
            .filter(d => d.date <= todayStr && d.subjects?.length > 0
                && d.dayType !== 'BACKLOG_CLEARANCE'
                && d.dayType !== 'HOLIDAY'
                && d.dayType !== 'WEEKLY_TEST'
                && d.dayType !== 'CHAPTER_EXAM')
            .sort((a, b) => b.date.localeCompare(a.date));

        for (const day of sortedDays) {
            const hasCompletion = day.subjects.some(s => {
                const id = s.videoId || `test_${s.chapterName?.replace(/\s+/g, '')}_${s.topic?.replace(/\s+/g, '')}`;
                return progressMap[id]?.completed;
            });
            if (hasCompletion) count++;
            else break;
        }
        return count;
    }, [schedule, progressMap]);

    /* ── Dynamic Hours ── */
    const totalHours = useMemo(() => {
        let totalMinutes = 0;
        Object.entries(progressMap).forEach(([, val]) => {
            if (val?.completed && val?.timestamp) {
                totalMinutes += Math.round(val.timestamp / 60);
            }
        });
        return Math.round(totalMinutes / 60);
    }, [progressMap]);

    /* ── Total Completed (all time) ── */
    const totalCompleted = useMemo(() => {
        return Object.values(progressMap).filter(v => v?.completed).length;
    }, [progressMap]);

    /* ── Today progress ── */
    const todayTotal = current?.subjects?.length ?? 0;
    const todayDone = useMemo(() => {
        if (!current) return 0;
        return current.subjects.filter((s) => {
            const id = s.videoId || `test_${s.chapterName?.replace(/\s+/g, '')}_${s.topic?.replace(/\s+/g, '')}`;
            return progressMap[id]?.completed;
        }).length;
    }, [current, progressMap]);
    const todayProgress = todayTotal > 0 ? (todayDone / todayTotal) * 100 : 0;

    /* ── Next Class Countdown ── */
    const [countdown, setCountdown] = useState(null);
    useEffect(() => {
        if (!current) return;
        const tick = () => {
            const now = new Date();
            let nextClass = null;
            for (const subj of current.subjects) {
                if (!subj.unlockTime) continue;
                const [time, ampm] = subj.unlockTime.split(' ');
                const [hStr, mStr] = time.split(':');
                let h = parseInt(hStr);
                const m = parseInt(mStr);
                if (ampm?.toUpperCase() === 'PM' && h !== 12) h += 12;
                if (ampm?.toUpperCase() === 'AM' && h === 12) h = 0;
                const unlock = new Date(now);
                unlock.setHours(h, m, 0, 0);
                if (unlock > now && (!nextClass || unlock < nextClass.time)) {
                    nextClass = { time: unlock, subject: subj.subject, topic: subj.topic };
                }
            }
            if (nextClass) {
                const diff = Math.floor((nextClass.time - now) / 1000);
                const hrs = Math.floor(diff / 3600);
                const mins = Math.floor((diff % 3600) / 60);
                const secs = diff % 60;
                setCountdown({
                    subject: nextClass.subject,
                    topic: nextClass.topic,
                    hrs, mins, secs,
                    label: `${hrs > 0 ? hrs + 'h ' : ''}${mins}m ${secs}s`
                });
            } else {
                setCountdown(null);
            }
        };
        tick();
        const iv = setInterval(tick, 1000);
        return () => clearInterval(iv);
    }, [current]);

    /* ── Weekly Achievement ── */
    const weeklyCompleted = useMemo(() => {
        const now = new Date();
        const weekAgo = new Date(now);
        weekAgo.setDate(weekAgo.getDate() - 7);
        const weekAgoStr = format(weekAgo, 'yyyy-MM-dd');
        let count = 0;
        if (schedule) {
            schedule.forEach(day => {
                if (day.date < weekAgoStr) return;
                day.subjects?.forEach(s => {
                    const id = s.videoId || `test_${s.chapterName?.replace(/\s+/g, '')}_${s.topic?.replace(/\s+/g, '')}`;
                    if (progressMap[id]?.completed) count++;
                });
            });
        }
        return count;
    }, [schedule, progressMap]);

    /* ── Avg Score ── */
    const avgScore = useMemo(() => {
        let scores = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key?.endsWith('_submitted') && localStorage.getItem(key) === 'true') {
                const examId = key.replace('_submitted', '');
                try {
                    const omr = JSON.parse(localStorage.getItem(`${examId}_omr`) || '{}');
                    if (omr.score !== undefined && omr.maxScore) {
                        scores.push((omr.score / omr.maxScore) * 100);
                    }
                } catch { /* skip */ }
            }
        }
        return scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
    }, []);

    /* ── Motivational Quote ── */
    const dailyQuote = useMemo(() => {
        const dayOfYear = Math.floor((new Date() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
        return MOTIVATIONAL_QUOTES[dayOfYear % MOTIVATIONAL_QUOTES.length];
    }, []);

    /* ── Filtered Backlog ── */
    const filteredBacklog = useMemo(() => {
        return backlog.reduce((acc, day) => {
            if (day.dayType === 'BACKLOG_CLEARANCE' || day.dayType === 'HOLIDAY') return acc;
            if (isGapDay(day.dayType)) { acc.push(day); return acc; }

            const pendingSubjects = day.subjects.filter((s) => {
                if (s.type === 'TEST' || day.dayType === 'WEEKLY_TEST' || day.dayType === 'CHAPTER_EXAM') return false;
                const itemId = s.videoId || `test_${s.chapterName?.replace(/\s+/g, '')}_${s.topic?.replace(/\s+/g, '')}`;
                const isVideoPending = !progressMap[itemId]?.completed;
                const dppId = s.resourceLinks?.dpp;
                const isDppPending = dppId && !localStorage.getItem(`dpp_completed_${dppId}`);
                return isVideoPending || isDppPending;
            });

            if (pendingSubjects.length > 0) acc.push({ ...day, subjects: pendingSubjects });
            return acc;
        }, []);
    }, [backlog, progressMap]);

    /* ── Today's DPPs ── */
    const todayDpps = useMemo(() => {
        if (!current) return [];
        const dpps = [];
        current.subjects.forEach((subj) => {
            const dppKey = subj.resourceLinks?.dpp;
            if (!dppKey || !dppsData[dppKey]) return;
            const isLectureCompleted = !!progressMap[subj.videoId]?.completed;
            if (!isLectureCompleted) return;
            const isDppCompleted = !!localStorage.getItem(`dpp_completed_${dppKey}`);
            dpps.push({ dppId: dppKey, dppInfo: dppsData[dppKey], subject: subj.subject, chapter: subj.chapterName, topic: subj.topic, isCompleted: isDppCompleted });
        });
        return dpps;
    }, [current, progressMap]);

    const filteredSubjects = useMemo(() => {
        if (!current) return [];
        if (activeTab === 'all') return current.subjects;
        return current.subjects.filter((s) => s.subject === activeTab);
    }, [current, activeTab]);

    const getStatus = (subj) => {
        if (progressMap[subj.videoId]?.completed) return 'completed';
        return undefined;
    };

    if (loading) {
        return (
            <div className="loader-container">
                <div className="spinner" />
                <span className="loader-text">Loading your command center…</span>
            </div>
        );
    }

    return (
        <div style={styles.page}>
            {/* ── Welcome Banner ── */}
            <div style={styles.welcomeBanner} className="dashboard-welcome">
                <div style={styles.welcomeTop}>
                    <div>
                        <h2 style={styles.welcomeTitle}>{greeting} {user?.name?.split(' ')[0] ?? 'Student'}!</h2>
                        <p style={styles.welcomeSub}>
                            {todayDone === todayTotal && todayTotal > 0
                                ? "🎉 You've crushed all today's classes!"
                                : todayTotal > 0
                                    ? `${todayTotal - todayDone} classes remaining today. Let's go!`
                                    : "No classes scheduled for today. Take a break! 🧘"
                            }
                        </p>
                    </div>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                        {streak >= 3 && (
                            <div style={styles.streakBadge} className="dashboard-streak-pulse">
                                <Flame size={16} /> {streak} Day Streak!
                            </div>
                        )}
                        <button style={styles.pairBtn} onClick={() => setIsPairingOpen(true)} title="Link another device">
                            <Smartphone size={16} />
                        </button>
                    </div>
                </div>
                <AiChatBar />
            </div>

            {/* ── Motivational Quote ── */}
            <div style={styles.quoteBar} className="dashboard-quote-enter">
                <Quote size={16} color="var(--primary)" style={{ flexShrink: 0, opacity: 0.6 }} />
                <span style={styles.quoteText}>"{dailyQuote.text}"</span>
                <span style={styles.quoteAuthor}>— {dailyQuote.author}</span>
            </div>

            {/* ── Continue Watching Card ── */}
            <ContinueWatchingCard schedule={schedule} progressMap={progressMap} />

            {/* ── Notification Banner ── */}
            {permissionStatus === 'default' && (
                <div style={styles.notificationBanner}>
                    <div style={styles.notifInfo}>
                        <div style={styles.notifIcon}><BellRing size={20} color="var(--primary)" /></div>
                        <div>
                            <h4 style={styles.notifTitle}>Never Miss a Class!</h4>
                            <p style={styles.notifSub}>Get notified with direct video links exactly when your lectures unlock.</p>
                        </div>
                    </div>
                    <div style={styles.notifActions}>
                        <a href="https://t.me/Notification_123_study_bot?start=subscribe" target="_blank" rel="noreferrer" style={styles.telegramBtn}>
                            <Send size={16} /> Telegram
                        </a>
                        <button style={styles.notifBtn} onClick={requestPermission}>Browser Push</button>
                    </div>
                </div>
            )}

            {/* ── Stats + Progress Ring Row ── */}
            <div style={styles.statsSection}>
                <div style={styles.statsRow}>
                    <StatCard icon={<Flame size={20} />} value={streak} label="Day Streak" color="#F97316" bg="rgba(249,115,22,0.08)" />
                    <StatCard icon={<Clock size={20} />} value={`${totalHours}h`} label="Hours Learned" color="#3B82F6" bg="rgba(59,130,246,0.08)" />
                    <StatCard icon={<BookOpen size={20} />} value={totalCompleted} label="Lectures Done" color="#10B981" bg="rgba(16,185,129,0.08)" />
                    <StatCard icon={<Award size={20} />} value={avgScore !== null ? `${avgScore}%` : '—'} label="Avg Score" color="#EF4444" bg="rgba(239,68,68,0.08)" />
                </div>
                <DailyProgressRing done={todayDone} total={todayTotal} />
            </div>

            {/* ── Next Class Countdown ── */}
            {countdown && (
                <div style={styles.countdownBar} className="dashboard-countdown-enter">
                    <div style={styles.countdownLeft}>
                        <div style={styles.countdownIcon}><Timer size={18} color="#fff" /></div>
                        <div>
                            <span style={styles.countdownSubject}>🔓 {countdown.subject}</span>
                            <span style={styles.countdownTopic}>{countdown.topic}</span>
                        </div>
                    </div>
                    <div style={styles.countdownTimer}>
                        {countdown.hrs > 0 && <div style={styles.timeBlock}><span style={styles.timeNum}>{String(countdown.hrs).padStart(2, '0')}</span><span style={styles.timeLabel}>hr</span></div>}
                        <div style={styles.timeBlock}><span style={styles.timeNum}>{String(countdown.mins).padStart(2, '0')}</span><span style={styles.timeLabel}>min</span></div>
                        <div style={styles.timeBlock}><span style={styles.timeNum}>{String(countdown.secs).padStart(2, '0')}</span><span style={styles.timeLabel}>sec</span></div>
                    </div>
                </div>
            )}

            <QrPairingModal isOpen={isPairingOpen} onClose={() => setIsPairingOpen(false)} />

            {/* ── Main Content Grid ── */}
            <div style={styles.contentGrid}>
                {/* Left: Today's Schedule */}
                <div style={styles.leftCol}>
                    {/* Section Header with Subject Progress */}
                    <div style={styles.sectionHeader}>
                        <h3 style={styles.sectionTitle}>My Subjects</h3>
                        {current && <span style={styles.dayBadge}>{DAY_LABELS[current.dayType] ?? current.dayType}</span>}
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

                    {/* DPPs Section */}
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
                                        className="course-card-hover"
                                    >
                                        <div style={styles.dppCardIcon}>
                                            {dpp.isCompleted ? <CheckCircle2 size={20} color="#22C55E" /> : <FileQuestion size={20} color="#6366F1" />}
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                                            <div style={styles.dppCardSubject}>{dpp.subject}</div>
                                            <h4 style={styles.dppCardTitle}>{dpp.dppInfo.title}</h4>
                                            <span style={styles.dppCardMeta}>
                                                {dpp.dppInfo.questions?.length || 10} Qs • {(dpp.dppInfo.questions?.length || 10) * 4} Marks
                                                {dpp.isCompleted && <span style={{ color: '#22C55E', marginLeft: 8 }}>✓ Done</span>}
                                            </span>
                                        </div>
                                        <div style={styles.dppCardAction}>
                                            {dpp.isCompleted ? <CheckCircle2 size={20} color="#22C55E" /> : <ArrowRightCircle size={20} color="#6366F1" />}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Right: Calendar + Weekly Achievement */}
                <div style={styles.rightCol}>
                    <CalendarWidget />
                    {/* Weekly Achievement */}
                    <div style={styles.achievementCard} className="dashboard-achievement-enter">
                        <div style={styles.achievementIcon}>
                            <Trophy size={24} color="#F59E0B" />
                        </div>
                        <div style={styles.achievementInfo}>
                            <span style={styles.achievementLabel}>This Week</span>
                            <span style={styles.achievementValue}>{weeklyCompleted} lectures completed</span>
                        </div>
                        {weeklyCompleted >= 10 && <Zap size={20} color="#F59E0B" style={{ flexShrink: 0 }} />}
                    </div>
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

function StatCard({ icon, value, label, color, bg }) {
    return (
        <div style={styles.statCard} className="dashboard-stat-enter course-card-hover">
            <div style={{ ...styles.statIconWrap, background: bg, color }}>{icon}</div>
            <span style={styles.statValue}>{value}</span>
            <span style={styles.statLabel}>{label}</span>
        </div>
    );
}

function DailyProgressRing({ done, total }) {
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;
    const radius = 52;
    const stroke = 8;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (pct / 100) * circumference;

    return (
        <div style={styles.ringCard} className="dashboard-stat-enter">
            <svg width={130} height={130} viewBox="0 0 130 130" style={{ transform: 'rotate(-90deg)' }}>
                <circle cx="65" cy="65" r={radius} fill="none" stroke="var(--border-light)" strokeWidth={stroke} />
                <circle
                    cx="65" cy="65" r={radius} fill="none"
                    stroke="url(#ringGrad)" strokeWidth={stroke}
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    className="dashboard-ring-animate"
                />
                <defs>
                    <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#7C3AED" />
                        <stop offset="100%" stopColor="#3B82F6" />
                    </linearGradient>
                </defs>
            </svg>
            <div style={styles.ringCenter}>
                <span style={styles.ringPct}>{pct}%</span>
                <span style={styles.ringLabel}>Today</span>
            </div>
            <div style={styles.ringMeta}>
                <span style={styles.ringDone}>{done}/{total}</span>
                <span style={styles.ringSubLabel}>classes done</span>
            </div>
        </div>
    );
}

function BacklogCard({ day, progressMap }) {
    const navigate = useNavigate();
    const dayLabel = format(parseISO(day.date), 'EEE, MMM d');
    const isGap = isGapDay(day.dayType);
    const accent = day.dayType === 'GAP_PRACTICE' ? '#F59E0B' : day.dayType === 'CHAPTER_EXAM' ? '#EF4444' : 'var(--primary)';

    return (
        <div
            style={{ ...styles.backlogCard, borderTop: `3px solid ${accent}` }}
            className="course-card-hover"
            onClick={() => navigate(`/calendar?date=${day.date}`)}
        >
            <div style={styles.backlogHead}>
                <span style={styles.backlogDate}>{dayLabel}</span>
                <span style={{ ...styles.backlogType, background: accent + '15', color: accent }}>
                    {DAY_LABELS[day.dayType] ?? day.dayType}
                </span>
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
                        const subjectColor = s.subject === 'Physics' ? '#3B82F6' : s.subject === 'Math' ? '#EF4444' : '#10B981';

                        return (
                            <div
                                key={i}
                                style={{ ...styles.backlogRow, cursor: 'pointer' }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (isVideoPending && s.videoId) navigate(`/watch/${s.videoId}`);
                                    else if (isDppPending) navigate(`/dpp/${dppId}`);
                                }}
                            >
                                <span style={{ ...styles.dot, background: subjectColor }} />
                                <div style={{ minWidth: 0, flex: 1 }}>
                                    <p style={styles.backlogSubj}>
                                        {s.subject}
                                        {!isVideoPending && isDppPending && <span style={{ color: '#6366F1', marginLeft: 4, fontWeight: 'bold' }}>[DPP]</span>}
                                    </p>
                                    <p style={styles.backlogTopic}>{s.topic}</p>
                                </div>
                                <div style={{ background: subjectColor + '15', padding: '6px', borderRadius: '50%', display: 'flex' }}>
                                    {isVideoPending ? <PlayCircle size={14} color={subjectColor} /> : <FileQuestion size={14} color="#6366F1" />}
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
/* ── Continue Watching Card ── */
function ContinueWatchingCard({ schedule, progressMap }) {
    const navigate = useNavigate();

    // Find the most recently watched incomplete video
    const resumeVideo = useMemo(() => {
        let best = null;
        for (const [videoId, prog] of Object.entries(progressMap)) {
            if (prog.completed) continue;
            if (!prog.timestamp || prog.timestamp < 60) continue;
            if (!best || (prog.lastWatched && prog.lastWatched > (best.prog.lastWatched || ''))) {
                // Find the lecture data for this videoId
                let lectureInfo = null;
                for (const day of schedule) {
                    for (const subj of day.subjects) {
                        if (subj.videoId === videoId) {
                            lectureInfo = { ...subj, date: day.date };
                            break;
                        }
                    }
                    if (lectureInfo) break;
                }
                if (lectureInfo) {
                    best = { videoId, prog, lecture: lectureInfo };
                }
            }
        }
        return best;
    }, [schedule, progressMap]);

    if (!resumeVideo) return null;

    const { videoId, prog, lecture } = resumeVideo;
    const pct = prog.percentWatched || (prog.videoDuration > 0 ? Math.round((prog.timestamp / prog.videoDuration) * 100) : 0);

    const formatTs = (s) => {
        if (!s) return '0:00';
        const h = Math.floor(s / 3600);
        const m = Math.floor((s % 3600) / 60);
        const sec = s % 60;
        const mm = String(m).padStart(2, '0');
        const ss = String(sec).padStart(2, '0');
        return h > 0 ? `${h}:${mm}:${ss}` : `${m}:${ss}`;
    };

    const SUBJ_COLORS = { Physics: '#3B82F6', Math: '#EF4444', Chemistry: '#10B981' };
    const accentColor = SUBJ_COLORS[lecture.subject] || '#6366F1';

    return (
        <div
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                padding: '14px 20px',
                borderRadius: 14,
                background: 'var(--bg-card)',
                border: '1px solid var(--border-light)',
                borderLeft: `4px solid ${accentColor}`,
                boxShadow: '0 4px 14px rgba(0,0,0,0.03)',
                cursor: 'pointer',
                transition: 'transform 0.15s ease, box-shadow 0.15s ease',
            }}
            className="course-card-hover"
            onClick={() => navigate(`/watch/${videoId}`)}
        >
            <div style={{
                width: 44, height: 44, borderRadius: 12,
                background: accentColor + '15',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
            }}>
                <PlayCircle size={22} color={accentColor} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: accentColor, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Continue Watching — {lecture.subject}
                </div>
                <h4 style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-main)', lineHeight: 1.3, marginTop: 2 }}>
                    {lecture.chapterName} • {lecture.topic}
                </h4>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                        Left off at {formatTs(prog.timestamp)}
                    </span>
                    {pct > 0 && (
                        <span style={{
                            fontSize: '0.65rem', fontWeight: 700,
                            color: 'var(--primary)', background: 'var(--primary-muted)',
                            padding: '2px 8px', borderRadius: 'var(--radius-full)',
                        }}>
                            {pct}%
                        </span>
                    )}
                </div>
            </div>
            <ChevronRight size={18} color="var(--text-muted)" style={{ flexShrink: 0 }} />
        </div>
    );
}

/* ──────── Styles ──────── */

const styles = {
    page: {
        padding: '24px 28px 40px',
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
        maxWidth: 1200,
        margin: '0 auto',
    },

    /* Welcome Banner */
    welcomeBanner: {
        padding: '28px 32px',
        borderRadius: '20px',
        background: 'linear-gradient(135deg, #7c5cfa 0%, #6366F1 40%, #4F46E5 100%)',
        color: '#fff',
        display: 'flex',
        flexDirection: 'column',
        gap: 18,
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 8px 32px rgba(99, 102, 241, 0.3)',
    },
    welcomeTop: {
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
    },
    welcomeTitle: {
        fontSize: '1.5rem',
        fontWeight: 800,
        letterSpacing: '-0.01em',
    },
    welcomeSub: {
        fontSize: '0.88rem',
        opacity: 0.85,
        marginTop: 4,
    },
    streakBadge: {
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '6px 14px',
        borderRadius: 'var(--radius-full)',
        background: 'rgba(249, 115, 22, 0.2)',
        border: '1px solid rgba(249, 115, 22, 0.4)',
        color: '#FED7AA',
        fontSize: '0.78rem',
        fontWeight: 700,
        whiteSpace: 'nowrap',
    },
    pairBtn: {
        width: 38,
        height: 38,
        borderRadius: '12px',
        background: 'rgba(255, 255, 255, 0.15)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        transition: 'all var(--transition-fast)',
        backdropFilter: 'blur(10px)',
    },

    /* Quote Bar */
    quoteBar: {
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '12px 20px',
        borderRadius: '12px',
        background: 'var(--bg-card)',
        border: '1px solid var(--border-light)',
        boxShadow: 'var(--shadow-sm)',
    },
    quoteText: {
        fontSize: '0.82rem',
        fontWeight: 500,
        color: 'var(--text-secondary)',
        fontStyle: 'italic',
        flex: 1,
    },
    quoteAuthor: {
        fontSize: '0.72rem',
        fontWeight: 600,
        color: 'var(--text-muted)',
        whiteSpace: 'nowrap',
    },

    /* Notification Banner */
    notificationBanner: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '14px 20px',
        borderRadius: '14px',
        background: '#fff',
        borderLeft: '4px solid var(--primary)',
        boxShadow: '0 4px 14px rgba(0,0,0,0.03)',
    },
    notifInfo: { display: 'flex', alignItems: 'center', gap: 14 },
    notifIcon: { width: 38, height: 38, borderRadius: '50%', background: 'var(--primary-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
    notifTitle: { fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-main)' },
    notifSub: { fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 },
    notifActions: { display: 'flex', alignItems: 'center', gap: 10 },
    telegramBtn: { display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 'var(--radius-full)', background: '#229ED9', color: '#fff', fontWeight: 600, fontSize: '0.8rem', textDecoration: 'none' },
    notifBtn: { padding: '8px 14px', borderRadius: 'var(--radius-full)', background: 'var(--primary)', color: '#fff', fontWeight: 600, fontSize: '0.8rem', border: 'none', cursor: 'pointer' },

    /* Stats Section */
    statsSection: {
        display: 'flex',
        gap: 18,
        alignItems: 'stretch',
    },
    statsRow: {
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 14,
        flex: 1,
    },
    statCard: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        padding: '20px 14px',
        borderRadius: '16px',
        background: 'rgba(255,255,255,0.85)',
        backdropFilter: 'blur(12px)',
        border: '1px solid var(--border-light)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.04)',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
    },
    statIconWrap: {
        width: 44,
        height: 44,
        borderRadius: '14px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    statValue: {
        fontSize: '1.6rem',
        fontWeight: 800,
        color: 'var(--text-main)',
        lineHeight: 1,
    },
    statLabel: {
        fontSize: '0.68rem',
        fontWeight: 600,
        color: 'var(--text-muted)',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        textAlign: 'center',
    },

    /* Progress Ring */
    ringCard: {
        width: 175,
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        borderRadius: '20px',
        background: 'rgba(255,255,255,0.85)',
        backdropFilter: 'blur(12px)',
        border: '1px solid var(--border-light)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.04)',
        position: 'relative',
    },
    ringCenter: {
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -60%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
    },
    ringPct: {
        fontSize: '1.4rem',
        fontWeight: 800,
        color: 'var(--text-main)',
    },
    ringLabel: {
        fontSize: '0.6rem',
        fontWeight: 600,
        color: 'var(--text-muted)',
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
    },
    ringMeta: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        marginTop: 4,
    },
    ringDone: {
        fontSize: '0.92rem',
        fontWeight: 700,
        color: 'var(--text-main)',
    },
    ringSubLabel: {
        fontSize: '0.62rem',
        color: 'var(--text-muted)',
        fontWeight: 500,
    },

    /* Countdown */
    countdownBar: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '14px 22px',
        borderRadius: '14px',
        background: 'linear-gradient(135deg, #1E1B4B, #312E81)',
        color: '#fff',
        boxShadow: '0 4px 18px rgba(49, 46, 129, 0.3)',
    },
    countdownLeft: {
        display: 'flex',
        alignItems: 'center',
        gap: 14,
    },
    countdownIcon: {
        width: 38,
        height: 38,
        borderRadius: '12px',
        background: 'rgba(255,255,255,0.15)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    countdownSubject: {
        display: 'block',
        fontSize: '0.92rem',
        fontWeight: 700,
    },
    countdownTopic: {
        display: 'block',
        fontSize: '0.72rem',
        opacity: 0.7,
    },
    countdownTimer: {
        display: 'flex',
        gap: 8,
    },
    timeBlock: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        background: 'rgba(255,255,255,0.1)',
        borderRadius: '10px',
        padding: '6px 12px',
        minWidth: 48,
    },
    timeNum: {
        fontSize: '1.2rem',
        fontWeight: 800,
        fontVariantNumeric: 'tabular-nums',
    },
    timeLabel: {
        fontSize: '0.55rem',
        textTransform: 'uppercase',
        opacity: 0.7,
        fontWeight: 600,
        letterSpacing: '0.06em',
    },

    /* Content Grid */
    contentGrid: {
        display: 'grid',
        gridTemplateColumns: '1fr 310px',
        gap: 22,
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
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
    },

    /* Sections */
    section: { display: 'flex', flexDirection: 'column', gap: 14 },
    sectionHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
    sectionTitle: { display: 'flex', alignItems: 'center', gap: 8, fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)' },
    dayBadge: { fontSize: '0.72rem', fontWeight: 600, padding: '4px 12px', borderRadius: 'var(--radius-full)', background: 'var(--primary-muted)', color: 'var(--primary)' },
    countBadge: { fontSize: '0.68rem', fontWeight: 700, padding: '2px 8px', borderRadius: 'var(--radius-full)', background: 'var(--error-muted)', color: 'var(--error)', marginLeft: 2 },

    /* Card grid */
    cardGrid: { display: 'flex', flexDirection: 'column', gap: 14 },

    /* Empty */
    emptyCard: { padding: '28px 20px', borderRadius: '16px', background: 'var(--bg-card)', border: '1px solid var(--border-light)', textAlign: 'center', boxShadow: 'var(--shadow-sm)' },
    emptyText: { color: 'var(--text-muted)', fontSize: '0.88rem', lineHeight: 1.6 },

    /* Achievement Card */
    achievementCard: {
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '16px 20px',
        borderRadius: '16px',
        background: 'linear-gradient(135deg, #FFFBEB, #FEF3C7)',
        border: '1px solid #FDE68A',
        boxShadow: '0 4px 14px rgba(245, 158, 11, 0.08)',
    },
    achievementIcon: {
        width: 48,
        height: 48,
        borderRadius: '14px',
        background: 'rgba(245, 158, 11, 0.15)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
    },
    achievementInfo: {
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
    },
    achievementLabel: {
        fontSize: '0.68rem',
        fontWeight: 700,
        color: '#92400E',
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
    },
    achievementValue: {
        fontSize: '0.88rem',
        fontWeight: 700,
        color: '#78350F',
    },

    /* Backlog cards */
    backlogCard: {
        flex: '0 0 270px',
        scrollSnapAlign: 'start',
        display: 'flex',
        flexDirection: 'column',
        borderRadius: '16px',
        background: 'rgba(255,255,255,0.9)',
        backdropFilter: 'blur(8px)',
        border: '1px solid var(--border-light)',
        boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
        overflow: 'hidden',
        cursor: 'pointer',
    },
    backlogHead: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 14px',
        borderBottom: '1px solid var(--border-light)',
    },
    backlogDate: { fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)' },
    backlogType: { fontSize: '0.62rem', fontWeight: 600, padding: '3px 8px', borderRadius: 'var(--radius-full)', textTransform: 'uppercase', letterSpacing: '0.04em' },
    backlogBody: { padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8, flex: 1 },
    backlogRow: { display: 'flex', alignItems: 'center', gap: 8 },
    dot: { width: 8, height: 8, borderRadius: '50%', flexShrink: 0 },
    backlogSubj: { fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-main)' },
    backlogTopic: { fontSize: '0.7rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 180 },
    backlogGap: { fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-secondary)', textAlign: 'center', padding: '12px 0' },
    backlogFoot: { padding: '8px 14px', borderTop: '1px solid var(--border-light)', display: 'flex', justifyContent: 'flex-end' },
    reviewLink: { display: 'inline-flex', alignItems: 'center', gap: 2, fontSize: '0.75rem', fontWeight: 600, color: 'var(--primary)', cursor: 'pointer' },

    /* DPP Section */
    dppGrid: { display: 'flex', flexDirection: 'column', gap: 10 },
    dppCard: {
        display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', borderRadius: '14px',
        background: '#fff', border: '1px solid var(--border-light)', boxShadow: '0 2px 8px rgba(99, 102, 241, 0.06)',
        cursor: 'pointer', width: '100%', fontFamily: 'inherit', textDecoration: 'none', textAlign: 'left',
    },
    dppCardIcon: { width: 42, height: 42, borderRadius: 12, background: 'var(--primary-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    dppCardSubject: { fontSize: '0.68rem', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.04em' },
    dppCardTitle: { fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-main)', lineHeight: 1.3, margin: '2px 0' },
    dppCardMeta: { fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)' },
    dppCardAction: { flexShrink: 0 },
};
