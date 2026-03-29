/**
 * @fileoverview Inject video durations from video_durations.txt into schedule.json and raw_curriculum.json.
 *
 * Parses the durations file, builds a lookup map of (chapterName, lectureNumber) → durationMinutes,
 * then injects `"duration"` fields into every matching VIDEO entry.
 *
 * Usage: node inject_durations.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── 1. CHAPTER NAME MAPPING ──
// Maps folder names from video_durations.txt → chapterName values in schedule/curriculum JSON.
const FOLDER_TO_CHAPTER = {
    'Solutions': 'Solutions',
    'P Block Elements': 'p-Block Elements (Groups 15, 16, 17 and 18)',
    'Matrices': 'Matrices',
    'Determinants': 'Determinants',
    'Limit Continuity and Differentiability': 'Limit Continuity and Differentiability',
    'Probability': 'Probability',
    'Relation and Function': 'Relations and Functions',
    'Inverse Trigonometry': 'Inverse Trigonometry',
    'Alcohols Phenols and Ethers': 'Alcohols Phenols and Ethers',
    'Application Of Derivatives': 'Application Of Derivatives',
    'Electrostatic Potential and capacitance': 'Electrostatic Potential & capacitance',
    'Haloalkanes and Haloarenes': 'Haloalkanes and Haloarenes',
    'Current Electricity': 'Current Electricity',
    'Moving Charges and Magnetism': 'Moving Charges and Magnetism',
    'Electromagnetic Induction': 'Electromagnetic Induction',
    'Electromagnetic Waves': 'Electromagnetic Waves',
    'Electric Charges & Fields': 'Electric Charges & Fields',
    'Alternating Current': 'Alternating Current',
    'Magnetism and Matter': 'Magnetism and Matter',
    'Biomolecules': 'Biomolecules',
    'Polymers': 'Polymers',
};

// ── 1b. HARDCODED OVERRIDES FOR MESSY CHAPTERS ──
const RELATIONS_AND_FUNCTIONS_FIX = {
    1: 112, // 1h 52m 8s
    2: 111, // 1h 50m 36s
    3: 107, // 1h 47m 12s
    4: 136, // 2h 16m 13s
    5: 113, // 1h 53m 0s
    6: 109, // 1h 49m 0s
    7: 104, // 1h 44m 12s
    8: 108, // 1h 47m 48s
    9: 109, // 1h 48m 32s
    10: 112, // 1h 51m 32s
    11: 112, // 1h 52m 24s
    12: 109, // 1h 48m 40s
    13: 106, // 1h 46m 8s
    14: 125, // 2h 4m 56s
    15: 99,  // 1h 38m 35s
    16: 110  // 1h 49m 48s
};

// ── 2. PARSE DURATIONS FILE ──
function parseDurationsFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');

    // Map: normalizedChapterName → Map<lectureNumber, durationMinutes>
    const durMap = new Map();
    let currentFolder = null;

    for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line) continue;

        // Detect folder header: "📂 Folder: Solutions"
        const folderMatch = line.match(/📂\s*Folder:\s*(.+)/);
        if (folderMatch) {
            const folderName = folderMatch[1].trim();
            const chapterName = FOLDER_TO_CHAPTER[folderName];
            if (!chapterName) {
                console.warn(`⚠️  No mapping for folder: "${folderName}"`);
                currentFolder = null;
                continue;
            }
            currentFolder = chapterName;
            if (!durMap.has(currentFolder)) {
                durMap.set(currentFolder, new Map());
            }
            continue;
        }

        // Detect video line: "1. Solutions 1.mp4 -> 🕒 1h 55m 0s"
        if (!currentFolder) continue;

        const videoMatch = line.match(/^(\d+)\.\s+(.+)\s*->\s*🕒\s*(.+)/);
        if (!videoMatch) continue;

        const lineIndex = parseInt(videoMatch[1]);
        const filename = videoMatch[2];
        const timeStr = videoMatch[3].trim();

        // Extract lecture number from filename (e.g., "RF 6" -> 6)
        // Look for digits in the filename
        const filenameNumMatch = filename.match(/(\d+)/);
        const lectureNum = filenameNumMatch ? parseInt(filenameNumMatch[1]) : lineIndex;

        // Parse time: "1h 55m 0s" or "52m 34s" or "40m 51s"
        const durationMins = parseTimeToMinutes(timeStr);
        durMap.get(currentFolder).set(lectureNum, durationMins);
    }

    for (const [chapter, fixData] of Object.entries({ 'Relations and Functions': RELATIONS_AND_FUNCTIONS_FIX })) {
        if (!durMap.has(chapter)) durMap.set(chapter, new Map());
        for (const [lec, mins] of Object.entries(fixData)) {
            durMap.get(chapter).set(parseInt(lec), mins);
        }
    }

    return durMap;
}

function parseTimeToMinutes(timeStr) {
    let totalMinutes = 0;

    const hourMatch = timeStr.match(/(\d+)h/);
    const minMatch = timeStr.match(/(\d+)m/);
    const secMatch = timeStr.match(/(\d+)s/);

    if (hourMatch) totalMinutes += parseInt(hourMatch[1]) * 60;
    if (minMatch) totalMinutes += parseInt(minMatch[1]);
    // Round up if >= 30 seconds
    if (secMatch && parseInt(secMatch[1]) >= 30) totalMinutes += 1;

    return totalMinutes;
}

// ── 3. EXTRACT LECTURE NUMBER FROM TOPIC ──
function extractLectureNumber(topic) {
    if (!topic) return null;
    const match = topic.match(/Lecture\s+(\d+)/i);
    return match ? parseInt(match[1]) : null;
}

// ── 4. NORMALIZE CHAPTER NAME FOR MATCHING ──
function normalizeChapter(name) {
    if (!name) return '';
    return name
        .replace(/\s*&\s*/g, ' and ')
        .replace(/p-block/i, 'p-Block')
        .toLowerCase()
        .trim();
}

// ── 5. INJECT INTO SCHEDULE.JSON ──
function injectSchedule(schedulePath, durMap) {
    const schedule = JSON.parse(fs.readFileSync(schedulePath, 'utf-8'));
    let injected = 0;
    let skipped = 0;

    // Build a normalized lookup
    const normalizedDurMap = new Map();
    for (const [chapter, lectures] of durMap) {
        normalizedDurMap.set(normalizeChapter(chapter), { original: chapter, lectures });
    }

    for (const day of schedule) {
        if (!day.subjects) continue;
        for (const subj of day.subjects) {
            if (subj.type !== 'VIDEO') continue;

            const lecNum = extractLectureNumber(subj.topic);
            if (!lecNum) continue;

            const normChapter = normalizeChapter(subj.chapterName);
            const entry = normalizedDurMap.get(normChapter);

            if (entry && entry.lectures.has(lecNum)) {
                subj.duration = entry.lectures.get(lecNum);
                injected++;
            } else {
                skipped++;
            }
        }
    }

    fs.writeFileSync(schedulePath, JSON.stringify(schedule, null, 2) + '\n');
    return { injected, skipped };
}

// ── 6. INJECT INTO RAW_CURRICULUM.JSON ──
function injectCurriculum(curriculumPath, durMap) {
    const curriculum = JSON.parse(fs.readFileSync(curriculumPath, 'utf-8'));
    let injected = 0;
    let skipped = 0;

    // Build a normalized lookup
    const normalizedDurMap = new Map();
    for (const [chapter, lectures] of durMap) {
        normalizedDurMap.set(normalizeChapter(chapter), { original: chapter, lectures });
    }

    for (const [subject, entries] of Object.entries(curriculum)) {
        for (const entry of entries) {
            const lecNum = extractLectureNumber(entry.topic);
            if (!lecNum) continue;

            const normChapter = normalizeChapter(entry.chapterName);
            const found = normalizedDurMap.get(normChapter);

            if (found && found.lectures.has(lecNum)) {
                entry.duration = found.lectures.get(lecNum);
                injected++;
            } else {
                skipped++;
            }
        }
    }

    fs.writeFileSync(curriculumPath, JSON.stringify(curriculum, null, 2) + '\n');
    return { injected, skipped };
}

// ── 7. MAIN ──
function main() {
    console.log('═══════════════════════════════════════════');
    console.log('  Video Duration Injection Script');
    console.log('═══════════════════════════════════════════\n');

    const durationsFile = path.resolve('C:\\Users\\mamon\\Downloads\\video_durations.txt');
    const schedulePath = path.join(__dirname, 'src', 'data', 'schedule.json');
    const curriculumPath = path.join(__dirname, 'src', 'data', 'raw_curriculum.json');

    // Parse
    console.log('📖 Parsing durations file...');
    const durMap = parseDurationsFile(durationsFile);

    let totalLectures = 0;
    for (const [chapter, lectures] of durMap) {
        console.log(`   📂 ${chapter}: ${lectures.size} lectures`);
        totalLectures += lectures.size;
    }
    console.log(`   ✅ Total: ${durMap.size} chapters, ${totalLectures} lectures\n`);

    // Inject into schedule.json
    console.log('📅 Injecting into schedule.json...');
    const schedResult = injectSchedule(schedulePath, durMap);
    console.log(`   ✅ Injected: ${schedResult.injected} | Skipped (no match): ${schedResult.skipped}\n`);

    // Inject into raw_curriculum.json
    console.log('📚 Injecting into raw_curriculum.json...');
    const currResult = injectCurriculum(curriculumPath, durMap);
    console.log(`   ✅ Injected: ${currResult.injected} | Skipped (no match): ${currResult.skipped}\n`);

    console.log('═══════════════════════════════════════════');
    console.log('  Done! ✅');
    console.log('═══════════════════════════════════════════');
}

main();
