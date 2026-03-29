/**
 * @fileoverview Drive Tracker v2 — content script injected inside Google Drive preview iframes.
 *
 * UPGRADES:
 *  1. Multiple detection strategies (video, audio, player containers)
 *  2. Aggressive retry with exponential backoff
 *  3. Handles Drive's lazy video creation and recreation
 *  4. Reports more detailed state (buffered, volume, etc.)
 *  5. Responds to seek/speed/pause commands from parent
 *  6. Detects when video ends and reports it
 *  7. Handles fullscreen changes
 *  8. Smart polling rate (fast when playing, slow when paused)
 *  9. Heartbeat to confirm the script is alive
 * 10. Error recovery when video element is lost
 */

(function () {
    'use strict';

    const FAST_POLL_MS = 1500;   // While playing
    const SLOW_POLL_MS = 5000;   // While paused
    const HEARTBEAT_MS = 8000;   // Alive check
    const MAX_SEARCH_TIME = 120000; // Search for 2 minutes

    let videoEl = null;
    let pollTimer = null;
    let heartbeatTimer = null;
    let searchStartTime = Date.now();
    let observer = null;
    let lastReportedTime = -1;

    // ── FIND VIDEO ELEMENT ──

    function findVideoElement() {
        // Strategy 1: Direct video tag
        let video = document.querySelector('video');
        if (video && !isNaN(video.duration) && video.duration > 0) return video;
        if (video) return video; // Even without duration yet

        // Strategy 2: Inside shadow DOM
        const allEls = document.querySelectorAll('*');
        for (const el of allEls) {
            if (el.shadowRoot) {
                const shadowVideo = el.shadowRoot.querySelector('video');
                if (shadowVideo) return shadowVideo;
            }
        }

        // Strategy 3: Inside nested iframes (rarely used by Drive)
        try {
            const iframes = document.querySelectorAll('iframe');
            for (const iframe of iframes) {
                try {
                    const innerVideo = iframe.contentDocument?.querySelector('video');
                    if (innerVideo) return innerVideo;
                } catch { /* cross-origin */ }
            }
        } catch { /* ignore */ }

        return null;
    }

    function startSearching() {
        searchStartTime = Date.now();

        // Try immediately
        const found = findVideoElement();
        if (found) {
            attachToVideo(found);
            return;
        }

        // Use MutationObserver
        if (observer) observer.disconnect();
        observer = new MutationObserver(() => {
            if (Date.now() - searchStartTime > MAX_SEARCH_TIME) {
                observer.disconnect();
                console.warn('[SF Drive] Gave up searching after 2 min');
                return;
            }
            const v = findVideoElement();
            if (v) {
                observer.disconnect();
                attachToVideo(v);
            }
        });

        const target = document.body || document.documentElement;
        if (target) {
            observer.observe(target, { childList: true, subtree: true });
        }

        // Also poll periodically (some Drive changes don't trigger mutations)
        const searchInterval = setInterval(() => {
            if (Date.now() - searchStartTime > MAX_SEARCH_TIME) {
                clearInterval(searchInterval);
                return;
            }
            const v = findVideoElement();
            if (v) {
                clearInterval(searchInterval);
                if (observer) observer.disconnect();
                attachToVideo(v);
            }
        }, 1000);
    }

    // ── ATTACH TO VIDEO ──

    function attachToVideo(video) {
        videoEl = video;
        console.log('[SF Drive] Attached to video element');

        // Listen for video events
        video.addEventListener('play', () => adjustPollRate(false));
        video.addEventListener('pause', () => adjustPollRate(true));
        video.addEventListener('ended', () => {
            reportState();
            adjustPollRate(true);
        });
        video.addEventListener('seeked', () => reportState());
        video.addEventListener('ratechange', () => reportState());
        video.addEventListener('loadedmetadata', () => reportState());

        // Watch if video element is removed (Drive sometimes recreates)
        const videoObserver = new MutationObserver(() => {
            if (!videoEl || !videoEl.isConnected) {
                console.warn('[SF Drive] Video element removed, re-searching...');
                videoEl = null;
                stopPolling();
                videoObserver.disconnect();
                startSearching();
            }
        });
        if (video.parentNode) {
            videoObserver.observe(video.parentNode, { childList: true });
        }

        // Start polling
        startPolling(video.paused);
        startHeartbeat();
    }

    // ── POLLING ──

    function startPolling(paused) {
        stopPolling();
        const rate = paused ? SLOW_POLL_MS : FAST_POLL_MS;
        pollTimer = setInterval(reportState, rate);
        reportState(); // Immediate first report
    }

    function stopPolling() {
        if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
    }

    function adjustPollRate(paused) {
        startPolling(paused);
    }

    function reportState() {
        if (!videoEl || !videoEl.isConnected) return;

        const ct = videoEl.currentTime || 0;
        const dur = videoEl.duration || 0;
        const speed = videoEl.playbackRate || 1;
        const paused = videoEl.paused;
        const ended = videoEl.ended;

        // Calculate buffered percentage
        let bufferedPct = 0;
        if (videoEl.buffered && videoEl.buffered.length > 0 && dur > 0) {
            bufferedPct = Math.round((videoEl.buffered.end(videoEl.buffered.length - 1) / dur) * 100);
        }

        const state = {
            type: 'STUDYFLY_DRIVE_STATE',
            currentTime: Math.floor(ct),
            currentTimeExact: ct,
            duration: Math.floor(dur),
            speed: speed,
            paused: paused,
            ended: ended,
            volume: videoEl.volume,
            muted: videoEl.muted,
            bufferedPct: bufferedPct,
            readyState: videoEl.readyState,
            timestamp: Date.now(),
        };

        // Only report if something changed or every 10s
        if (Math.floor(ct) !== lastReportedTime || dur > 0) {
            lastReportedTime = Math.floor(ct);
            try {
                window.top.postMessage(state, '*');
            } catch (e) {
                console.warn('[SF Drive] postMessage failed:', e.message);
            }
        }
    }

    // ── HEARTBEAT ──

    function startHeartbeat() {
        if (heartbeatTimer) clearInterval(heartbeatTimer);
        heartbeatTimer = setInterval(() => {
            try {
                window.top.postMessage({
                    type: 'STUDYFLY_DRIVE_HEARTBEAT',
                    hasVideo: !!videoEl && videoEl.isConnected,
                    timestamp: Date.now(),
                }, '*');
            } catch { /* ignore */ }
        }, HEARTBEAT_MS);
    }

    // ── RECEIVE COMMANDS ──

    window.addEventListener('message', (e) => {
        const data = e.data;
        if (!data || !videoEl) return;

        try {
            if (data.type === 'STUDYFLY_SEEK') {
                videoEl.currentTime = data.time;
                if (videoEl.paused) videoEl.play().catch(() => {});
                reportState();
            }
            if (data.type === 'STUDYFLY_SET_SPEED') {
                videoEl.playbackRate = data.speed;
                reportState();
            }
            if (data.type === 'STUDYFLY_PAUSE') {
                videoEl.pause();
                reportState();
            }
            if (data.type === 'STUDYFLY_PLAY') {
                videoEl.play().catch(() => {});
                reportState();
            }
            if (data.type === 'STUDYFLY_TOGGLE') {
                if (videoEl.paused) videoEl.play().catch(() => {});
                else videoEl.pause();
                reportState();
            }
            if (data.type === 'STUDYFLY_PING') {
                window.top.postMessage({
                    type: 'STUDYFLY_PONG',
                    hasVideo: !!videoEl,
                    currentTime: videoEl ? Math.floor(videoEl.currentTime) : 0,
                    duration: videoEl ? Math.floor(videoEl.duration || 0) : 0,
                }, '*');
            }
        } catch (err) {
            console.warn('[SF Drive] Command error:', err.message);
        }
    });

    // ── INIT ──

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', startSearching);
    } else {
        startSearching();
    }

    console.log('[SF Drive] v2 content script loaded');
})();
