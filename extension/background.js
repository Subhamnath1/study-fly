/**
 * @fileoverview Background service worker v2 for Study Fly Tracker.
 * 
 * UPGRADES:
 *  - Badge text showing % watched
 *  - Watch time accumulation
 *  - Session history
 *  - Extension install/update handling
 *  - Context menu integration
 */

// On install
chrome.runtime.onInstalled.addListener((details) => {
    chrome.storage.local.set({
        enabled: true,
        currentVideo: null,
        totalTrackedSeconds: 0,
        lastActivity: null,
        watchHistory: [],
        installDate: Date.now(),
    });

    // Set default badge
    chrome.action.setBadgeBackgroundColor({ color: '#6366F1' });
    chrome.action.setBadgeText({ text: '' });

    if (details.reason === 'install') {
        console.log('[SF Tracker] Fresh install!');
    } else if (details.reason === 'update') {
        console.log('[SF Tracker] Updated to v2!');
    }
});

// Listen for messages
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === 'TRACKER_UPDATE') {
        const videoData = {
            videoId: msg.videoId,
            currentTime: msg.currentTime,
            duration: msg.duration,
            speed: msg.speed,
            percentWatched: msg.percentWatched,
            paused: msg.paused,
            ended: msg.ended,
            source: msg.source,
            activeWatchTime: msg.activeWatchTime || 0,
            timestamp: Date.now(),
        };

        chrome.storage.local.get(['totalTrackedSeconds', 'watchHistory'], (data) => {
            const updates = {
                currentVideo: videoData,
                lastActivity: Date.now(),
            };

            // Accumulate tracked time
            if (msg.activeWatchTime > 0) {
                updates.totalTrackedSeconds = Math.max(
                    data.totalTrackedSeconds || 0,
                    msg.activeWatchTime
                );
            }

            // Add to watch history (last 50 entries, deduplicated)
            const history = data.watchHistory || [];
            const existing = history.findIndex(h => h.videoId === msg.videoId);
            const historyEntry = {
                videoId: msg.videoId,
                percentWatched: msg.percentWatched,
                lastTime: Date.now(),
            };
            if (existing >= 0) {
                history[existing] = historyEntry;
            } else {
                history.unshift(historyEntry);
                if (history.length > 50) history.pop();
            }
            updates.watchHistory = history;

            chrome.storage.local.set(updates);
        });

        sendResponse({ ok: true });
    }

    if (msg.type === 'TRACKER_CLEAR') {
        chrome.storage.local.set({ currentVideo: null });
        chrome.action.setBadgeText({ text: '' });
        sendResponse({ ok: true });
    }

    if (msg.type === 'SET_BADGE') {
        try {
            chrome.action.setBadgeText({ text: msg.text || '' });
            chrome.action.setBadgeBackgroundColor({ color: msg.color || '#6366F1' });
        } catch { /* ignore */ }
        sendResponse({ ok: true });
    }

    if (msg.type === 'GET_STATE') {
        chrome.storage.local.get(
            ['enabled', 'currentVideo', 'lastActivity', 'totalTrackedSeconds', 'watchHistory', 'installDate'],
            (data) => { sendResponse(data); }
        );
        return true; // async
    }

    return false;
});

// Clear badge when no activity for 60s
setInterval(() => {
    chrome.storage.local.get(['currentVideo'], (data) => {
        if (data.currentVideo && (Date.now() - data.currentVideo.timestamp) > 60000) {
            chrome.storage.local.set({ currentVideo: null });
            chrome.action.setBadgeText({ text: '' });
        }
    });
}, 30000);
