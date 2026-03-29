/**
 * @fileoverview Popup script v2 — richer UI with progress circle, stats, and live updates.
 */

const CIRCUMFERENCE = 2 * Math.PI * 34; // r=34

function formatTime(secs) {
    if (!secs || secs <= 0) return '0:00';
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = Math.floor(secs % 60);
    const mm = String(m).padStart(2, '0');
    const ss = String(s).padStart(2, '0');
    return h > 0 ? `${h}:${mm}:${ss}` : `${m}:${ss}`;
}

function formatWatchTime(totalSecs) {
    if (totalSecs < 60) return `${totalSecs}s`;
    if (totalSecs < 3600) return `${Math.floor(totalSecs / 60)}m`;
    const h = Math.floor(totalSecs / 3600);
    const m = Math.floor((totalSecs % 3600) / 60);
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function updateUI() {
    chrome.runtime.sendMessage({ type: 'GET_STATE' }, (state) => {
        if (chrome.runtime.lastError || !state) {
            setStatus('error', 'Cannot reach extension');
            return;
        }

        const dot = document.getElementById('pulseDot');
        const statusBar = document.getElementById('statusBar');
        const statusText = document.getElementById('statusText');
        const trackingCard = document.getElementById('trackingCard');

        const video = state.currentVideo;
        const isRecent = video && (Date.now() - video.timestamp) < 20000;

        // Stats
        document.getElementById('totalTime').textContent = formatWatchTime(state.totalTrackedSeconds || 0);
        document.getElementById('videosTracked').textContent = (state.watchHistory || []).length;

        if (isRecent && video.videoId) {
            // ── TRACKING STATE ──
            dot.className = 'pulse-dot tracking';
            statusBar.className = 'status-bar tracking';
            statusText.textContent = video.paused ? '⏸️ Paused' : '🔴 Live Tracking';
            trackingCard.style.display = 'flex';

            // Source badge
            const source = (video.source || 'drive').toUpperCase();
            document.getElementById('trackingSource').textContent = source;

            // Progress circle
            const pct = video.percentWatched || 0;
            const offset = CIRCUMFERENCE - (pct / 100) * CIRCUMFERENCE;
            document.getElementById('progressCircle').style.strokeDashoffset = offset;
            document.getElementById('progressPctText').textContent = pct + '%';

            // Add SVG gradient (inject once)
            injectSVGGradient();

            // Time bar
            document.getElementById('timeCurrent').textContent = formatTime(video.currentTime);
            document.getElementById('timeTotal').textContent = formatTime(video.duration);
            document.getElementById('timeBarFill').style.width = pct + '%';

            // Speed
            const speed = video.speed || 1;
            document.getElementById('speedText').textContent = speed + 'x';
            document.getElementById('speedChip').style.borderColor =
                speed !== 1 ? 'rgba(245, 158, 11, 0.3)' : 'rgba(255, 255, 255, 0.06)';

            // State
            if (video.ended) {
                document.getElementById('stateIcon').textContent = '✅';
                document.getElementById('stateText').textContent = 'Finished';
            } else if (video.paused) {
                document.getElementById('stateIcon').textContent = '⏸️';
                document.getElementById('stateText').textContent = 'Paused';
            } else {
                document.getElementById('stateIcon').textContent = '▶️';
                document.getElementById('stateText').textContent = 'Playing';
            }
        } else {
            // ── READY STATE ──
            dot.className = 'pulse-dot active';
            statusBar.className = 'status-bar active';
            statusText.textContent = '✅ Ready — Open a video to start tracking';
            trackingCard.style.display = 'none';
        }
    });
}

let gradientInjected = false;
function injectSVGGradient() {
    if (gradientInjected) return;
    const svg = document.querySelector('.progress-circle');
    if (!svg) return;
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    const grad = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
    grad.id = 'popupGrad';
    grad.setAttribute('x1', '0%');
    grad.setAttribute('y1', '0%');
    grad.setAttribute('x2', '100%');
    grad.setAttribute('y2', '100%');
    const s1 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
    s1.setAttribute('offset', '0%');
    s1.setAttribute('stop-color', '#6366f1');
    const s2 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
    s2.setAttribute('offset', '100%');
    s2.setAttribute('stop-color', '#a78bfa');
    grad.appendChild(s1);
    grad.appendChild(s2);
    defs.appendChild(grad);
    svg.insertBefore(defs, svg.firstChild);
    gradientInjected = true;
}

function setStatus(type, text) {
    const dot = document.getElementById('pulseDot');
    const statusBar = document.getElementById('statusBar');
    document.getElementById('statusText').textContent = text;
    if (type === 'error') {
        dot.className = 'pulse-dot';
        statusBar.className = 'status-bar';
    }
}

// Init
updateUI();
setInterval(updateUI, 2000);
