import fs from 'fs';
import path from 'path';

const SCHEDULE_PATH = 'd:/Codding/Study Fly/src/data/schedule.json';
const BACKUP_PATH = 'd:/Codding/Study Fly/src/data/schedule_backup.json';

// Backup existing schedule
const rawData = fs.readFileSync(SCHEDULE_PATH, 'utf-8');
fs.writeFileSync(BACKUP_PATH, rawData, 'utf-8');
const oldSchedule = JSON.parse(rawData);

// 1. Extract and sort all unique classes chronologically based on their original schedule
const classesMap = new Map(); // Use map to deduplicate by videoId, or by subject+topic if videoId is missing

for (const day of oldSchedule) {
    if (!day.subjects) continue;
    for (const subj of day.subjects) {
        if (day.dayType === 'CLASS' || subj.videoId) {
            const key = subj.videoId ? subj.videoId : `${subj.subject}|${subj.topic}`;
            if (!classesMap.has(key)) {
                classesMap.set(key, {
                    ...subj,
                    originalDate: day.date // Store original date for sorting
                });
            }
        }
    }
}

// Convert back to array and sort chronologically by original date
const allClasses = Array.from(classesMap.values()).sort((a, b) => {
    return new Date(a.originalDate) - new Date(b.originalDate);
});

console.log(`Total unique classes extracted: ${allClasses.length}`);

// 2. Identify the last class for each chapter
const chapterEnds = new Set();
const lastClassOfChapter = new Map(); // 'Subject|Chapter' -> index in allClasses

allClasses.forEach((cls, idx) => {
    const chapKey = `${cls.subject}|${cls.chapterName}`;
    lastClassOfChapter.set(chapKey, idx); // Overwrites until the very last one
});

lastClassOfChapter.forEach((idx, key) => {
    chapterEnds.add(idx); // Store the indices that mark the end of a chapter
});

// 3. Generate New Schedule
const newSchedule = [];
const START_DATE = new Date('2026-03-09'); // Start from tomorrow (Monday)
const DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

let currentDate = new Date(START_DATE);
let classIndex = 0;
let pendingExams = [];

// Helper to format date
function formatDateStr(d) {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

while (classIndex < allClasses.length) {
    const dateStr = formatDateStr(currentDate);
    const dayName = DAYS[currentDate.getDay()];
    const dayId = `${dateStr}-${dayName}`;

    const dayObj = {
        id: dayId,
        date: dateStr,
        dayType: '',
        subjects: []
    };

    if (currentDate.getDay() === 0) {
        // SUNDAY: Tests and Exams
        if (pendingExams.length > 0) {
            dayObj.dayType = 'CHAPTER_EXAM';
            dayObj.subjects = pendingExams.map(exam => ({
                subject: exam.subject,
                chapterName: exam.chapterName,
                topic: `Full Chapter Test: ${exam.chapterName}`,
                unlockTime: '10:00 AM'
            }));
            pendingExams = []; // Clear pending exams
        } else {
            dayObj.dayType = 'GAP_PRACTICE';
            dayObj.subjects = [{
                subject: 'All',
                chapterName: 'Revision',
                topic: 'Weekly Revision & Gap Practice',
                unlockTime: '09:00 AM'
            }];
        }
    } else {
        // MON-SAT: Regular Classes
        dayObj.dayType = 'CLASS';

        // Slot up to 2 classes per day
        for (let i = 0; i < 2 && classIndex < allClasses.length; i++) {
            const cls = allClasses[classIndex];

            // Clean up originalDate before saving
            const { originalDate, ...cleanCls } = cls;
            if (!cleanCls.unlockTime) cleanCls.unlockTime = i === 0 ? '04:00 PM' : '07:00 PM';

            dayObj.subjects.push(cleanCls);

            // Did a chapter just end?
            if (chapterEnds.has(classIndex)) {
                pendingExams.push({
                    subject: cls.subject,
                    chapterName: cls.chapterName
                });
            }

            classIndex++;
        }
    }

    newSchedule.push(dayObj);
    currentDate.setDate(currentDate.getDate() + 1);
}

// Ensure any remaining pending exams get slotted on the final Sunday or next day
while (pendingExams.length > 0) {
    const dateStr = formatDateStr(currentDate);
    const dayName = DAYS[currentDate.getDay()];
    newSchedule.push({
        id: `${dateStr}-${dayName}`,
        date: dateStr,
        dayType: 'CHAPTER_EXAM',
        subjects: pendingExams.map(exam => ({
            subject: exam.subject,
            chapterName: exam.chapterName,
            topic: `Full Chapter Test: ${exam.chapterName}`,
            unlockTime: '10:00 AM'
        }))
    });
    pendingExams = [];
}

fs.writeFileSync(SCHEDULE_PATH, JSON.stringify(newSchedule, null, 2) + '\n', 'utf-8');
console.log(`Successfully generated new schedule ending on ${newSchedule[newSchedule.length - 1].date}`);
