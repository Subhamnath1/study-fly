/**
 * @fileoverview useProgress — manages video progress with localStorage + Cloudflare KV sync.
 *
 * Strategy:
 *   1. On mount → Load from localStorage instantly (fast UI).
 *   2. On mount → Cloud data is loaded by AuthContext.fullSync (merged into localStorage).
 *   3. On every update → Write to localStorage immediately,
 *      and schedule debounced pushes to cloud.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { schedulePush } from '@services/cloudSync';

const LS_KEY = 'study_fly_progress';

/**
 * @typedef {Object} VideoProgress
 * @property {number}  timestamp    - Last known playback position in seconds.
 * @property {boolean} completed    - Whether the user has marked this video as done.
 * @property {string}  lastWatched  - ISO date string of last watch.
 */

/* ── localStorage helpers ── */

/** @returns {Record<string, VideoProgress>} */
function loadFromLocalStorage() {
    try {
        const raw = localStorage.getItem(LS_KEY);
        return raw ? JSON.parse(raw) : {};
    } catch {
        return {};
    }
}

/** @param {Record<string, VideoProgress>} map */
function saveToLocalStorage(map) {
    try {
        localStorage.setItem(LS_KEY, JSON.stringify(map));
    } catch {
        /* quota exceeded — non-critical */
    }
}

/**
 * Custom hook for video progress tracking.
 *
 * @returns {{
 *   progressMap: Record<string, VideoProgress>,
 *   getProgress: (videoId: string) => VideoProgress | null,
 *   saveProgress: (videoId: string, timestamp: number) => void,
 *   markAsCompleted: (videoId: string) => void,
 *   syncing: boolean
 * }}
 */
export function useProgress() {
    const [progressMap, setProgressMap] = useState(loadFromLocalStorage);
    const [syncing] = useState(false);

    /* Re-read from localStorage periodically (in case fullSync updated it) */
    useEffect(() => {
        const handleStorage = (e) => {
            if (e.key === LS_KEY) {
                try { setProgressMap(JSON.parse(e.newValue || '{}')); }
                catch { /* ignore */ }
            }
        };
        window.addEventListener('storage', handleStorage);
        return () => window.removeEventListener('storage', handleStorage);
    }, []);

    /**
     * Get progress for a specific video.
     * @param {string} videoId
     * @returns {VideoProgress | null}
     */
    const getProgress = useCallback(
        (videoId) => progressMap[videoId] ?? null,
        [progressMap],
    );

    /**
     * Save playback timestamp (debounced cloud sync).
     * @param {string} videoId
     * @param {number} timestamp
     */
    const saveProgress = useCallback(
        (videoId, timestamp) => {
            const entry = {
                timestamp,
                completed: progressMap[videoId]?.completed ?? false,
                lastWatched: new Date().toISOString(),
            };
            setProgressMap((prev) => {
                const next = { ...prev, [videoId]: entry };
                saveToLocalStorage(next);
                return next;
            });
            // Schedule cloud sync
            schedulePush();
        },
        [progressMap],
    );

    /**
     * Mark a video as completed. Triggers immediate-ish cloud sync.
     * @param {string} videoId
     */
    const markAsCompleted = useCallback(
        (videoId) => {
            const entry = {
                timestamp: progressMap[videoId]?.timestamp ?? 0,
                completed: true,
                lastWatched: new Date().toISOString(),
            };
            setProgressMap((prev) => {
                const next = { ...prev, [videoId]: entry };
                saveToLocalStorage(next);
                return next;
            });
            // Schedule cloud sync
            schedulePush();
        },
        [progressMap],
    );

    return { progressMap, getProgress, saveProgress, markAsCompleted, syncing };
}
