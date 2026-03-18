/**
 * @fileoverview DataContext — loads the master schedule.json and exposes
 * it (plus helper selectors) to the component tree.
 */

import { createContext, useContext, useState, useEffect } from 'react';
import scheduleData from '@data/schedule.json';

/**
 * @typedef {Object} SubjectEntry
 * @property {string}  subject       - Physics | Chemistry | Math
 * @property {string}  chapterName
 * @property {string}  topic
 * @property {'VIDEO' | 'TEST' | 'REVISION'} type
 * @property {string}  unlockTime    - HH:mm (24-hr)
 * @property {string}  videoId       - Google Drive ID
 * @property {{ dpp: string, notes: string, solution: string }} resourceLinks
 * @property {number | null} duration - Test duration in minutes, or null
 */

/**
 * @typedef {Object} DayEntry
 * @property {string}  id
 * @property {string}  date          - YYYY-MM-DD
 * @property {'CLASS' | 'REVISION' | 'WEEKLY_TEST' | 'GAP_PRACTICE' | 'CHAPTER_EXAM'} dayType
 * @property {SubjectEntry[]} subjects
 */

/**
 * @typedef {Object} DataState
 * @property {DayEntry[]}            schedule  - Full schedule array.
 * @property {boolean}               loading   - True while loading.
 * @property {string | null}         error     - Error message if load fails.
 * @property {(date: string) => DayEntry | undefined} getDayByDate
 */

/** @type {import('react').Context<DataState | undefined>} */
const DataContext = createContext(undefined);

/**
 * Provides schedule data to the component tree.
 *
 * @param {{ children: import('react').ReactNode }} props
 * @returns {JSX.Element}
 */
export function DataProvider({ children }) {
    const [schedule, setSchedule] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        try {
            if (!Array.isArray(scheduleData)) {
                throw new Error('schedule.json root must be an array.');
            }
            setSchedule(scheduleData);
        } catch (err) {
            console.error('[DataContext] Failed to load schedule:', err);
            setError(err?.message ?? 'Failed to load schedule data.');
        } finally {
            setLoading(false);
        }
    }, []);

    /**
     * Find a specific day entry by ISO date string.
     *
     * @param {string} date - YYYY-MM-DD
     * @returns {DayEntry | undefined}
     */
    const getDayByDate = (date) => schedule.find((d) => d.date === date);

    return (
        <DataContext.Provider value={{ schedule, loading, error, getDayByDate }}>
            {children}
        </DataContext.Provider>
    );
}

/**
 * Hook to consume schedule data from the nearest `DataProvider`.
 *
 * @returns {DataState}
 * @throws {Error} If used outside of `<DataProvider>`.
 */
export function useDataContext() {
    const ctx = useContext(DataContext);
    if (ctx === undefined) {
        throw new Error('useDataContext must be used within a <DataProvider>');
    }
    return ctx;
}

export default DataContext;
