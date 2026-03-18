/**
 * @fileoverview Fetch video durations from Google Drive and patch schedule.json
 * 
 * Usage: node fetch_durations.js
 * 
 * This script reads schedule.json, finds all unique videoIds with missing durations,
 * fetches their metadata from Google Drive, and updates the JSON file.
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const SCHEDULE_PATH = path.join(__dirname, 'src', 'data', 'schedule.json');

/** Fetch a URL and return the response body as a string */
function fetchUrl(url, maxRedirects = 5) {
    return new Promise((resolve, reject) => {
        const doFetch = (fetchUrl, redirectsLeft) => {
            const parsedUrl = new URL(fetchUrl);
            const options = {
                hostname: parsedUrl.hostname,
                path: parsedUrl.pathname + parsedUrl.search,
                method: 'GET',
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                },
            };

            https.get(options, (res) => {
                // Follow redirects
                if ((res.statusCode === 301 || res.statusCode === 302 || res.statusCode === 303) && res.headers.location) {
                    if (redirectsLeft <= 0) return reject(new Error('Too many redirects'));
                    return doFetch(res.headers.location, redirectsLeft - 1);
                }

                let data = '';
                res.on('data', chunk => { data += chunk; });
                res.on('end', () => resolve(data));
            }).on('error', reject);
        };
        doFetch(url, maxRedirects);
    });
}

/** 
 * Try to get video duration from Google Drive file info page.
 * Uses the /file/d/{id}/view page which contains video metadata.
 */
async function fetchDurationFromDrive(videoId) {
    try {
        // Method 1: Try the info URL which sometimes has duration in meta tags
        const url = `https://drive.google.com/file/d/${videoId}/view`;
        const html = await fetchUrl(url);

        // Look for duration patterns in the HTML/JS
        // Drive embeds video length as "lengthSeconds":"XXX" or similar patterns
        const patterns = [
            /"lengthSeconds"\s*:\s*"?(\d+)"?/,
            /"duration"\s*:\s*"?(\d+)"?/,
            /length[_-]?seconds['":\s]+(\d+)/i,
            /videoMediaMetadata.*?durationMillis['":\s]+(\d+)/,
        ];

        for (const pattern of patterns) {
            const match = html.match(pattern);
            if (match) {
                let seconds = parseInt(match[1], 10);
                // If it looks like milliseconds, convert
                if (seconds > 100000) seconds = Math.round(seconds / 1000);
                const minutes = Math.round(seconds / 60);
                if (minutes > 0 && minutes < 600) { // Sanity check: 0-10 hours
                    return minutes;
                }
            }
        }

        return null;
    } catch (err) {
        console.error(`  ✗ Error fetching ${videoId}: ${err.message}`);
        return null;
    }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
    console.log('📖 Reading schedule.json...');
    const schedule = JSON.parse(fs.readFileSync(SCHEDULE_PATH, 'utf-8'));

    // Collect all unique videoIds that need durations
    const videosNeedingDuration = new Map(); // videoId → array of references
    let totalVideos = 0;
    let alreadyHaveDuration = 0;

    for (const day of schedule) {
        if (!day.subjects) continue;
        for (const subj of day.subjects) {
            if (!subj.videoId) continue;
            totalVideos++;
            if (subj.duration && subj.duration > 0) {
                alreadyHaveDuration++;
                continue;
            }
            if (!videosNeedingDuration.has(subj.videoId)) {
                videosNeedingDuration.set(subj.videoId, []);
            }
            videosNeedingDuration.get(subj.videoId).push(subj);
        }
    }

    console.log(`📊 Total videos: ${totalVideos}`);
    console.log(`✅ Already have duration: ${alreadyHaveDuration}`);
    console.log(`🔍 Need to fetch: ${videosNeedingDuration.size}`);
    console.log('');

    if (videosNeedingDuration.size === 0) {
        console.log('🎉 All videos already have durations! Nothing to do.');
        return;
    }

    let fetched = 0;
    let failed = 0;

    for (const [videoId, refs] of videosNeedingDuration) {
        process.stdout.write(`  Fetching [${fetched + failed + 1}/${videosNeedingDuration.size}] ${videoId.substring(0, 20)}... `);

        const duration = await fetchDurationFromDrive(videoId);

        if (duration) {
            console.log(`✓ ${duration} min`);
            // Update all references to this videoId
            for (const ref of refs) {
                ref.duration = duration;
            }
            fetched++;
        } else {
            console.log('✗ Could not extract');
            failed++;
        }

        // Rate limit: small delay between requests
        await sleep(300);
    }

    console.log('');
    console.log(`📊 Results: ${fetched} fetched, ${failed} failed`);

    // Write back
    fs.writeFileSync(SCHEDULE_PATH, JSON.stringify(schedule, null, 2) + '\n', 'utf-8');
    console.log('💾 schedule.json updated!');
}

main().catch(console.error);
