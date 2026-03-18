/**
 * @fileoverview CoursesPage — Top-level view showing subject progress cards (Khazana Style).
 * Features: Working search, Resources tab, stats bar, staggered animations, skeleton loading.
 */

import { useMemo, useState, useRef, useCallback, useEffect } from 'react';
import { useSchedule } from '@hooks/useSchedule';
import { useProgress } from '@hooks/useProgress';
import { useNavigate } from 'react-router-dom';
import {
    ArrowLeft, ChevronRight, Search, Coins,
    BookOpen, CheckCircle2, Clock, FileText, Download
} from 'lucide-react';

const SUBJECT_COLORS = {
    Physics: { icon: 'Ph', bg: '#EFF6FF', color: '#3B82F6' },
    Chemistry: { icon: 'Ch', bg: '#ECFDF5', color: '#10B981' },
    Math: { icon: 'Ma', bg: '#FEF2F2', color: '#EF4444' },
    Biology: { icon: 'Bi', bg: '#F5F3FF', color: '#8B5CF6' },
    English: { icon: 'En', bg: '#F0FDF4', color: '#22C55E' },
};

/* ── Skeleton Card ── */
function SkeletonCard() {
    return (
        <div style={styles.card}>
            <div className="skeleton-block" style={{ width: 42, height: 42, borderRadius: 10 }} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div className="skeleton-block" style={{ width: '60%', height: 14 }} />
                <div className="skeleton-block" style={{ width: '30%', height: 10 }} />
            </div>
        </div>
    );
}

/* ── Tab Underline Indicator ── */
function TabBar({ tabs, active, onChange }) {
    const tabRefs = useRef({});
    const [indicator, setIndicator] = useState({ left: 0, width: 0 });

    const updateIndicator = useCallback(() => {
        const el = tabRefs.current[active];
        if (el) {
            setIndicator({ left: el.offsetLeft, width: el.offsetWidth });
        }
    }, [active]);

    useEffect(() => {
        updateIndicator();
        window.addEventListener('resize', updateIndicator);
        return () => window.removeEventListener('resize', updateIndicator);
    }, [updateIndicator]);

    return (
        <div style={styles.tabsCol}>
            <div style={styles.tabsRow} className="tab-underline-wrap">
                {tabs.map(tab => (
                    <button
                        key={tab}
                        ref={el => { tabRefs.current[tab] = el; }}
                        style={active === tab ? styles.tabActive : styles.tabInactive}
                        onClick={() => onChange(tab)}
                    >
                        {tab}
                    </button>
                ))}
                <div
                    className="tab-underline-indicator"
                    style={{ left: indicator.left, width: indicator.width }}
                />
            </div>
            <div style={styles.tabBorder} />
        </div>
    );
}

export default function CoursesPage() {
    const { schedule, loading } = useSchedule();
    const { progressMap } = useProgress();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('Subjects');
    const [searchQuery, setSearchQuery] = useState('');

    /* ── Compute subject stats ── */
    const subjectsList = useMemo(() => {
        const stats = {};
        if (!schedule) return [];

        schedule.forEach((day) => {
            if (!day.subjects) return;
            day.subjects.forEach((s) => {
                if (!s.subject) return;
                if (!stats[s.subject]) {
                    stats[s.subject] = { total: 0, completed: 0, totalMinutes: 0 };
                }
                stats[s.subject].total += 1;
                if (progressMap[s.videoId]?.completed) {
                    stats[s.subject].completed += 1;
                }
                if (s.duration) {
                    stats[s.subject].totalMinutes += s.duration;
                }
            });
        });

        return Object.entries(stats).map(([name, data]) => ({
            name,
            total: data.total,
            completed: data.completed,
            totalMinutes: data.totalMinutes,
            pct: data.total > 0 ? Math.round((data.completed / data.total) * 100) : 0,
        }));
    }, [schedule, progressMap]);

    /* ── Aggregate resources per subject → chapter ── */
    const resourcesList = useMemo(() => {
        if (!schedule) return [];
        const map = {};

        schedule.forEach((day) => {
            if (!day.subjects) return;
            day.subjects.forEach((s) => {
                if (!s.subject || !s.chapterName) return;
                const key = `${s.subject}::${s.chapterName}`;
                if (!map[key]) {
                    map[key] = {
                        subject: s.subject,
                        chapter: s.chapterName,
                        dpps: new Set(),
                        notes: new Set(),
                        solutions: new Set(),
                    };
                }
                if (s.resourceLinks?.dpp) map[key].dpps.add(s.resourceLinks.dpp);
                if (s.resourceLinks?.notes) map[key].notes.add(s.resourceLinks.notes);
                if (s.resourceLinks?.solution) map[key].solutions.add(s.resourceLinks.solution);
            });
        });

        return Object.values(map).map(r => ({
            ...r,
            dpps: [...r.dpps],
            notes: [...r.notes],
            solutions: [...r.solutions],
        }));
    }, [schedule]);

    /* ── Search filter (debounced via controlled input) ── */
    const filteredSubjects = useMemo(() => {
        if (!searchQuery.trim()) return subjectsList;
        const q = searchQuery.toLowerCase();
        return subjectsList.filter(s => s.name.toLowerCase().includes(q));
    }, [subjectsList, searchQuery]);

    const filteredResources = useMemo(() => {
        if (!searchQuery.trim()) return resourcesList;
        const q = searchQuery.toLowerCase();
        return resourcesList.filter(r =>
            r.subject.toLowerCase().includes(q) || r.chapter.toLowerCase().includes(q)
        );
    }, [resourcesList, searchQuery]);

    /* ── Global stats ── */
    const globalStats = useMemo(() => {
        const totalLectures = subjectsList.reduce((a, s) => a + s.total, 0);
        const totalCompleted = subjectsList.reduce((a, s) => a + s.completed, 0);
        const totalMinutes = subjectsList.reduce((a, s) => a + s.totalMinutes, 0);
        const totalHours = Math.round(totalMinutes / 60);
        return { totalLectures, totalCompleted, totalHours };
    }, [subjectsList]);

    const isLoading = loading || (!schedule || schedule.length === 0);

    return (
        <div style={styles.page}>
            {/* Top Toolbar */}
            <div style={styles.header} className="courses-header">
                <button style={styles.backBtn} onClick={() => navigate('/dashboard')}>
                    <ArrowLeft size={18} /> <span style={{ fontWeight: 600 }}>All Classes</span>
                </button>

                <div style={styles.headerRight}>
                    <div style={styles.searchBar} className="courses-search-bar">
                        <Search size={16} color="var(--text-muted)" />
                        <input
                            type="text"
                            placeholder="Search subjects & chapters..."
                            style={styles.searchInput}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        {searchQuery && (
                            <button
                                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#94A3B8', fontSize: '1rem', lineHeight: 1 }}
                                onClick={() => setSearchQuery('')}
                                aria-label="Clear search"
                            >
                                ×
                            </button>
                        )}
                    </div>
                    <div style={styles.xpBadge}>
                        <Coins size={16} fill="#FCD34D" color="#CA8A04" />
                        <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>0</span>
                    </div>
                </div>
            </div>

            <div style={styles.content}>
                {/* Stats Summary Bar */}
                {!isLoading && (
                    <div className="stats-bar course-card-enter" style={{ animationDelay: '0s' }}>
                        <div className="stats-bar__item">
                            <div className="stats-bar__icon" style={{ background: '#EFF6FF' }}>
                                <BookOpen size={18} color="#3B82F6" />
                            </div>
                            <div>
                                <div className="stats-bar__value">{globalStats.totalLectures}</div>
                                <div className="stats-bar__label">Total Lectures</div>
                            </div>
                        </div>
                        <div className="stats-bar__item">
                            <div className="stats-bar__icon" style={{ background: '#ECFDF5' }}>
                                <CheckCircle2 size={18} color="#10B981" />
                            </div>
                            <div>
                                <div className="stats-bar__value">{globalStats.totalCompleted}</div>
                                <div className="stats-bar__label">Completed</div>
                            </div>
                        </div>
                        <div className="stats-bar__item">
                            <div className="stats-bar__icon" style={{ background: '#FEF2F2' }}>
                                <Clock size={18} color="#EF4444" />
                            </div>
                            <div>
                                <div className="stats-bar__value">{globalStats.totalHours}h</div>
                                <div className="stats-bar__label">Total Hours</div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Tabs */}
                <TabBar
                    tabs={['Subjects', 'Resources']}
                    active={activeTab}
                    onChange={setActiveTab}
                />

                {/* ── Subjects Grid ── */}
                {activeTab === 'Subjects' && (
                    <>
                        {isLoading ? (
                            <div style={styles.grid} className="courses-grid">
                                {[1, 2, 3].map(i => <SkeletonCard key={i} />)}
                            </div>
                        ) : filteredSubjects.length === 0 ? (
                            <p style={{ textAlign: 'center', marginTop: 40, color: '#64748B' }}>
                                {searchQuery ? `No subjects found for "${searchQuery}"` : 'No subjects available.'}
                            </p>
                        ) : (
                            <div style={styles.grid} className="courses-grid">
                                {filteredSubjects.map((subj, idx) => {
                                    const conf = SUBJECT_COLORS[subj.name] || { icon: subj.name.substring(0, 2), bg: '#F1F5F9', color: '#64748B' };

                                    return (
                                        <div
                                            key={subj.name}
                                            className="course-card-hover course-card-enter"
                                            style={{ ...styles.card, animationDelay: `${idx * 0.07}s` }}
                                            onClick={() => navigate(`/courses/${encodeURIComponent(subj.name)}`)}
                                        >
                                            <div style={{ ...styles.iconBox, background: conf.bg, color: conf.color }}>
                                                {conf.icon}
                                            </div>
                                            <span style={styles.cardName}>{subj.name}</span>

                                            <div style={{ flex: 1 }} />

                                            <div style={styles.progressCol}>
                                                <span style={styles.pctText}>{subj.pct}%</span>
                                                <div style={styles.barBg}>
                                                    <div
                                                        className="progress-bar-animated"
                                                        style={{ ...styles.barFill, width: `${subj.pct}%`, background: conf.color }}
                                                    />
                                                </div>
                                            </div>

                                            <ChevronRight size={18} color="var(--text-muted)" style={{ marginLeft: 8 }} />
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {!isLoading && filteredSubjects.length > 0 && (
                            <p style={styles.infoText}>ⓘ Completion % depends on lecture and DPP progress!</p>
                        )}
                    </>
                )}

                {/* ── Resources Tab ── */}
                {activeTab === 'Resources' && (
                    <>
                        {isLoading ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                {[1, 2, 3].map(i => (
                                    <div key={i} style={styles.card}>
                                        <div className="skeleton-block" style={{ width: '100%', height: 48 }} />
                                    </div>
                                ))}
                            </div>
                        ) : filteredResources.length === 0 ? (
                            <p style={{ textAlign: 'center', marginTop: 40, color: '#64748B' }}>
                                {searchQuery ? `No resources found for "${searchQuery}"` : 'No resources available.'}
                            </p>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                {filteredResources.map((res, idx) => {
                                    const conf = SUBJECT_COLORS[res.subject] || { icon: '📂', bg: '#F1F5F9', color: '#64748B' };

                                    return (
                                        <div
                                            key={`${res.subject}-${res.chapter}`}
                                            className="course-card-hover course-card-enter"
                                            style={{
                                                ...styles.resourceCard,
                                                animationDelay: `${idx * 0.05}s`,
                                            }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                                                <div style={{ ...styles.iconBox, background: conf.bg, color: conf.color, width: 34, height: 34, fontSize: '0.8rem' }}>
                                                    {conf.icon}
                                                </div>
                                                <div>
                                                    <div style={{ fontSize: '0.7rem', fontWeight: 600, color: conf.color, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                                        {res.subject}
                                                    </div>
                                                    <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#1E293B' }}>
                                                        {res.chapter}
                                                    </div>
                                                </div>
                                            </div>

                                            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                                                {res.notes.length > 0 && (
                                                    <a
                                                        href={res.notes[0]}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        style={styles.resourceLink}
                                                    >
                                                        <FileText size={14} /> Notes
                                                    </a>
                                                )}
                                                {res.dpps.length > 0 && (
                                                    res.dpps[0].startsWith('http') || res.dpps[0].includes('.png') || res.dpps[0].includes('.pdf') || res.dpps[0].includes('assets') ? (
                                                        <a
                                                            href={res.dpps[0]}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            style={{ ...styles.resourceLink, background: '#FEF2F2', color: '#EF4444' }}
                                                        >
                                                            <Download size={14} /> DPP
                                                        </a>
                                                    ) : (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                navigate(`/dpp/${res.dpps[0]}`);
                                                            }}
                                                            style={{ ...styles.resourceLink, background: '#FEF2F2', color: '#EF4444', border: 'none', cursor: 'pointer' }}
                                                        >
                                                            <FileText size={14} /> Attempt DPP
                                                        </button>
                                                    )
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

const styles = {
    page: { minHeight: '100vh', background: '#F8FAFC' },

    header: {
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 24px', background: '#fff', borderBottom: '1px solid #E2E8F0',
        position: 'sticky', top: 0, zIndex: 10
    },
    backBtn: {
        display: 'flex', alignItems: 'center', gap: 12,
        background: 'transparent', border: 'none', cursor: 'pointer',
        fontSize: '1.05rem', color: '#1E293B', padding: '6px 0',
    },
    headerRight: { display: 'flex', alignItems: 'center', gap: 16 },
    searchBar: {
        display: 'flex', alignItems: 'center', gap: 8,
        background: '#F1F5F9', padding: '8px 12px', borderRadius: 24,
        width: 240,
    },
    searchInput: { border: 'none', background: 'transparent', outline: 'none', fontSize: '0.85rem', flex: 1 },
    xpBadge: {
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '6px 14px', borderRadius: 24, border: '1px solid #E2E8F0', background: '#fff'
    },

    content: { maxWidth: 1000, margin: '0 auto', padding: '32px 24px' },

    tabsCol: { display: 'flex', flexDirection: 'column', marginBottom: 24 },
    tabsRow: { display: 'flex', gap: 24, padding: '0 8px' },
    tabActive: {
        background: 'transparent', border: 'none', padding: '10px 4px',
        fontSize: '0.95rem', fontWeight: 600, color: '#6366F1',
        borderBottom: '2px solid transparent', cursor: 'pointer'
    },
    tabInactive: {
        background: 'transparent', border: 'none', padding: '10px 4px',
        fontSize: '0.95rem', fontWeight: 500, color: '#64748B',
        cursor: 'pointer'
    },
    tabBorder: { height: 1, background: '#E2E8F0', width: '100%', marginTop: -1 },

    grid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
        gap: 16
    },
    card: {
        background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12,
        padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14,
        cursor: 'pointer',
        boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
    },
    iconBox: {
        width: 42, height: 42, borderRadius: 10,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontWeight: 700, fontSize: '1rem'
    },
    cardName: { fontSize: '1rem', fontWeight: 600, color: '#1E293B' },

    progressCol: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 },
    pctText: { fontSize: '0.8rem', fontWeight: 600, color: '#475569' },
    barBg: { width: 44, height: 4, background: '#E2E8F0', borderRadius: 4, overflow: 'hidden' },
    barFill: { height: '100%', borderRadius: 4 },

    infoText: { marginTop: 32, fontSize: '0.85rem', color: '#64748B', display: 'flex', alignItems: 'center', gap: 6 },

    /* Resource card */
    resourceCard: {
        background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12,
        padding: '16px 20px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
        cursor: 'default',
    },
    resourceLink: {
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '6px 14px', borderRadius: 20,
        background: '#EFF6FF', color: '#3B82F6',
        fontSize: '0.8rem', fontWeight: 600,
        textDecoration: 'none',
        transition: 'opacity 0.15s',
    },
};
