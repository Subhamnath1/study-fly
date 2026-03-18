import fs from 'fs';
import path from 'path';

const SCHEDULE_PATH = 'd:/Codding/Study Fly/src/data/schedule.json';

// Backup existing schedule
const rawData = fs.readFileSync(SCHEDULE_PATH, 'utf-8');
const oldSchedule = JSON.parse(rawData);

const LOCAL_VIDEOS_PATH = 'd:/Codding/Study Fly/local_extracted_videos.json';

// Import raw local videos
const rawVideos = fs.readFileSync(LOCAL_VIDEOS_PATH, 'utf-8');
const allClasses = JSON.parse(rawVideos);

// Create separate queues for each subject
const queues = {
    Physics: allClasses.filter(c => c.subject === 'Physics'),
    Math: allClasses.filter(c => c.subject === 'Math'),
    Chemistry: allClasses.filter(c => c.subject === 'Chemistry'),
};

console.log(`Extracted: Physics (${queues.Physics.length}), Math (${queues.Math.length}), Chemistry (${queues.Chemistry.length})`);

// User's exact timetable mapping
const TIMETABLE = {
    0: { type: 'WEEKLY_TEST', Physics: '08:00 AM', Math: '02:30 PM', Chemistry: '08:00 PM' }, // Sun
    1: { type: 'CLASS', Physics: '08:00 AM', Math: '12:00 PM', Chemistry: '06:00 PM' }, // Mon
    2: { type: 'CLASS', Physics: '10:00 AM', Math: '02:00 PM', Chemistry: '07:00 PM' }, // Tue
    3: { type: 'CLASS', Physics: '08:00 AM', Math: '12:00 PM', Chemistry: '06:00 PM' }, // Wed
    4: { type: 'CLASS', Physics: '10:00 AM', Math: '01:00 PM', Chemistry: '04:30 PM' }, // Thu
    5: { type: 'CLASS', Physics: '08:00 AM', Math: '12:00 PM', Chemistry: '06:00 PM' }, // Fri
    6: { type: 'REVISION', Physics: '08:00 AM', Math: '11:00 AM', Chemistry: '07:00 PM' } // Sat
};

const START_DATE = new Date('2026-03-09'); // Start from Monday
const DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const newSchedule = [];

let currentDate = new Date(START_DATE);

// Helper to format date
function formatDateStr(d) {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

const subjects = ['Physics', 'Math', 'Chemistry'];

// Global override queue for GAP and EXAM days that pause the main timetable
const globalOverrides = [];

function isRunning() {
    return queues.Physics.length > 0 || queues.Math.length > 0 || queues.Chemistry.length > 0 || globalOverrides.length > 0;
}

while (isRunning()) {
    const dateStr = formatDateStr(currentDate);
    const dayOfWeek = currentDate.getDay();
    const dayName = DAYS[dayOfWeek];
    const timetableDay = TIMETABLE[dayOfWeek];

    const dayObj = {
        id: `${dateStr}-${dayName}`,
        date: dateStr,
        dayType: '',
        subjects: []
    };

    // 1. Process Global Overrides First (These HIJACK the entire day)
    if (globalOverrides.length > 0) {
        const override = globalOverrides.shift();

        if (override.type === 'GAP_DAY') {
            dayObj.dayType = 'GAP_PRACTICE';
            dayObj.subjects.push({
                subject: override.subject,
                chapterName: override.chapterName,
                topic: `Gap Practice & Self Study`,
                unlockTime: timetableDay[override.subject] || '10:00 AM'
            });
        } else if (override.type === 'EXAM_DAY') {
            dayObj.dayType = 'CHAPTER_EXAM';
            dayObj.subjects.push({
                subject: override.subject,
                chapterName: override.chapterName,
                topic: `Full Chapter Test: ${override.chapterName}`,
                unlockTime: '07:00 PM'
            });
        }
    } else {
        // 2. Process Normal Matrix
        let classCount = 0;
        let endedChapters = []; // Chapters that finish their last lecture today

        if (dayOfWeek === 0) {
            // Sunday Weekly Tests
            dayObj.dayType = 'WEEKLY_TEST';
            for (const subj of subjects) {
                if (queues[subj].length > 0) {
                    dayObj.subjects.push({
                        subject: subj,
                        chapterName: 'Revision',
                        topic: `${subj} Weekly Test`,
                        unlockTime: timetableDay[subj]
                    });
                }
            }
        } else if (dayOfWeek === 6) {
            // Saturday Revision
            dayObj.dayType = 'REVISION';
            for (const subj of subjects) {
                if (queues[subj].length > 0) {
                    dayObj.subjects.push({
                        subject: subj,
                        chapterName: 'Revision',
                        topic: `${subj} Revision & Doubt Catchup`,
                        unlockTime: timetableDay[subj]
                    });
                }
            }
        } else {
            // Mon-Fri Classes
            dayObj.dayType = 'CLASS';
            for (const subj of subjects) {
                if (queues[subj].length > 0) {
                    const cls = queues[subj].shift();
                    const { originalDate, ...cleanCls } = cls;
                    cleanCls.unlockTime = timetableDay[subj];
                    dayObj.subjects.push(cleanCls);
                    classCount++;

                    // Is this the final lecture for this chapter?
                    const nextCls = queues[subj][0];
                    if (!nextCls || nextCls.chapterName !== cls.chapterName) {
                        endedChapters.push({ subject: subj, chapterName: cls.chapterName });
                    }
                }
            }
        }

        // Queue the GAP and EXAM days for any chapters that just finished
        // They will execute immediately on the following days, pausing the queue
        for (const chap of endedChapters) {
            globalOverrides.push({ type: 'GAP_DAY', subject: chap.subject, chapterName: chap.chapterName });
            globalOverrides.push({ type: 'EXAM_DAY', subject: chap.subject, chapterName: chap.chapterName });
        }
    }

    if (dayObj.subjects.length > 0) {
        newSchedule.push(dayObj);
    }

    currentDate.setDate(currentDate.getDate() + 1);
}

fs.writeFileSync(SCHEDULE_PATH, JSON.stringify(newSchedule, null, 2) + '\n', 'utf-8');
console.log(`\nSuccessfully compiled custom matrix timetable with STRICT global overrides!`);
console.log(`Starts: ${newSchedule[0].date}`);
console.log(`Ends:   ${newSchedule[newSchedule.length - 1].date}`);
console.log(`Total Days: ${newSchedule.length}`);
