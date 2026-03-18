/**
 * @fileoverview Time helper utilities — server-synced unlock-time checks, countdowns, etc.
 *
 * All functions use `getServerNow()` from the time service to prevent
 * users from manipulating their local clock to bypass time locks.
 */

import { getServerNow } from '@services/timeService';

/**
 * Helper to parse "hh:mm AM/PM" or "HH:mm" into 24-hour integers.
 * @param {string} timeStr - Time string, e.g. "10:00 AM" or "14:30"
 * @returns {{ hours: number, minutes: number }}
 */
function parseTimeString(timeStr) {
    if (!timeStr) return { hours: 0, minutes: 0 };
    const str = timeStr.toUpperCase().replace(/\u202F/g, ' ').trim();
    if (!str.includes('M')) {
        const [h, m] = str.split(':').map(Number);
        return { hours: h || 0, minutes: m || 0 };
    }
    const match = str.match(/(\d+):(\d+)\s*(AM|PM)/);
    if (!match) return { hours: 0, minutes: 0 };
    let hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    const period = match[3];
    if (period === 'PM' && hours < 12) hours += 12;
    else if (period === 'AM' && hours === 12) hours = 0;
    return { hours, minutes };
}

/**
 * Check if a given unlock time (HH:mm or AM/PM) has passed for today.
 *
 * @param {string} unlockTime - Format e.g. "10:00 AM" or "08:00"
 * @returns {boolean} True if the current time is at or past the unlock time.
 */
export function isUnlocked(unlockTime) {
    const { hours, minutes } = parseTimeString(unlockTime);
    const now = getServerNow();
    const unlock = new Date(now);
    unlock.setHours(hours, minutes, 0, 0);
    return now >= unlock;
}

/**
 * Calculate seconds remaining until an unlock time today.
 * Returns 0 if the time has already passed.
 *
 * @param {string} unlockTime - Format e.g. "10:00 AM" or "18:00"
 * @returns {number} Seconds remaining (≥ 0).
 */
export function secondsUntilUnlock(unlockTime) {
    const { hours, minutes } = parseTimeString(unlockTime);
    const now = getServerNow();
    const unlock = new Date(now);
    unlock.setHours(hours, minutes, 0, 0);
    const diff = Math.floor((unlock.getTime() - now.getTime()) / 1000);
    return diff > 0 ? diff : 0;
}

/**
 * Format a number of seconds into a "HH:MM:SS" countdown string.
 *
 * @param {number} totalSeconds
 * @returns {string} e.g. "02:30:15"
 */
export function formatCountdown(totalSeconds) {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return [h, m, s].map((n) => String(n).padStart(2, '0')).join(':');
}
