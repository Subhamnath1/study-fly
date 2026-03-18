/**
 * @fileoverview Server Time Service — fetches the real current time from timeapi.io.
 *
 * Why: Using `new Date()` relies on the user's local clock, which can be
 * manipulated to unlock time-locked videos early. This service fetches
 * the real IST time from a public API and provides a synced clock.
 *
 * Strategy:
 *   1. On app load → fetch server time once.
 *   2. Calculate the offset (server − local).
 *   3. All subsequent `getServerNow()` calls apply that offset to `Date.now()`.
 *   4. If the fetch fails, fallback to local time (graceful degradation).
 *
 * API: GET https://timeapi.io/api/Time/current/zone?timeZone=Asia/Kolkata
 */

const API_URL = 'https://timeapi.io/api/Time/current/zone?timeZone=Asia/Kolkata';

/** @type {number|null} Offset in ms: serverTime - localTime */
let _offset = null;

/** @type {boolean} */
let _synced = false;

/** @type {boolean} */
let _syncing = false;

/**
 * Fetch the server time and compute the offset.
 * Called once on app init. Safe to call multiple times — deduplicates.
 *
 * @returns {Promise<void>}
 */
export async function syncServerTime() {
    if (_synced || _syncing) return;
    _syncing = true;

    try {
        const res = await fetch(API_URL);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const data = await res.json();
        const serverDate = new Date(data.dateTime);

        if (isNaN(serverDate.getTime())) {
            throw new Error('Invalid date from API');
        }

        _offset = serverDate.getTime() - Date.now();
        _synced = true;
        console.info(
            `[TimeService] Synced — offset: ${_offset}ms (${(_offset / 1000).toFixed(1)}s)`,
        );
    } catch (err) {
        console.warn('[TimeService] Sync failed, using local time:', err.message);
        _offset = 0;
        _synced = true; // Don't retry — fallback gracefully
    } finally {
        _syncing = false;
    }
}

/**
 * Get the current server-synced Date.
 * If not yet synced, returns local time (fallback).
 *
 * @returns {Date}
 */
export function getServerNow() {
    if (_offset === null) return new Date();
    return new Date(Date.now() + _offset);
}

/**
 * Check if the time service has synced.
 * @returns {boolean}
 */
export function isSynced() {
    return _synced;
}

/**
 * Get the raw offset in milliseconds.
 * Positive = server is ahead. Negative = server is behind.
 * @returns {number|null}
 */
export function getOffset() {
    return _offset;
}
