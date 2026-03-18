import fs from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCHEDULE_PATH = path.join(__dirname, 'src', 'data', 'schedule.json');

const schedule = JSON.parse(fs.readFileSync(SCHEDULE_PATH, 'utf-8'));

// 1. Identify the last CLASS date for each chapter.
const chapterLastDate = {};
const chapterNames = new Set(); // to help map topics to chapters

for (const day of schedule) {
    if (!day.subjects) continue;
    for (const subj of day.subjects) {
        if (day.dayType === 'CLASS') {
            const key = subj.subject + '|' + subj.chapterName;
            chapterNames.add(key);
            if (!chapterLastDate[key] || day.date > chapterLastDate[key]) {
                chapterLastDate[key] = day.date;
            }
        }
    }
}

// 2. Extract out all non-CLASS events and try to map them to a chapter.
const nonClassEvents = [];

for (const day of schedule) {
    if (!day.subjects) continue;

    // We will keep only CLASS events in the original days array.
    let keepSubjects = [];

    for (const subj of day.subjects) {
        if (day.dayType === 'CLASS') {
            keepSubjects.push(subj);
        } else {
            // It's a non-class event!
            // Let's find its matching chapter.
            let matchedChapter = subj.chapterName;

            if (!matchedChapter) {
                // Try to infer from topic, e.g., "Full Chapter Test: Relations and Functions"
                for (const name of chapterNames) {
                    const [s, cName] = name.split('|');
                    if (subj.subject === s && subj.topic && subj.topic.includes(cName)) {
                        matchedChapter = cName;
                        break;
                    }
                }
            }

            nonClassEvents.push({
                originalDayType: day.dayType,
                date: day.date,
                duration: subj.duration,
                subject: subj.subject,
                topic: subj.topic,
                chapterName: matchedChapter,
            });
        }
    }

    day.subjects = keepSubjects;
}

// Group nonClassEvents by chapter
const examsByChapter = {};
for (const ev of nonClassEvents) {
    const key = ev.subject + '|' + (ev.chapterName || 'Unknown');
    if (!examsByChapter[key]) examsByChapter[key] = [];
    examsByChapter[key].push(ev);
}

// Helper: add days to string YYYY-MM-DD
function addDaysStr(dateStr, days) {
    const d = new Date(dateStr);
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
}
const DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

// Create an event map from the CURRENT schedule (which now only has CLASS events)
const updatedScheduleMap = {};
for (const day of schedule) {
    updatedScheduleMap[day.date] = day;
}

// 3. Re-insert the exams/revisions sequentially AFTER the last class date of their chapter.
let examsMoved = 0;

for (const key of Object.keys(examsByChapter)) {
    if (key.includes('Unknown')) continue; // Skip if we couldn't map it

    const lastDate = chapterLastDate[key];
    if (!lastDate) {
        console.warn('No last date found for', key);
        continue;
    }

    const events = examsByChapter[key];
    // Sort events by priority: REVISION -> GAP_PRACTICE -> WEEKLY_TEST -> CHAPTER_EXAM
    const order = { 'REVISION': 1, 'GAP_PRACTICE': 2, 'WEEKLY_TEST': 3, 'CHAPTER_EXAM': 4 };
    events.sort((a, b) => (order[a.originalDayType] || 99) - (order[b.originalDayType] || 99));

    // Place them 1 day after another, starting 1 day after the last class
    for (let i = 0; i < events.length; i++) {
        const ev = events[i];
        const newDateStr = addDaysStr(lastDate, i + 1); // 1 day after, then 2 days after, etc.
        const dayName = DAYS[new Date(newDateStr).getDay()];
        const newIdStr = newDateStr + '-' + dayName;

        // Find or create the day entry
        if (!updatedScheduleMap[newDateStr]) {
            updatedScheduleMap[newDateStr] = {
                id: newIdStr,
                date: newDateStr,
                dayType: ev.originalDayType,
                subjects: []
            };
        } else {
            // If the day already exists, let's update its dayType if it's currently a lesser priority,
            // or if it was just a regular class, we keep it as a mixed day.
            // Actually, if it's an exam day, the user's UI expects it to show as 'CHAPTER_EXAM' or 'REVISION'.
            updatedScheduleMap[newDateStr].dayType = ev.originalDayType; // Override for now so the UI shows the red dot
        }

        updatedScheduleMap[newDateStr].subjects.push({
            subject: ev.subject,
            topic: ev.topic,
            chapterName: ev.chapterName,
            unlockTime: '19:00', // Assign generic evening time
        });

        examsMoved++;
    }
}

// Map it back to an array and sort by date
const finalSchedule = Object.values(updatedScheduleMap).sort((a, b) => a.date.localeCompare(b.date));

fs.writeFileSync(SCHEDULE_PATH, JSON.stringify(finalSchedule, null, 2) + '\n', 'utf-8');
console.log('Successfully re-scheduled ' + examsMoved + ' chapter exams and revisions!');
