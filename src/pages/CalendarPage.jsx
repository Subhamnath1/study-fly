import { useMemo, useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useSchedule } from '@hooks/useSchedule';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isSameDay, addMonths, subMonths, parseISO, isValid } from 'date-fns';
import { ChevronLeft, ChevronRight, BookOpen, FileCheck2, PenTool, Play, Atom, FlaskConical, Calculator } from 'lucide-react';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const SUBJECT_ICONS = {
    Physics: Atom,
    Chemistry: FlaskConical,
    Math: Calculator,
};

const DAY_LABELS = {
    CLASS: 'Regular Classes',
    REVISION: 'Revision Day',
    WEEKLY_TEST: 'Weekly Test',
    GAP_PRACTICE: 'Gap Practice',
    CHAPTER_EXAM: 'Chapter Exam',
};

const DAY_COLORS = {
    CLASS: 'var(--primary)',
    REVISION: 'var(--info)',
    WEEKLY_TEST: 'var(--warning)',
    GAP_PRACTICE: 'var(--success)', // Restored to green as requested
    CHAPTER_EXAM: 'var(--error)',
};

export default function CalendarPage() {
    const [searchParams] = useSearchParams();
    const queryDate = searchParams.get('date');
    const isValidQueryDate = queryDate && isValid(parseISO(queryDate));

    const [currentMonth, setCurrentMonth] = useState(isValidQueryDate ? parseISO(queryDate) : new Date());
    const [selectedDate, setSelectedDate] = useState(isValidQueryDate ? queryDate : format(new Date(), 'yyyy-MM-dd'));
    const { schedule } = useSchedule();

    const eventMap = useMemo(() => {
        const map = {};
        if (schedule) schedule.forEach((d) => { map[d.date] = d; });
        return map;
    }, [schedule]);

    const calendarDays = useMemo(() => {
        const monthStart = startOfMonth(currentMonth);
        const monthEnd = endOfMonth(currentMonth);
        const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
        const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
        const days = [];
        let day = calStart;
        while (day <= calEnd) { days.push(day); day = addDays(day, 1); }
        return days;
    }, [currentMonth]);

    const today = new Date();
    const selectedEntry = eventMap[selectedDate] || null;

    return (
        <div style={styles.page}>
            <h2 style={styles.pageTitle}>📅 Calendar</h2>

            <div style={styles.layout}>
                {/* Calendar Grid */}
                <div style={styles.calCard}>
                    <div style={styles.calHeader}>
                        <button style={styles.navBtn} onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
                            <ChevronLeft size={18} />
                        </button>
                        <h3 style={styles.monthLabel}>{format(currentMonth, 'MMMM yyyy')}</h3>
                        <button style={styles.navBtn} onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
                            <ChevronRight size={18} />
                        </button>
                    </div>

                    <div style={styles.weekRow}>
                        {WEEKDAYS.map((wd) => (
                            <span key={wd} style={styles.weekday}>{wd}</span>
                        ))}
                    </div>

                    <div style={styles.daysGrid}>
                        {calendarDays.map((d, i) => {
                            const dateStr = format(d, 'yyyy-MM-dd');
                            const isToday = isSameDay(d, today);
                            const inMonth = isSameMonth(d, currentMonth);
                            const hasEvent = !!eventMap[dateStr];
                            const isSelected = dateStr === selectedDate;

                            const dayColor = hasEvent ? DAY_COLORS[eventMap[dateStr].dayType] : undefined;

                            return (
                                <button
                                    key={i}
                                    style={{
                                        ...styles.dayCell,
                                        ...(isSelected ? styles.daySelected : {}),
                                        ...(isToday && !isSelected ? styles.dayToday : {}),
                                        ...(!inMonth ? styles.dayMuted : {}),
                                    }}
                                    onClick={() => inMonth && setSelectedDate(dateStr)}
                                >
                                    {format(d, 'd')}
                                    {hasEvent && inMonth && (
                                        <span style={{ ...styles.eventDot, background: dayColor }} />
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    {/* Legend */}
                    <div style={styles.legend}>
                        {Object.entries(DAY_LABELS).map(([key, label]) => (
                            <span key={key} style={styles.legendItem}>
                                <span style={{ ...styles.legendDot, background: DAY_COLORS[key] }} />
                                {label}
                            </span>
                        ))}
                    </div>
                </div>

                {/* Day Detail */}
                <div style={styles.detailCard}>
                    <h3 style={styles.detailTitle}>
                        {format(parseISO(selectedDate), 'EEEE, MMMM d, yyyy')}
                    </h3>

                    {!selectedEntry ? (
                        <div style={styles.emptyDetail}>
                            <p style={styles.emptyText}>No schedule for this day.</p>
                        </div>
                    ) : (
                        <>
                            <span style={{ ...styles.typeBadge, background: DAY_COLORS[selectedEntry.dayType] + '18', color: DAY_COLORS[selectedEntry.dayType] }}>
                                {DAY_LABELS[selectedEntry.dayType]}
                            </span>

                            <div style={styles.subjectList}>
                                {selectedEntry.subjects.map((s, i) => {
                                    const Icon = SUBJECT_ICONS[s.subject] || BookOpen;
                                    const color = `var(--${s.subject.toLowerCase()})`;

                                    return (
                                        <div key={i} style={styles.subjectRow}>
                                            <div style={{ ...styles.subjectIconWrap, background: color + '12', color: color }}>
                                                <Icon size={18} />
                                            </div>
                                            <div>
                                                <p style={styles.subjectName}>{s.subject}</p>
                                                <p style={styles.chapterName}>{s.chapterName}</p>
                                                <p style={styles.topicName}>{s.topic}</p>
                                            </div>
                                            <span style={styles.timeLabel}>{s.unlockTime || ''}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

const styles = {
    page: { padding: '24px 28px 40px', maxWidth: 1200, margin: '0 auto' },
    pageTitle: { fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: 24 },

    layout: { display: 'grid', gridTemplateColumns: '1fr 380px', gap: 24, alignItems: 'start' },

    calCard: { background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-light)', padding: 24, boxShadow: 'var(--shadow-sm)' },
    calHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
    monthLabel: { fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)' },
    navBtn: { width: 34, height: 34, borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface-hover)', border: '1px solid var(--border-light)', cursor: 'pointer', color: 'var(--text-muted)' },

    weekRow: { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: 8 },
    weekday: { textAlign: 'center', fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', padding: '6px 0', textTransform: 'uppercase' },

    daysGrid: { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 },
    dayCell: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '10px 0', borderRadius: 'var(--radius-md)', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-main)', position: 'relative', transition: 'all var(--transition-fast)' },
    daySelected: { background: 'var(--primary)', color: '#fff', fontWeight: 700 },
    dayToday: { background: 'var(--primary-muted)', color: 'var(--primary)', fontWeight: 700 },
    dayMuted: { opacity: 0.3, cursor: 'default' },
    eventDot: { width: 5, height: 5, borderRadius: '50%', marginTop: 3, position: 'absolute', bottom: 4 },

    legend: { display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border-light)' },
    legendItem: { display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.7rem', fontWeight: 500, color: 'var(--text-muted)' },
    legendDot: { width: 8, height: 8, borderRadius: '50%' },

    detailCard: { background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-light)', padding: 24, boxShadow: 'var(--shadow-sm)' },
    detailTitle: { fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: 12 },
    typeBadge: { display: 'inline-block', fontSize: '0.72rem', fontWeight: 600, padding: '4px 12px', borderRadius: 'var(--radius-full)', marginBottom: 16 },

    subjectList: { display: 'flex', flexDirection: 'column', gap: 14 },
    subjectRow: { display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 'var(--radius-md)', background: 'var(--bg-app)', position: 'relative' },
    subjectIconWrap: { width: 36, height: 36, borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    subjectName: { fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)' },
    chapterName: { fontSize: '0.78rem', fontWeight: 500, color: 'var(--text-secondary)' },
    topicName: { fontSize: '0.72rem', color: 'var(--text-muted)' },
    timeLabel: { marginLeft: 'auto', fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', whiteSpace: 'nowrap' },

    emptyDetail: { padding: '40px 20px', textAlign: 'center' },
    emptyText: { color: 'var(--text-muted)', fontSize: '0.88rem' },
};
