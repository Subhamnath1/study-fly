/**
 * @fileoverview Cloud Sync Service — syncs user progress to Cloudflare KV.
 *
 * All progress data (video, DPP, exam) is bundled under the user's
 * Telegram @username key in the USER_DATA KV namespace.
 *
 * Strategy:
 *   - On login: pull cloud data → merge with localStorage → apply
 *   - On changes: save to localStorage instantly + debounced push to cloud
 */

const WORKER_URL = import.meta.env.VITE_WORKER_URL
    || 'https://study-fly-bot.study-fly-bot.workers.dev';

const SYNC_DEBOUNCE_MS = 5_000;
let _debounceTimer = null;
let _currentUsername = null;

const SESSION_KEY = 'study_fly_user_session';

/**
 * Get the current user's Telegram username from localStorage session.
 * @returns {string|null}
 */
export function getUsername() {
    if (_currentUsername) return _currentUsername;
    try {
        const session = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
        return session?.username || null;
    } catch { return null; }
}

// ── localStorage key patterns ──

const LS_PROGRESS_KEY = 'study_fly_progress';

/**
 * Collect all user progress from localStorage into one object.
 * @returns {Object} Unified progress data packet
 */
export function collectAllProgress() {
    const data = {
        videoProgress: {},
        dppCompleted: {},
        dppSaves: {},
        examOmr: {},
        examSubmitted: {},
    };

    // 1. Video progress
    try {
        const raw = localStorage.getItem(LS_PROGRESS_KEY);
        if (raw) data.videoProgress = JSON.parse(raw);
    } catch { /* ignore */ }

    // 2. DPP completed + saves
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith('dpp_completed_')) {
            const dppId = key.replace('dpp_completed_', '');
            data.dppCompleted[dppId] = true;
        } else if (key.startsWith('dpp_save_')) {
            const dppId = key.replace('dpp_save_', '');
            try {
                data.dppSaves[dppId] = JSON.parse(localStorage.getItem(key));
            } catch { /* ignore */ }
        }
    }

    // 3. Exam OMR + submitted
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.endsWith('_omr')) {
            const examId = key.replace('_omr', '');
            try {
                data.examOmr[examId] = JSON.parse(localStorage.getItem(key));
            } catch { /* ignore */ }
        } else if (key.endsWith('_submitted')) {
            const examId = key.replace('_submitted', '');
            data.examSubmitted[examId] = localStorage.getItem(key) === 'true';
        }
    }

    return data;
}

/**
 * Apply cloud data into localStorage keys.
 * @param {Object} cloudData - Data from cloud KV
 */
export function applyProgressToLocal(cloudData) {
    if (!cloudData) return;

    // 1. Video progress — merge (prefer whichever has later lastWatched)
    if (cloudData.videoProgress) {
        const local = (() => {
            try { return JSON.parse(localStorage.getItem(LS_PROGRESS_KEY) || '{}'); }
            catch { return {}; }
        })();

        const merged = { ...local };
        for (const [id, entry] of Object.entries(cloudData.videoProgress)) {
            if (!merged[id] || (entry.lastWatched > (merged[id].lastWatched || ''))) {
                merged[id] = entry;
            }
        }
        localStorage.setItem(LS_PROGRESS_KEY, JSON.stringify(merged));
    }

    // 2. DPP completed
    if (cloudData.dppCompleted) {
        for (const [dppId, val] of Object.entries(cloudData.dppCompleted)) {
            if (val) localStorage.setItem(`dpp_completed_${dppId}`, 'true');
        }
    }

    // 3. DPP saves
    if (cloudData.dppSaves) {
        for (const [dppId, saveData] of Object.entries(cloudData.dppSaves)) {
            // Only apply if no local save exists (don't overwrite in-progress work)
            if (!localStorage.getItem(`dpp_save_${dppId}`)) {
                localStorage.setItem(`dpp_save_${dppId}`, JSON.stringify(saveData));
            }
        }
    }

    // 4. Exam OMR
    if (cloudData.examOmr) {
        for (const [examId, omr] of Object.entries(cloudData.examOmr)) {
            if (!localStorage.getItem(`${examId}_omr`)) {
                localStorage.setItem(`${examId}_omr`, JSON.stringify(omr));
            }
        }
    }

    // 5. Exam submitted
    if (cloudData.examSubmitted) {
        for (const [examId, val] of Object.entries(cloudData.examSubmitted)) {
            if (val) localStorage.setItem(`${examId}_submitted`, 'true');
        }
    }
}

/**
 * Load user data from cloud and merge into localStorage.
 * @param {string} username - Telegram @username
 * @returns {Promise<Object|null>} Cloud data or null
 */
export async function loadFromCloud(username) {
    if (!username) return null;
    _currentUsername = username;

    try {
        const res = await fetch(`${WORKER_URL}/api/user-data?username=${encodeURIComponent(username)}`);
        const json = await res.json();

        if (json.data) {
            applyProgressToLocal(json.data);
            console.log('[CloudSync] Loaded and merged cloud data for', username);
            return json.data;
        }
        console.log('[CloudSync] No cloud data found for', username);
        return null;
    } catch (err) {
        console.warn('[CloudSync] Failed to load from cloud:', err);
        return null;
    }
}

/**
 * Push current localStorage progress to cloud.
 * @param {string} [username] - Telegram @username (uses cached if not provided)
 * @returns {Promise<boolean>} Success
 */
export async function pushToCloud(username) {
    const user = username || _currentUsername;
    if (!user) return false;

    try {
        const data = collectAllProgress();
        const res = await fetch(`${WORKER_URL}/api/user-data`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: user, data }),
        });
        const json = await res.json();
        if (json.success) {
            console.log('[CloudSync] Pushed to cloud at', json.lastSynced);
            return true;
        }
        return false;
    } catch (err) {
        console.warn('[CloudSync] Failed to push to cloud:', err);
        return false;
    }
}

/**
 * Schedule a debounced push to cloud (5s delay).
 * Call this after any progress change.
 * @param {string} [username]
 */
export function schedulePush(username) {
    const user = username || _currentUsername || getUsername();
    if (!user) return;

    if (_debounceTimer) clearTimeout(_debounceTimer);
    _debounceTimer = setTimeout(() => pushToCloud(user), SYNC_DEBOUNCE_MS);
}

/**
 * Full sync: load from cloud → merge → push merged back.
 * Call this on login.
 * @param {string} username
 */
export async function fullSync(username) {
    if (!username) return;
    _currentUsername = username;

    // 1. Pull cloud data and merge into local
    await loadFromCloud(username);

    // 2. Push merged local back to cloud (so cloud gets any local-only data)
    await pushToCloud(username);
}
