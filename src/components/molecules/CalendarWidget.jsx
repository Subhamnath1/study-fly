/**
 * @fileoverview CalendarWidget — Mini month-view calendar + upcoming events list.
 *
 * Features:
 * - Renders current month grid
 * - Highlights today with primary color circle
 * - Dots under dates with scheduled events
 * - Upcoming exams/tests list below
 */

import { useState, useMemo } from 'react';
import { useSchedule } from '@hooks/useSchedule';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isSameDay, addMonths, subMonths, parseISO } from 'date-fns';
import { Atom, FlaskConical, Calculator, BookOpen, ChevronLeft, ChevronRight, Clock } from 'lucide-react';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const SUBJECT_ICONS = {
    Physics: Atom,
    Chemistry: FlaskConical,
    Math: Calculator,
};

export default function CalendarWidget() {
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const { schedule } = useSchedule();

    // Build a Set of dates that have events
    const eventDates = useMemo(() => {
        const set = new Set();
        if (schedule) {
            schedule.forEach((day) => set.add(day.date));
        }
        return set;
    }, [schedule]);

    // Upcoming exams/tests (next 7 days)
    const upcomingExams = useMemo(() => {
        if (!schedule) return [];
        const today = new Date();
        const todayStr = format(today, 'yyyy-MM-dd');
        return schedule
            .filter((d) => d.date >= todayStr && (d.dayType === 'WEEKLY_TEST' || d.dayType === 'CHAPTER_EXAM'))
            .slice(0, 3);
    }, [schedule]);

    // Calendar grid
    const calendarDays = useMemo(() => {
        const monthStart = startOfMonth(currentMonth);
        const monthEnd = endOfMonth(currentMonth);
        const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
        const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

        const days = [];
        let day = calStart;
        while (day <= calEnd) {
            days.push(day);
            day = addDays(day, 1);
        }
        return days;
    }, [currentMonth]);

    const today = new Date();

    return (
        <div style={styles.card}>
            {/* Header */}
            <div style={styles.header}>
                <h4 style={styles.monthLabel}>{format(currentMonth, 'MMMM yyyy')}</h4>
                <div style={styles.navBtns}>
                    <button style={styles.navBtn} onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
                        <ChevronLeft size={16} />
                    </button>
                    <button style={styles.navBtn} onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
                        <ChevronRight size={16} />
                    </button>
                </div>
            </div>

            {/* Weekday headers */}
            <div style={styles.weekRow}>
                {WEEKDAYS.map((wd) => (
                    <span key={wd} style={styles.weekday}>{wd}</span>
                ))}
            </div>

            {/* Days Grid */}
            <div style={styles.daysGrid}>
                {calendarDays.map((d, i) => {
                    const isToday = isSameDay(d, today);
                    const inMonth = isSameMonth(d, currentMonth);
                    const dateStr = format(d, 'yyyy-MM-dd');
                    const hasEvent = eventDates.has(dateStr);

                    return (
                        <div key={i} style={styles.dayCell}>
                            <span
                                style={{
                                    ...styles.dayNum,
                                    ...(isToday ? styles.dayToday : {}),
                                    ...(!inMonth ? styles.dayMuted : {}),
                                }}
                            >
                                {format(d, 'd')}
                            </span>
                            {hasEvent && inMonth && <span style={styles.eventDot} />}
                        </div>
                    );
                })}
            </div>

            {/* Upcoming Exams */}
            {upcomingExams.length > 0 && (
                <div style={styles.upcoming}>
                    {upcomingExams.map((exam) => {
                        const examDate = parseISO(exam.date);
                        const isWeekly = exam.dayType === 'WEEKLY_TEST';
                        const accent = isWeekly ? 'var(--info)' : 'var(--warning)';
                        const title = exam.subjects?.[0]?.chapterName || exam.dayType;
                        const subjName = exam.subjects?.[0]?.subject;
                        const Icon = SUBJECT_ICONS[subjName] || BookOpen;

                        return (
                            <div key={exam.id} style={{ ...styles.examItem, borderLeftColor: accent }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                                    <div style={{ ...styles.examIconWrap, color: accent, background: accent + '10' }}>
                                        <Icon size={14} />
                                    </div>
                                    <p style={styles.examTitle}>{title}</p>
                                </div>
                                <div style={styles.examMeta}>
                                    <Clock size={12} color="var(--text-muted)" />
                                    <span>{format(examDate, 'EEE, MMM d')}</span>
                                    <span style={{ ...styles.examBadge, background: accent + '18', color: accent }}>
                                        {isWeekly ? 'Weekly Test' : 'Chapter Exam'}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

const styles = {
    card: {
        background: 'var(--bg-card)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-light)',
        padding: 20,
        boxShadow: 'var(--shadow-sm)',
    },
    header: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    monthLabel: {
        fontSize: '1rem',
        fontWeight: 700,
        color: 'var(--text-main)',
    },
    navBtns: {
        display: 'flex',
        gap: 4,
    },
    navBtn: {
        width: 28,
        height: 28,
        borderRadius: 'var(--radius-sm)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--surface-hover)',
        border: '1px solid var(--border-light)',
        cursor: 'pointer',
        color: 'var(--text-muted)',
    },
    weekRow: {
        display: 'grid',
        gridTemplateColumns: 'repeat(7, 1fr)',
        gap: 0,
        marginBottom: 4,
    },
    weekday: {
        textAlign: 'center',
        fontSize: '0.68rem',
        fontWeight: 600,
        color: 'var(--text-muted)',
        padding: '4px 0',
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
    },
    daysGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(7, 1fr)',
        gap: 2,
    },
    dayCell: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '4px 0',
        position: 'relative',
    },
    dayNum: {
        width: 30,
        height: 30,
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '0.78rem',
        fontWeight: 500,
        color: 'var(--text-main)',
        cursor: 'default',
    },
    dayToday: {
        background: 'var(--primary)',
        color: '#fff',
        fontWeight: 700,
    },
    dayMuted: {
        color: 'var(--text-muted)',
        opacity: 0.4,
    },
    eventDot: {
        width: 4,
        height: 4,
        borderRadius: '50%',
        background: 'var(--primary)',
        marginTop: 2,
    },

    upcoming: {
        marginTop: 16,
        paddingTop: 16,
        borderTop: '1px solid var(--border-light)',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
    },
    examItem: {
        padding: '12px 14px',
        borderRadius: '12px',
        background: '#fafafa',
        borderLeft: '4px solid var(--primary)',
    },
    examIconWrap: {
        width: 24,
        height: 24,
        borderRadius: 'var(--radius-sm)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
    },
    examTitle: {
        fontSize: '0.8rem',
        fontWeight: 600,
        color: 'var(--text-main)',
    },
    examMeta: {
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        fontSize: '0.7rem',
        color: 'var(--text-muted)',
        fontWeight: 500,
    },
    examBadge: {
        fontSize: '0.6rem',
        fontWeight: 600,
        padding: '2px 6px',
        borderRadius: 'var(--radius-full)',
        marginLeft: 'auto',
    },
};
