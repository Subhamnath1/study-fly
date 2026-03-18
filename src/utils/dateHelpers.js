/**
 * @fileoverview Date helper utilities.
 */

import { format, parseISO, isToday, isTomorrow, differenceInDays } from 'date-fns';

/**
 * Format an ISO date string into a human-readable label.
 *
 * @param {string} isoDate - YYYY-MM-DD
 * @returns {string} e.g. "Today", "Tomorrow", "Mon, Mar 3"
 */
export function formatDateLabel(isoDate) {
    const date = parseISO(isoDate);
    if (isToday(date)) return 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    return format(date, 'EEE, MMM d');
}

/**
 * Get the day-of-week abbreviation from an ISO date.
 *
 * @param {string} isoDate - YYYY-MM-DD
 * @returns {string} e.g. "MON", "TUE"
 */
export function getDayAbbr(isoDate) {
    return format(parseISO(isoDate), 'EEE').toUpperCase();
}

/**
 * Calculate how many days remain until a target date.
 *
 * @param {string} isoDate - YYYY-MM-DD
 * @returns {number} Positive if in the future, negative if past.
 */
export function daysUntil(isoDate) {
    return differenceInDays(parseISO(isoDate), new Date());
}
