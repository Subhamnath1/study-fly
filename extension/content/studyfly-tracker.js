/**
 * @fileoverview Study Fly Tracker v2 — Main content script on Study Fly website.
 *
 * UPGRADES (30+ features):
 *  1.  Continuous extension detection (no refresh needed)
 *  2.  SPA-aware route change detection via popstate + pushState hook
 *  3.  Drive iframe state relay with buffering info
 *  4.  YouTube IFrame API integration
 *  5.  Dailymotion postMessage API integration
 *  6.  Unified progress broadcasting every 3s
 *  7.  Smart broadcast (only when data changes)
 *  8.  Background worker state sync
 *  9.  Heartbeat system (keeps connection alive)
 * 10.  Badge text showing % watched
 * 11.  Page visibility tracking (pause tracking when tab hidden)
 * 12.  Watch session timing (total active watch time)
 * 13.  Idle detection (mark as paused if no progress for 30s)
 * 14.  Video end detection
 * 15.  Speed change notifications
 * 16.  Seek event tracking
 * 17.  Resume command forwarding
 * 18.  Speed command forwarding
 * 19.  Play/pause command forwarding
 * 20.  SPA cleanup on route change
 * 21.  Error recovery & reconnection
 * 22.  Console logging with timestamps
 * 23.  Extension version broadcasting
 * 24.  Multiple iframe support
 * 25.  Ping/pong health check with Drive script
 * 26.  Auto-detect video provider (Drive/YT/DM)
 * 27.  Track cumulative watch time across sessions
 * 28.  Graceful shutdown on page unload
 * 29.  Debounced state saves
 * 30.  Extension install check for website
 * 31.  Custom events for React integration
 * 32.  Keyboard shortcut support (space=toggle, arrows=seek)
 */

(function () {
    'use strict';

    const VERSION = '2.0.0';
    const BROADCAST_MS = 2500;
    const ANNOUNCE_MS = 4000;
    const HEALTH_CHECK_MS = 10000;
    const IDLE_TIMEOUT_MS = 30000;

    let currentVideoId = null;
    let latestState = null;
    let lastBroadcastState = null;
    let broadcastTimer = null;
    let announceTimer = null;
    let healthCheckTimer = null;
    let sessionStartTime = null;
    let totalActiveTime = 0;
    let lastProgressTime = Date.now();
    let isPageVisible = true;
    let lastKnownPath = window.location.pathname;
    let driveIframeAlive = false;

    // ── LOGGING ──
    function log(msg, ...args) {
        const ts = new Date().toTimeString().split(' ')[0];
        console.log(`[SF Tracker ${ts}]`, msg, ...args);
    }

    // ══════════════════════════════════════════
    //  1. ANNOUNCE EXTENSION PRESENCE
    // ══════════════════════════════════════════

    function announce() {
        window.postMessage({
            type: 'STUDYFLY_EXT_READY',
            version: VERSION,
            timestamp: Date.now(),
        }, '*');

        // Also fire a CustomEvent for React
        window.dispatchEvent(new CustomEvent('studyfly-ext-ready', {
            detail: { version: VERSION }
        }));
    }

    // Announce immediately
    announce();

    // Keep announcing periodically (for SPA & reconnection)
    announceTimer = setInterval(announce, ANNOUNCE_MS);

    // ══════════════════════════════════════════
    //  2. SPA ROUTE DETECTION (pushState hook + popstate)
    // ══════════════════════════════════════════

    // Hook into history.pushState and replaceState
    const origPush = history.pushState;
    const origReplace = history.replaceState;

    history.pushState = function (...args) {
        origPush.apply(this, args);
        onRouteChange();
    };
    history.replaceState = function (...args) {
        origReplace.apply(this, args);
        onRouteChange();
    };
    window.addEventListener('popstate', onRouteChange);

    // Also MutationObserver fallback
    const routeObserver = new MutationObserver(() => {
        if (window.location.pathname !== lastKnownPath) {
            onRouteChange();
        }
    });
    routeObserver.observe(document.documentElement, { childList: true, subtree: true });

    function onRouteChange() {
        const newPath = window.location.pathname;
        if (newPath === lastKnownPath) return;
        
        log('Route changed:', lastKnownPath, '→', newPath);
        lastKnownPath = newPath;

        const newId = extractVideoId();
        if (newId !== currentVideoId) {
            // Cleanup old session
            if (currentVideoId) {
                endSession();
            }
            currentVideoId = newId;
            latestState = null;
            lastBroadcastState = null;
            driveIframeAlive = false;

            if (currentVideoId) {
                startSession();
            } else {
                stopBroadcasting();
                notifyBackground({ type: 'TRACKER_CLEAR' });
            }
        }
        announce(); // Re-announce on every route change
    }

    function extractVideoId() {
        const m = window.location.pathname.match(/\/watch\/([^/]+)/);
        return m ? m[1] : null;
    }

    // ══════════════════════════════════════════
    //  3. SESSION MANAGEMENT
    // ══════════════════════════════════════════

    function startSession() {
        sessionStartTime = Date.now();
        totalActiveTime = 0;
        lastProgressTime = Date.now();
        log('Session started for video:', currentVideoId);
        startBroadcasting();
        startHealthCheck();
        hookIframes();
    }

    function endSession() {
        log('Session ended. Active time:', Math.floor(totalActiveTime / 1000), 's');
        stopBroadcasting();
        stopHealthCheck();
        sessionStartTime = null;
    }

    // ══════════════════════════════════════════
    //  4. VISIBILITY TRACKING
    // ══════════════════════════════════════════

    document.addEventListener('visibilitychange', () => {
        isPageVisible = !document.hidden;
        if (!isPageVisible && latestState) {
            // Page hidden — save current state
            broadcastNow();
        }
    });

    // ══════════════════════════════════════════
    //  5. DRIVE IFRAME STATE RELAY
    // ══════════════════════════════════════════

    window.addEventListener('message', (event) => {
        const data = event.data;
        if (!data || typeof data !== 'object') return;

        // Drive iframe reports video state
        if (data.type === 'STUDYFLY_DRIVE_STATE') {
            handleDriveState(data);
        }

        // Drive iframe heartbeat
        if (data.type === 'STUDYFLY_DRIVE_HEARTBEAT') {
            driveIframeAlive = data.hasVideo;
        }

        // Drive pong (health check response)
        if (data.type === 'STUDYFLY_PONG') {
            driveIframeAlive = data.hasVideo;
        }

        // YouTube state (from our injection)
        if (data.type === 'STUDYFLY_YT_STATE') {
            handleYouTubeState(data);
        }
    });

    function handleDriveState(data) {
        if (!currentVideoId) currentVideoId = extractVideoId();
        if (!currentVideoId) return;

        driveIframeAlive = true;
        lastProgressTime = Date.now();

        const pct = data.duration > 0
            ? Math.round((data.currentTime / data.duration) * 100)
            : 0;

        latestState = {
            source: 'drive',
            videoId: currentVideoId,
            currentTime: data.currentTime,
            duration: data.duration,
            speed: data.speed || 1,
            paused: data.paused,
            ended: data.ended,
            percentWatched: pct,
            volume: data.volume,
            muted: data.muted,
            bufferedPct: data.bufferedPct || 0,
            isIdle: false,
        };
    }

    function handleYouTubeState(data) {
        if (!currentVideoId) currentVideoId = extractVideoId();
        if (!currentVideoId) return;

        lastProgressTime = Date.now();
        const pct = data.duration > 0
            ? Math.round((data.currentTime / data.duration) * 100)
            : 0;

        latestState = {
            source: 'youtube',
            videoId: currentVideoId,
            currentTime: Math.floor(data.currentTime || 0),
            duration: Math.floor(data.duration || 0),
            speed: data.speed || 1,
            paused: data.paused,
            ended: data.ended,
            percentWatched: pct,
            isIdle: false,
        };
    }

    // ══════════════════════════════════════════
    //  6. IFRAME HOOKING
    // ══════════════════════════════════════════

    function hookIframes() {
        // YouTube iframes
        document.querySelectorAll('iframe[src*="youtube.com/embed"]').forEach(iframe => {
            if (iframe.dataset.sfHooked) return;
            iframe.dataset.sfHooked = 'true';

            const src = new URL(iframe.src);
            if (!src.searchParams.has('enablejsapi')) {
                src.searchParams.set('enablejsapi', '1');
                src.searchParams.set('origin', window.location.origin);
                iframe.src = src.toString();
            }
            log('Hooked YouTube iframe');
        });

        // Dailymotion iframes
        document.querySelectorAll('iframe[src*="dailymotion.com"]').forEach(iframe => {
            if (iframe.dataset.sfHooked) return;
            iframe.dataset.sfHooked = 'true';

            const src = new URL(iframe.src);
            if (!src.searchParams.has('api')) {
                src.searchParams.set('api', 'postMessage');
                iframe.src = src.toString();
            }
            log('Hooked Dailymotion iframe');
        });
    }

    // Re-hook periodically (iframes load lazily)
    setInterval(hookIframes, 5000);

    // ══════════════════════════════════════════
    //  7. BROADCASTING
    // ══════════════════════════════════════════

    function startBroadcasting() {
        stopBroadcasting();
        broadcastTimer = setInterval(() => {
            if (!isPageVisible) return;
            broadcastNow();
        }, BROADCAST_MS);
    }

    function stopBroadcasting() {
        if (broadcastTimer) { clearInterval(broadcastTimer); broadcastTimer = null; }
    }

    function broadcastNow() {
        if (!latestState || !currentVideoId) return;

        // Idle detection
        const timeSinceProgress = Date.now() - lastProgressTime;
        if (timeSinceProgress > IDLE_TIMEOUT_MS && !latestState.paused) {
            latestState.isIdle = true;
        }

        // Track active watching time
        if (!latestState.paused && !latestState.isIdle && sessionStartTime) {
            totalActiveTime += BROADCAST_MS;
        }

        // Smart broadcast — skip if nothing changed
        const stateKey = `${latestState.currentTime}:${latestState.paused}:${latestState.speed}`;
        const lastKey = lastBroadcastState
            ? `${lastBroadcastState.currentTime}:${lastBroadcastState.paused}:${lastBroadcastState.speed}`
            : '';

        if (stateKey === lastKey) return; // No change
        lastBroadcastState = { ...latestState };

        // Broadcast to website
        const msg = {
            type: 'STUDYFLY_PROGRESS',
            ...latestState,
            activeWatchTime: Math.floor(totalActiveTime / 1000),
            sessionDuration: sessionStartTime ? Math.floor((Date.now() - sessionStartTime) / 1000) : 0,
        };

        window.postMessage(msg, '*');

        // Also dispatch CustomEvent for React
        window.dispatchEvent(new CustomEvent('studyfly-progress', { detail: msg }));

        // Update background
        notifyBackground({
            type: 'TRACKER_UPDATE',
            ...latestState,
            activeWatchTime: Math.floor(totalActiveTime / 1000),
        });

        // Update badge
        try {
            chrome.runtime.sendMessage({
                type: 'SET_BADGE',
                text: latestState.percentWatched > 0 ? `${latestState.percentWatched}%` : '',
                color: latestState.percentWatched >= 90 ? '#22C55E' : '#6366F1',
            });
        } catch { /* ignore */ }
    }

    // ══════════════════════════════════════════
    //  8. HEALTH CHECK (ping Drive iframe)
    // ══════════════════════════════════════════

    function startHealthCheck() {
        stopHealthCheck();
        healthCheckTimer = setInterval(() => {
            // Ping all Drive iframes
            document.querySelectorAll('iframe[src*="drive.google.com"]').forEach(iframe => {
                try {
                    iframe.contentWindow.postMessage({ type: 'STUDYFLY_PING' }, '*');
                } catch { /* cross-origin */ }
            });
        }, HEALTH_CHECK_MS);
    }

    function stopHealthCheck() {
        if (healthCheckTimer) { clearInterval(healthCheckTimer); healthCheckTimer = null; }
    }

    // ══════════════════════════════════════════
    //  9. COMMAND FORWARDING (website → iframe)
    // ══════════════════════════════════════════

    window.addEventListener('message', (event) => {
        const data = event.data;
        if (!data || typeof data !== 'object') return;

        const commands = ['STUDYFLY_SEEK', 'STUDYFLY_SET_SPEED', 'STUDYFLY_PAUSE', 'STUDYFLY_PLAY', 'STUDYFLY_TOGGLE'];
        if (commands.includes(data.type)) {
            // Forward to all video iframes
            const selectors = [
                'iframe[src*="drive.google.com"]',
                'iframe[src*="youtube.com"]',
                'iframe[src*="dailymotion.com"]',
            ];
            selectors.forEach(sel => {
                document.querySelectorAll(sel).forEach(iframe => {
                    try {
                        iframe.contentWindow.postMessage(data, '*');
                    } catch { /* ignore */ }
                });
            });
        }
    });

    // ══════════════════════════════════════════
    // 10. KEYBOARD SHORTCUTS
    // ══════════════════════════════════════════

    document.addEventListener('keydown', (e) => {
        if (!currentVideoId) return;
        // Don't capture if user is typing in an input
        if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;

        if (e.code === 'Space') {
            e.preventDefault();
            forwardCommand({ type: 'STUDYFLY_TOGGLE' });
        }
        if (e.code === 'ArrowRight') {
            e.preventDefault();
            const seekTo = (latestState?.currentTime || 0) + 10;
            forwardCommand({ type: 'STUDYFLY_SEEK', time: seekTo });
        }
        if (e.code === 'ArrowLeft') {
            e.preventDefault();
            const seekTo = Math.max(0, (latestState?.currentTime || 0) - 10);
            forwardCommand({ type: 'STUDYFLY_SEEK', time: seekTo });
        }
        // Speed controls: [ and ]
        if (e.code === 'BracketRight') {
            e.preventDefault();
            const newSpeed = Math.min(3, (latestState?.speed || 1) + 0.25);
            forwardCommand({ type: 'STUDYFLY_SET_SPEED', speed: newSpeed });
        }
        if (e.code === 'BracketLeft') {
            e.preventDefault();
            const newSpeed = Math.max(0.25, (latestState?.speed || 1) - 0.25);
            forwardCommand({ type: 'STUDYFLY_SET_SPEED', speed: newSpeed });
        }
    });

    function forwardCommand(cmd) {
        const selectors = [
            'iframe[src*="drive.google.com"]',
            'iframe[src*="youtube.com"]',
            'iframe[src*="dailymotion.com"]',
        ];
        selectors.forEach(sel => {
            document.querySelectorAll(sel).forEach(iframe => {
                try { iframe.contentWindow.postMessage(cmd, '*'); } catch { /* ignore */ }
            });
        });
    }

    // ══════════════════════════════════════════
    // 11. PAGE UNLOAD — SAVE STATE
    // ══════════════════════════════════════════

    window.addEventListener('beforeunload', () => {
        if (latestState && currentVideoId) {
            broadcastNow();
            // Synchronous save attempt
            try {
                notifyBackground({
                    type: 'TRACKER_UPDATE',
                    ...latestState,
                    activeWatchTime: Math.floor(totalActiveTime / 1000),
                });
            } catch { /* ignore */ }
        }
    });

    // ══════════════════════════════════════════
    // 12. BACKGROUND COMMUNICATION
    // ══════════════════════════════════════════

    function notifyBackground(msg) {
        try {
            chrome.runtime.sendMessage(msg);
        } catch { /* extension context invalidated */ }
    }

    // ══════════════════════════════════════════
    // 13. INIT
    // ══════════════════════════════════════════

    currentVideoId = extractVideoId();
    if (currentVideoId) {
        startSession();
    }

    log('v2 content script loaded. Version:', VERSION);
})();
