/**
 * @fileoverview SubjectView — Split-pane layout for chapters and video lectures (Khazana Style).
 * Route: /courses/:subjectId
 * Features: Working tab filters, chapter badges, staggered animations, skeleton loading, mobile responsive.
 */

import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSchedule } from '@hooks/useSchedule';
import { useProgress } from '@hooks/useProgress';
import { ArrowLeft, PlayCircle, FileText, Check, Coins, FileQuestion, ArrowRightCircle, RotateCcw, Download, ExternalLink, BookOpen } from 'lucide-react';
import dppsData from '@data/dpps.json';
import notesData from '@data/notes.json';

/* ── Skeleton Loading ── */
function SkeletonLessonCard() {
    return (
        <div style={styles.lessonCard}>
            <div className="skeleton-block" style={{ width: 140, height: 80, borderRadius: 8, flexShrink: 0 }} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div className="skeleton-block" style={{ width: '40%', height: 10 }} />
                <div className="skeleton-block" style={{ width: '80%', height: 16 }} />
                <div className="skeleton-block" style={{ width: '30%', height: 12 }} />
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
        <>
            <div style={styles.rightTabs} className="tab-underline-wrap">
                {tabs.map(tab => (
                    <button
                        key={tab}
                        ref={el => { tabRefs.current[tab] = el; }}
                        style={active === tab ? styles.rtActive : styles.rtInactive}
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
            <div style={styles.rightTabBorder} />
        </>
    );
}

/* ── Format duration helper ── */
function formatDuration(minutes) {
    if (!minutes || minutes <= 0) return null;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h > 0) return `${h}h ${m > 0 ? m + 'm' : ''}`.trim();
    return `${m}m`;
}

/* ── Clean topic name (strip .mkv/.mp4 extensions, duplicate prefixes, extra whitespace) ── */
function cleanTopicName(topic) {
    if (!topic) return 'Untitled Lesson';
    let name = topic;
    // Remove file extensions
    name = name.replace(/\.(mkv|mp4|avi|mov|webm)$/i, '');
    // Remove duplicate "Revision: Revision:" → "Revision:"
    name = name.replace(/^(Revision:\s*)+/i, 'Revision: ');
    // Trim whitespace
    return name.trim();
}

export default function SubjectView() {
    const { subjectId } = useParams();
    const navigate = useNavigate();
    const { schedule, loading } = useSchedule();
    const { progressMap, toggleCompleted } = useProgress();

    // Normalize chapter name so "Electric Charges & Fields" === "Electric Charges and Fields"
    const normalizeChapterName = (name) => {
        if (!name) return '';
        return name.replace(/\s*&\s*/g, ' and ').trim();
    };

    // 1. Parse chapters (VIDEO only) + separate Revision & Tests section
    const { chapters, revisionItems } = useMemo(() => {
        if (!schedule || !subjectId) return { chapters: [], revisionItems: [] };

        const chapMap = new Map(); // normalizedName → { displayName, lessons[], firstDate }
        const revItems = [];

        schedule.forEach((day) => {
            if (!day.subjects) return;
            day.subjects.forEach((s) => {
                if (s.subject !== subjectId || !s.chapterName) return;

                const itemId = s.videoId || `test_${s.chapterName?.replace(/\s+/g, '')}_${s.topic?.replace(/\s+/g, '')}`;
                const lessonEntry = {
                    ...s,
                    date: day.date,
                    completed: !!progressMap[itemId]?.completed,
                };

                // Only VIDEO type goes into chapters
                if (s.type === 'VIDEO') {
                    const normName = normalizeChapterName(s.chapterName);
                    if (!chapMap.has(normName)) {
                        chapMap.set(normName, {
                            name: s.chapterName, // keep original display name
                            normName,
                            lessons: [],
                            firstDate: day.date,
                        });
                    }
                    chapMap.get(normName).lessons.push(lessonEntry);
                    // Update firstDate if earlier
                    if (day.date < chapMap.get(normName).firstDate) {
                        chapMap.get(normName).firstDate = day.date;
                    }
                } else {
                    // REVISION, TEST → goes into separate section
                    revItems.push(lessonEntry);
                }
            });
        });

        // Sort chapters by first occurrence date (chronological order)
        const sortedChapters = Array.from(chapMap.values())
            .sort((a, b) => a.firstDate.localeCompare(b.firstDate));

        return { chapters: sortedChapters, revisionItems: revItems };
    }, [schedule, subjectId, progressMap]);

    // 2. State for the currently selected chapter in the sidebar
    const REVISION_KEY = '__revision_and_tests__';
    const [activeChapter, setActiveChapter] = useState(null);
    const [activeRightTab, setActiveRightTab] = useState('All');
    const [dppFilter, setDppFilter] = useState('PENDING'); // 'PENDING' | 'COMPLETED'

    // Auto-select the first chapter on load
    useEffect(() => {
        if (chapters.length > 0 && !activeChapter) {
            setActiveChapter(chapters[0].normName);
        }
    }, [chapters, activeChapter]);

    // 3. Get lessons for active chapter AND apply tab filter
    const activeLessons = useMemo(() => {
        let lessons = [];

        if (activeChapter === REVISION_KEY) {
            lessons = revisionItems;
        } else {
            const found = chapters.find(c => c.normName === activeChapter);
            if (!found) return [];
            lessons = found.lessons;
        }

        switch (activeRightTab) {
            case 'Lectures':
                lessons = lessons.filter(l => l.type === 'VIDEO');
                break;
            case 'DPPs':
                lessons = lessons.filter(l => l.resourceLinks?.dpp);
                break;
            case 'Notes':
                lessons = lessons.filter(l => l.resourceLinks?.notes);
                break;
            default: // 'All'
                break;
        }

        return lessons;
    }, [chapters, revisionItems, activeChapter, activeRightTab]);

    // 4. Chapter completion stats
    const chapterStats = useMemo(() => {
        const stats = {};
        chapters.forEach(ch => {
            const completed = ch.lessons.filter(l => l.completed).length;
            stats[ch.normName] = { completed, total: ch.lessons.length };
        });
        if (revisionItems.length > 0) {
            const completed = revisionItems.filter(l => l.completed).length;
            stats[REVISION_KEY] = { completed, total: revisionItems.length };
        }
        return stats;
    }, [chapters, revisionItems]);

    const isLoading = loading || (!schedule || schedule.length === 0);

    return (
        <div style={styles.page}>
            {/* Top Toolbar */}
            <div style={styles.header} className="courses-header">
                <button style={styles.backBtn} onClick={() => navigate('/courses')}>
                    <ArrowLeft size={18} /> <span style={{ fontWeight: 600 }}>All Classes</span>
                </button>
                <div style={styles.xpBadge}>
                    <Coins size={16} fill="#FCD34D" color="#CA8A04" />
                    <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>0</span>
                </div>
            </div>

            {/* Main Split Layout */}
            <div style={styles.contentWrap} className="subject-view-wrap">

                {/* Left Sidebar: Chapters */}
                <div style={styles.sidebar} className="subject-view-sidebar">
                    <div style={styles.sidebarHeader}>
                        ALL CHAPTERS
                    </div>
                    <div style={styles.chapterList}>
                        {isLoading ? (
                            [1, 2, 3, 4].map(i => (
                                <div key={i} style={{ padding: '16px 20px', display: 'flex', gap: 10, alignItems: 'center' }}>
                                    <div className="skeleton-block" style={{ width: 40, height: 12 }} />
                                    <div className="skeleton-block" style={{ width: '70%', height: 14 }} />
                                </div>
                            ))
                        ) : (
                            <>
                                {chapters.map((ch, idx) => {
                                    const isActive = activeChapter === ch.normName;
                                    const chNum = (idx + 1).toString().padStart(2, '0');
                                    const stat = chapterStats[ch.normName] || { completed: 0, total: 0 };
                                    const badgeClass = stat.completed === stat.total && stat.total > 0
                                        ? 'chapter-badge chapter-badge--done'
                                        : stat.completed > 0
                                            ? 'chapter-badge chapter-badge--partial'
                                            : 'chapter-badge chapter-badge--zero';

                                    return (
                                        <button
                                            key={ch.normName}
                                            className="course-card-enter"
                                            style={{
                                                ...(isActive ? styles.chapterItemActive : styles.chapterItem),
                                                animationDelay: `${idx * 0.04}s`,
                                            }}
                                            onClick={() => { setActiveChapter(ch.normName); setActiveRightTab('All'); }}
                                        >
                                            <span style={{ color: isActive ? '#6366F1' : '#94A3B8', fontSize: '0.8rem', minWidth: 50, textAlign: 'left' }}>
                                                CH - {chNum}
                                            </span>
                                            <span style={styles.chapterItemName}>
                                                {ch.name}
                                            </span>
                                            <span className={badgeClass} style={{ marginLeft: 'auto' }}>
                                                {stat.completed}/{stat.total}
                                            </span>
                                        </button>
                                    );
                                })}

                                {/* Revision & Tests — separate section */}
                                {revisionItems.length > 0 && (
                                    <>
                                        <div style={{ padding: '16px 20px 8px', fontSize: '0.75rem', fontWeight: 700, color: '#94A3B8', letterSpacing: '0.05em', borderTop: '1px solid #E2E8F0', marginTop: 8 }}>
                                            REVISION & TESTS
                                        </div>
                                        <button
                                            className="course-card-enter"
                                            style={{
                                                ...(activeChapter === REVISION_KEY ? styles.chapterItemActive : styles.chapterItem),
                                                animationDelay: `${chapters.length * 0.04}s`,
                                            }}
                                            onClick={() => { setActiveChapter(REVISION_KEY); setActiveRightTab('All'); }}
                                        >
                                            <span style={{ fontSize: '1rem', minWidth: 50, textAlign: 'left' }}>📝</span>
                                            <span style={styles.chapterItemName}>
                                                All Revisions & Tests
                                            </span>
                                            <span className="chapter-badge chapter-badge--zero" style={{ marginLeft: 'auto' }}>
                                                {(chapterStats[REVISION_KEY]?.completed || 0)}/{(chapterStats[REVISION_KEY]?.total || 0)}
                                            </span>
                                        </button>
                                    </>
                                )}
                            </>
                        )}
                    </div>
                </div>

                {/* Right Area: Lessons */}
                <div style={styles.main} className="subject-view-main">

                    {/* Tabs inside Main Area */}
                    <TabBar
                        tabs={['All', 'Lectures', 'DPPs', 'Notes']}
                        active={activeRightTab}
                        onChange={(tab) => {
                            setActiveRightTab(tab);
                            if (tab !== 'DPPs') setDppFilter('PENDING');
                        }}
                    />

                    {/* Pending / Completed Toggle for DPPs */}
                    {activeRightTab === 'DPPs' && (
                        <div style={styles.dppToggleWrap}>
                            <button
                                style={dppFilter === 'PENDING' ? styles.dppToggleActive : styles.dppToggleInactive}
                                onClick={() => setDppFilter('PENDING')}
                            >
                                PENDING
                            </button>
                            <button
                                style={dppFilter === 'COMPLETED' ? styles.dppToggleActive : styles.dppToggleInactive}
                                onClick={() => setDppFilter('COMPLETED')}
                            >
                                COMPLETED
                            </button>
                        </div>
                    )}

                    {/* Lesson Cards List */}
                    <div style={styles.lessonList}>
                        {isLoading ? (
                            [1, 2, 3].map(i => <SkeletonLessonCard key={i} />)
                        ) : activeRightTab === 'DPPs' ? (
                            /* ── NEW DPP CARD LAYOUT ── */
                            activeLessons
                                // Filter by progress status for DPPs using localStorage
                                .filter(lesson => {
                                    const dppId = lesson.resourceLinks?.dpp;
                                    if (!dppId) return false;
                                    const isDppCompleted = !!localStorage.getItem(`dpp_completed_${dppId}`);
                                    return dppFilter === 'COMPLETED' ? isDppCompleted : !isDppCompleted;
                                })
                                .map((lesson, idx) => {
                                    const dppId = lesson.resourceLinks.dpp;
                                    const dppInfo = dppsData[dppId];
                                    const isDppCompleted = !!localStorage.getItem(`dpp_completed_${dppId}`);
                                    const displayDate = new Date(lesson.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
                                    const marks = dppInfo?.questions?.length ? dppInfo.questions.length * 4 : 40;
                                    const qCount = dppInfo?.questions?.length || 10;
                                    const xp = marks;

                                    return (
                                        <div key={dppId || idx} style={styles.dppCard} className="course-card-enter" style={{ animationDelay: `${idx * 0.05}s`, ...styles.dppCard }}>
                                            <div style={styles.dppIconWrap}>
                                                <div style={styles.dppIconInner}>
                                                    <FileText size={20} color="#64748B" />
                                                    <span style={styles.dppIconText}>DPP</span>
                                                </div>
                                            </div>
                                            <div style={styles.dppInfoWrap}>
                                                <div style={styles.dppTopRow}>
                                                    <span style={styles.dppDateTag}>DPP • {displayDate}</span>
                                                    <div style={styles.dppObjectiveBadge}>OBJECTIVE</div>
                                                </div>
                                                <h4 style={styles.dppTitle}>
                                                    {lesson.chapterName} : {cleanTopicName(lesson.topic)}
                                                </h4>
                                                <div style={styles.dppMeta}>
                                                    {marks} Marks | {qCount} Qs. | Earn {xp} <Coins size={12} fill="#94A3B8" color="#64748B" style={{ marginLeft: 2, display: 'inline-block' }} />
                                                    {isDppCompleted && <span style={{ color: '#22C55E', marginLeft: 8 }}>✓ Completed</span>}
                                                </div>

                                                <div style={styles.dppActionRow}>
                                                    <button
                                                        style={isDppCompleted ? styles.dppActionReattempt : styles.dppActionAttempt}
                                                        onClick={() => navigate(`/dpp/${dppId}`)}
                                                    >
                                                        {isDppCompleted ? <RotateCcw size={16} /> : <ArrowRightCircle size={16} />}
                                                        {isDppCompleted ? "Re-Attempt DPP" : "Attempt DPP"}
                                                    </button>
                                                    <button
                                                        style={styles.dppActionPdf}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            const pdfUrl = dppInfo?.pdf;
                                                            if (pdfUrl) {
                                                                const link = document.createElement('a');
                                                                link.href = pdfUrl;
                                                                link.download = pdfUrl.split('/').pop();
                                                                document.body.appendChild(link);
                                                                link.click();
                                                                document.body.removeChild(link);
                                                            }
                                                        }}
                                                    >
                                                        <Download size={14} /> PDF
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                        ) : activeRightTab === 'Notes' ? (
                            /* ── REDESIGNED NOTES CARDS ── */
                            (() => {
                                // Find all notes for this chapter from notes.json
                                const chapterNotes = activeLessons
                                    .filter(lesson => lesson.resourceLinks?.notes)
                                    .map((lesson, idx) => {
                                        const notesUrl = lesson.resourceLinks.notes;
                                        // Find matching note in notes.json
                                        const matchedNote = Object.values(notesData).find(n =>
                                            n.driveUrl === notesUrl ||
                                            (n.subject === lesson.subject &&
                                             n.chapter === lesson.chapterName &&
                                             n.lecture === parseInt(lesson.topic?.match(/\d+/)?.[0] || '0'))
                                        );
                                        return { lesson, notesUrl, matchedNote, idx };
                                    });

                                if (chapterNotes.length === 0) {
                                    return (
                                        <p style={{ textAlign: 'center', marginTop: 40, color: '#64748B' }}>
                                            No notes available for this chapter yet.
                                        </p>
                                    );
                                }

                                return chapterNotes.map(({ lesson, notesUrl, matchedNote, idx }) => {
                                    const displayDate = new Date(lesson.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
                                    const lecNum = lesson.topic?.match(/\d+/)?.[0] || (idx + 1);
                                    const noteTitle = matchedNote?.title || `Lecture ${lecNum} Notes`;
                                    const noteId = matchedNote?.id;
                                    const fileIdMatch = notesUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);
                                    const fileId = fileIdMatch?.[1];
                                    const downloadUrl = fileId
                                        ? `https://drive.google.com/uc?export=download&id=${fileId}`
                                        : notesUrl;

                                    return (
                                        <div
                                            key={noteId || `note-${idx}`}
                                            className="lesson-card-hover course-card-enter"
                                            style={{
                                                ...styles.noteCard,
                                                animationDelay: `${idx * 0.05}s`,
                                            }}
                                            onClick={() => {
                                                if (noteId) {
                                                    window.open(`/notes/${noteId}`, '_blank');
                                                } else {
                                                    window.open(notesUrl, '_blank');
                                                }
                                            }}
                                        >
                                            {/* Note Icon */}
                                            <div style={styles.noteIconWrap}>
                                                <div style={styles.noteIconInner}>
                                                    <BookOpen size={22} color="#6366F1" />
                                                </div>
                                            </div>

                                            {/* Note Info */}
                                            <div style={styles.noteInfoWrap}>
                                                <div style={styles.noteTopRow}>
                                                    <span style={styles.noteDateTag}>NOTES • {displayDate}</span>
                                                    <div style={styles.notePdfBadge}>PDF</div>
                                                </div>
                                                <h4 style={styles.noteTitle}>{noteTitle}</h4>
                                                <p style={styles.noteSubtitle}>
                                                    {lesson.chapterName} — {cleanTopicName(lesson.topic)}
                                                </p>
                                                <div style={styles.noteActionRow}>
                                                    <span style={styles.noteViewHint}>
                                                        <ExternalLink size={13} style={{ marginRight: 4 }} />
                                                        Click to open in PDF Viewer
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Download Button */}
                                            <button
                                                style={styles.noteDownloadBtn}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    window.open(downloadUrl, '_blank');
                                                }}
                                                title="Download PDF"
                                            >
                                                <Download size={18} />
                                            </button>
                                        </div>
                                    );
                                });
                            })()
                        ) : (
                            /* ── EXISTING LECTURE/ALL CARD LAYOUT ── */
                            activeLessons.map((lesson, idx) => {
                                const isCompleted = lesson.completed;
                                const displayDate = new Date(lesson.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
                                const durationStr = formatDuration(lesson.duration);
                                const uniqueKey = lesson.videoId || `${lesson.topic}-${lesson.date}-${idx}`;

                                return (
                                    <div
                                        key={uniqueKey}
                                        className="lesson-card-hover course-card-enter"
                                        style={{
                                            ...styles.lessonCard,
                                            animationDelay: `${idx * 0.06}s`,
                                        }}
                                    >

                                        {/* Thumbnail */}
                                        <div style={styles.lessonThumbBox} className="lesson-thumb-box">
                                            {lesson.videoId ? (
                                                <img
                                                    src={`https://drive.google.com/thumbnail?id=${lesson.videoId}&sz=w320-h180`}
                                                    alt={lesson.topic}
                                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                    onError={(e) => {
                                                        e.target.style.display = 'none';
                                                        e.target.nextSibling.style.display = 'block';
                                                    }}
                                                />
                                            ) : null}
                                            <div style={{
                                                width: '100%', height: '100%',
                                                background: 'linear-gradient(135deg, #60A5FA, #3B82F6)',
                                                display: lesson.videoId ? 'none' : 'block',
                                                position: lesson.videoId ? 'absolute' : 'static',
                                                top: 0, left: 0,
                                            }} />
                                            {durationStr && (
                                                <div style={styles.durationTag}>
                                                    {durationStr}
                                                </div>
                                            )}
                                        </div>

                                        {/* Lesson Details */}
                                        <div style={styles.lessonInfo}>
                                            <div style={styles.lessonMetaRow}>
                                                <span style={styles.lessonType}>
                                                    {lesson.type === 'VIDEO' ? 'LECTURE' : lesson.type === 'TEST' ? 'TEST' : 'REVISION'} • {displayDate}
                                                </span>
                                                {(() => {
                                                    const itemId = lesson.videoId || `test_${lesson.chapterName?.replace(/\s+/g, '')}_${lesson.topic?.replace(/\s+/g, '')}`;
                                                    return isCompleted ? (
                                                        <div 
                                                            style={{ padding: 8, margin: -8, cursor: 'pointer', zIndex: 10 }}
                                                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleCompleted(itemId); }}
                                                            title="Mark as unread"
                                                        >
                                                            <div style={styles.checkBubbleCompleted}><Check size={12} strokeWidth={3} /></div>
                                                        </div>
                                                    ) : (
                                                        <div 
                                                            style={{ padding: 8, margin: -8, cursor: 'pointer', zIndex: 10 }}
                                                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleCompleted(itemId); }}
                                                            title="Mark as done"
                                                        >
                                                            <div style={styles.checkBubblePending}><Check size={12} strokeWidth={3} color="#CBD5E1" /></div>
                                                        </div>
                                                    );
                                                })()}
                                            </div>

                                            <h4 style={styles.lessonTitle}>
                                                {cleanTopicName(lesson.topic)}
                                            </h4>

                                            <div style={styles.lessonActions}>
                                                {lesson.videoId && (
                                                    <button
                                                        style={styles.primaryActionBtn}
                                                        onClick={() => navigate(`/watch/${lesson.videoId}`)}
                                                    >
                                                        <PlayCircle size={16} fill="#EEECFF" color="#6366F1" /> View Lecture
                                                    </button>
                                                )}

                                                {lesson.resourceLinks?.dpp && (
                                                    <button style={styles.secondaryActionBtn} onClick={() => {
                                                        const link = lesson.resourceLinks.dpp;
                                                        if (link.startsWith('http') || link.includes('.png') || link.includes('.pdf') || link.includes('assets')) {
                                                            window.open(link, '_blank');
                                                        } else {
                                                            navigate(`/dpp/${link}`);
                                                        }
                                                    }}>
                                                        <FileText size={16} /> Attempt DPP
                                                    </button>
                                                )}

                                                {!lesson.videoId && !lesson.resourceLinks?.dpp && (
                                                    <span style={{ fontSize: '0.8rem', color: '#94A3B8', fontStyle: 'italic' }}>
                                                        No content available yet
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}

                        {!isLoading && activeLessons.length === 0 && (
                            <p style={{ textAlign: 'center', marginTop: 40, color: '#64748B' }}>
                                {activeRightTab === 'All'
                                    ? 'No lessons available for this chapter.'
                                    : `No ${activeRightTab.toLowerCase()} found in this chapter.`
                                }
                            </p>
                        )}
                        {!isLoading && activeRightTab === 'DPPs' && activeLessons.filter(lesson => {
                            const dppId = lesson.resourceLinks?.dpp;
                            if (!dppId) return false;
                            const isDppCompleted = !!localStorage.getItem(`dpp_completed_${dppId}`);
                            return dppFilter === 'COMPLETED' ? isDppCompleted : !isDppCompleted;
                        }).length === 0 && (
                            <p style={{ textAlign: 'center', marginTop: 40, color: '#64748B' }}>
                                No {dppFilter.toLowerCase()} DPPs found in this chapter.
                            </p>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
}

const styles = {
    page: { minHeight: '100vh', background: '#F8FAFC', display: 'flex', flexDirection: 'column' },

    // Header
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
    xpBadge: {
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '6px 14px', borderRadius: 24, border: '1px solid #E2E8F0', background: '#fff'
    },

    contentWrap: {
        display: 'flex', flex: 1, maxWidth: 1200, margin: '0 auto', width: '100%',
        background: '#fff',
    },

    // Sidebar
    sidebar: {
        width: 320, borderRight: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column',
        background: '#fff'
    },
    sidebarHeader: {
        padding: '24px 20px 12px', fontSize: '0.8rem', fontWeight: 700,
        color: '#475569', letterSpacing: '0.05em'
    },
    chapterList: {
        display: 'flex', flexDirection: 'column', overflowY: 'auto'
    },
    chapterItem: {
        display: 'flex', alignItems: 'center', padding: '16px 20px', gap: 8,
        background: 'transparent', border: 'none', borderLeft: '4px solid transparent',
        cursor: 'pointer', textAlign: 'left'
    },
    chapterItemActive: {
        display: 'flex', alignItems: 'center', padding: '16px 20px', gap: 8,
        background: '#F8FAFC', border: 'none', borderLeft: '4px solid #6366F1',
        cursor: 'pointer', textAlign: 'left'
    },
    chapterItemName: {
        fontSize: '0.9rem', color: '#1E293B', fontWeight: 500, lineHeight: 1.4
    },

    // Right Main Area
    main: {
        flex: 1, padding: '20px 40px', display: 'flex', flexDirection: 'column',
    },
    rightTabs: {
        display: 'flex', gap: 24, paddingLeft: 8
    },
    rtActive: {
        background: 'transparent', border: 'none', padding: '10px 4px',
        fontSize: '0.95rem', fontWeight: 600, color: '#6366F1',
        borderBottom: '2px solid transparent', cursor: 'pointer'
    },
    rtInactive: {
        background: 'transparent', border: 'none', padding: '10px 4px',
        fontSize: '0.95rem', fontWeight: 500, color: '#64748B',
        cursor: 'pointer'
    },
    rightTabBorder: { height: 1, background: '#E2E8F0', width: '100%', marginTop: -1, marginBottom: 24 },

    lessonList: {
        display: 'flex', flexDirection: 'column', gap: 16, overflowY: 'auto', paddingBottom: 60
    },
    lessonCard: {
        display: 'flex', gap: 20, padding: '16px', borderRadius: 12,
        border: '1px solid #E2E8F0', background: '#fff',
        boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
    },
    lessonThumbBox: {
        width: 140, height: 80, borderRadius: 8, background: '#E2E8F0',
        position: 'relative', overflow: 'hidden', flexShrink: 0
    },
    durationTag: {
        position: 'absolute', bottom: 6, left: 6,
        background: 'rgba(0,0,0,0.7)', color: '#fff',
        fontSize: '0.65rem', padding: '2px 6px', borderRadius: 4, fontWeight: 600
    },
    lessonInfo: {
        display: 'flex', flexDirection: 'column', flex: 1
    },
    lessonMetaRow: {
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6
    },
    lessonType: {
        fontSize: '0.75rem', fontWeight: 600, color: '#64748B', letterSpacing: '0.04em'
    },
    checkBubbleCompleted: {
        width: 20, height: 20, borderRadius: '50%', background: '#22C55E', color: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center'
    },
    checkBubblePending: {
        width: 20, height: 20, borderRadius: '50%', background: 'transparent', border: '1px solid #CBD5E1',
        display: 'flex', alignItems: 'center', justifyContent: 'center'
    },
    lessonTitle: {
        fontSize: '1.05rem', fontWeight: 600, color: '#0F172A', marginBottom: 12, lineHeight: 1.3
    },
    lessonActions: {
        display: 'flex', alignItems: 'center', gap: 16, marginTop: 'auto'
    },
    primaryActionBtn: {
        display: 'flex', alignItems: 'center', gap: 6,
        background: 'transparent', border: 'none', color: '#6366F1',
        fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer', padding: 0
    },
    secondaryActionBtn: {
        display: 'flex', alignItems: 'center', gap: 6,
        background: 'transparent', border: 'none', color: '#64748B',
        fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer', padding: 0
    },

    // DPP Specific Styles
    dppToggleWrap: {
        display: 'flex', gap: 8, marginBottom: 24
    },
    dppToggleActive: {
        background: '#fff', border: '1px solid #E2E8F0', padding: '6px 16px',
        borderRadius: 20, fontSize: '0.8rem', fontWeight: 700, color: '#1E293B',
        boxShadow: '0 1px 2px rgba(0,0,0,0.05)', cursor: 'pointer', letterSpacing: '0.05em'
    },
    dppToggleInactive: {
        background: 'transparent', border: '1px solid transparent', padding: '6px 16px',
        borderRadius: 20, fontSize: '0.8rem', fontWeight: 600, color: '#94A3B8', cursor: 'pointer', letterSpacing: '0.05em'
    },
    dppCard: {
        display: 'flex', gap: 16, padding: '20px', borderRadius: 12,
        border: '1px solid #E2E8F0', background: '#fff',
        boxShadow: '0 1px 3px rgba(0,0,0,0.02)', cursor: 'default'
    },
    dppIconWrap: {
        width: 64, height: 64, background: '#F8FAFC', borderRadius: 12, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #F1F5F9'
    },
    dppIconInner: {
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2
    },
    dppIconText: {
        fontSize: '0.65rem', fontWeight: 700, color: '#64748B', letterSpacing: '0.05em'
    },
    dppInfoWrap: {
        flex: 1, display: 'flex', flexDirection: 'column'
    },
    dppTopRow: {
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4
    },
    dppDateTag: {
        fontSize: '0.75rem', fontWeight: 600, color: '#64748B'
    },
    dppObjectiveBadge: {
        background: '#EFF6FF', color: '#3B82F6', fontSize: '0.65rem', fontWeight: 800,
        padding: '2px 8px', borderRadius: 4, letterSpacing: '0.05em'
    },
    dppTitle: {
        fontSize: '1rem', fontWeight: 700, color: '#1E293B', marginBottom: 6, lineHeight: 1.4
    },
    dppMeta: {
        fontSize: '0.8rem', fontWeight: 500, color: '#64748B', marginBottom: 16, display: 'flex', alignItems: 'center'
    },
    dppActionRow: {
        display: 'flex', alignItems: 'center', gap: 16
    },
    dppActionAttempt: {
        display: 'flex', alignItems: 'center', gap: 6, background: 'transparent', border: 'none',
        color: '#6366F1', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', padding: 0
    },
    dppActionReattempt: {
        display: 'flex', alignItems: 'center', gap: 6, background: 'transparent', border: 'none',
        color: '#F59E0B', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', padding: 0
    },
    dppActionPdf: {
        display: 'flex', alignItems: 'center', gap: 6, background: 'transparent', border: 'none',
        color: '#64748B', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer', padding: 0
    },

    // Notes Card Styles (redesigned — no iframes)
    noteCard: {
        display: 'flex', alignItems: 'center', gap: 16, padding: '18px 20px',
        borderRadius: 14, border: '1px solid #E2E8F0', background: '#fff',
        boxShadow: '0 1px 3px rgba(0,0,0,0.02)', cursor: 'pointer',
        transition: 'all 0.2s ease',
    },
    noteIconWrap: {
        width: 56, height: 56, background: 'linear-gradient(135deg, #EEF2FF, #E0E7FF)',
        borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0, border: '1px solid #E0E7FF',
    },
    noteIconInner: {
        display: 'flex', alignItems: 'center', justifyContent: 'center',
    },
    noteInfoWrap: {
        flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0,
    },
    noteTopRow: {
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4,
    },
    noteDateTag: {
        fontSize: '0.7rem', fontWeight: 700, color: '#6366F1',
        letterSpacing: '0.05em',
    },
    notePdfBadge: {
        background: '#FEF3C7', color: '#D97706', fontSize: '0.6rem', fontWeight: 800,
        padding: '2px 8px', borderRadius: 4, letterSpacing: '0.05em',
    },
    noteTitle: {
        fontSize: '1rem', fontWeight: 700, color: '#1E293B', lineHeight: 1.3,
    },
    noteSubtitle: {
        fontSize: '0.78rem', color: '#64748B', marginTop: 2, fontWeight: 500,
    },
    noteActionRow: {
        marginTop: 6,
    },
    noteViewHint: {
        display: 'inline-flex', alignItems: 'center', fontSize: '0.72rem',
        color: '#94A3B8', fontWeight: 500,
    },
    noteDownloadBtn: {
        width: 44, height: 44, borderRadius: 12, background: '#F8FAFC',
        border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center',
        justifyContent: 'center', cursor: 'pointer', color: '#6366F1',
        flexShrink: 0, transition: 'all 0.15s ease',
    },
};
