/**
 * @fileoverview useSchedule — custom hook for schedule-related queries.
 * Filters schedule.json into current (today), backlog (past incomplete),
 * and upcoming buckets. All date logic uses date-fns.
 */

import { useMemo } from 'react';
import { useDataContext } from '@context/DataContext';
import { format, parseISO, isBefore, isAfter, startOfDay } from 'date-fns';
import { getServerNow } from '@services/timeService';

/**
 * @typedef {Object} ScheduleFilters
 * @property {import('@context/DataContext').DayEntry | null} current   - Today's entry (or null).
 * @property {import('@context/DataContext').DayEntry[]}      backlog   - Past incomplete days.
 * @property {import('@context/DataContext').DayEntry[]}      upcoming  - Future days.
 * @property {import('@context/DataContext').DayEntry[]}      schedule  - Full schedule array.
 * @property {boolean}                                        loading   - True while data is loading.
 * @property {(subject: string) => import('@context/DataContext').DayEntry[]} getBySubject
 */

/**
 * Custom hook that reads schedule.json from DataContext and slices it
 * into time-based buckets. Filtering is fully memoised so it never
 * runs inside the render cycle.
 *
 * @returns {ScheduleFilters}
 */
export function useSchedule() {
    const { schedule, loading } = useDataContext();

    const now = getServerNow();
    const todayStr = format(now, 'yyyy-MM-dd');
    const todayStart = startOfDay(now);

    /** Today's schedule entry. */
    const current = useMemo(
        () => schedule.find((d) => d.date === todayStr) ?? null,
        [schedule, todayStr],
    );

    /**
     * Backlog — past days that are NOT marked completed.
     * Phase 4 will connect `isCompleted` to Firestore; for now every past
     * day is treated as incomplete.
     */
    const backlog = useMemo(
        () =>
            schedule.filter((d) => {
                const parsed = parseISO(d.date);
                return isBefore(parsed, todayStart);
            }),
        [schedule, todayStart],
    );

    /** Upcoming — days strictly after today. */
    const upcoming = useMemo(
        () =>
            schedule.filter((d) => {
                const parsed = parseISO(d.date);
                return isAfter(parsed, todayStart) && d.date !== todayStr;
            }),
        [schedule, todayStart, todayStr],
    );

    /**
     * Filter schedule entries containing at least one subject match.
     *
     * @param {string} subject - e.g. 'Physics'
     * @returns {import('@context/DataContext').DayEntry[]}
     */
    const getBySubject = (subject) =>
        schedule.filter((d) => d.subjects.some((s) => s.subject === subject));

    return { current, backlog, upcoming, loading, getBySubject, schedule };
}
