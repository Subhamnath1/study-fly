/**
 * @fileoverview Fetch video durations from Google Drive and patch schedule.json
 * 
 * Usage: node fetch_durations.mjs
 * 
 * Approach: Uses Drive's oembed / embed endpoints to extract video duration.
 * If you have a Google API key, set GOOGLE_API_KEY env var for better results.
 */

import fs from 'fs';
import path from 'path';
import https from 'https';

const SCHEDULE_PATH = path.resolve('src', 'data', 'schedule.json');

/** Fetch a URL and return the response body */
function fetchUrl(url) {
    return new Promise((resolve, reject) => {
        const doFetch = (fetchUrl, redirectsLeft) => {
            if (redirectsLeft <= 0) return reject(new Error('Too many redirects'));
            https.get(fetchUrl, {
                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
            }, (res) => {
                if ([301, 302, 303, 307].includes(res.statusCode) && res.headers.location) {
                    return doFetch(res.headers.location, redirectsLeft - 1);
                }
                let data = '';
                res.on('data', chunk => { data += chunk; });
                res.on('end', () => resolve({ status: res.statusCode, body: data }));
            }).on('error', reject);
        };
        doFetch(url, 5);
    });
}

/** Try fetching duration using Drive API (needs GOOGLE_API_KEY env var) */
async function fetchViaApi(videoId, apiKey) {
    try {
        const url = `https://www.googleapis.com/drive/v3/files/${videoId}?fields=videoMediaMetadata&key=${apiKey}`;
        const { status, body } = await fetchUrl(url);
        if (status !== 200) return null;
        const data = JSON.parse(body);
        const millis = data?.videoMediaMetadata?.durationMillis;
        if (millis) return Math.round(parseInt(millis, 10) / 60000);
        return null;
    } catch { return null; }
}

/** Try fetching duration by scraping the embed page */
async function fetchViaScrape(videoId) {
    try {
        const url = `https://drive.google.com/file/d/${videoId}/preview`;
        const { body } = await fetchUrl(url);

        // Search for duration patterns in the HTML/JS context
        const patterns = [
            /"lengthSeconds":\s*"?(\d+)"?/,
            /"length_seconds":\s*"?(\d+)"?/,
            /\\"lengthSeconds\\":\s*\\"(\d+)\\"/,
            /duration['":\s]*(\d{2,})/i,
        ];

        for (const p of patterns) {
            const m = body.match(p);
            if (m) {
                let sec = parseInt(m[1], 10);
                if (sec > 100000) sec = Math.round(sec / 1000); // milliseconds
                const min = Math.round(sec / 60);
                if (min > 0 && min < 600) return min;
            }
        }
        return null;
    } catch { return null; }
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
    console.log('📖 Reading schedule.json...');
    const schedule = JSON.parse(fs.readFileSync(SCHEDULE_PATH, 'utf-8'));

    const apiKey = process.env.GOOGLE_API_KEY || '';
    if (apiKey) {
        console.log('🔑 Using Google API key from GOOGLE_API_KEY env var');
    } else {
        console.log('⚠️  No GOOGLE_API_KEY found — using scrape method (less reliable)');
        console.log('   Set GOOGLE_API_KEY=your_key for better results');
    }

    // Collect unique videoIds needing durations
    const videoMap = new Map(); // videoId → [{ref to subj}]
    let total = 0, have = 0;

    for (const day of schedule) {
        if (!day.subjects) continue;
        for (const subj of day.subjects) {
            if (!subj.videoId) continue;
            total++;
            if (subj.duration && subj.duration > 0) { have++; continue; }
            if (!videoMap.has(subj.videoId)) videoMap.set(subj.videoId, []);
            videoMap.get(subj.videoId).push(subj);
        }
    }

    console.log(`\n📊 Total: ${total} | Have: ${have} | Need: ${videoMap.size}\n`);

    if (videoMap.size === 0) {
        console.log('🎉 All videos have durations!');
        return;
    }

    let ok = 0, fail = 0;
    const ids = [...videoMap.keys()];

    for (let i = 0; i < ids.length; i++) {
        const videoId = ids[i];
        process.stdout.write(`  [${i + 1}/${ids.length}] ${videoId.slice(0, 24)}... `);

        let duration = null;
        if (apiKey) {
            duration = await fetchViaApi(videoId, apiKey);
        }
        if (!duration) {
            duration = await fetchViaScrape(videoId);
        }

        if (duration) {
            console.log(`✓ ${duration}m`);
            for (const ref of videoMap.get(videoId)) ref.duration = duration;
            ok++;
        } else {
            console.log('✗');
            fail++;
        }

        await sleep(500); // Rate limit
    }

    console.log(`\n✅ Fetched: ${ok} | ❌ Failed: ${fail}`);

    if (ok > 0) {
        fs.writeFileSync(SCHEDULE_PATH, JSON.stringify(schedule, null, 2) + '\n', 'utf-8');
        console.log('💾 schedule.json updated!');
    }
}

main().catch(console.error);
