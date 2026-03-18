import fs from 'fs';
import path from 'path';

const BASE_DIR = 'D:/Class 12 Science/Semester III';

function extractId(url) {
    const match = url.match(/\/d\/(.*?)\//);
    return match ? match[1] : null;
}

const extractedClasses = [];

function parseDir(subject) {
    const dirMap = {
        Physics: 'Physics',
        Math: 'Mathematics',
        Chemistry: 'Chemistry'
    };

    const dir = path.join(BASE_DIR, dirMap[subject]);
    if (!fs.existsSync(dir)) return;

    const files = fs.readdirSync(dir).filter(f => f.endsWith('.txt'));

    for (const file of files) {
        const content = fs.readFileSync(path.join(dir, file), 'utf-8');
        const lines = content.split('\n');

        let currentChapter = '';

        for (let line of lines) {
            line = line.trim();
            if (!line) continue;

            if (line.toLowerCase().startsWith('chapter') || line.toLowerCase().startsWith('unit')) {
                // e.g. "Chapter 1: Electric Charges & Fields" or "Unit 1 : Solutions"
                currentChapter = line.split(':').slice(1).join(':').trim();
            } else if (line.includes('drive.google.com')) {
                const links = line.split(',').map(l => l.trim()).filter(l => l.includes('drive.google.com'));

                links.forEach((link, idx) => {
                    const videoId = extractId(link);
                    if (videoId) {
                        extractedClasses.push({
                            subject: subject,
                            chapterName: currentChapter || file.replace('.txt', '').replace(/^Unit \d+ /i, ''),
                            topic: `Lecture ${idx + 1}`,
                            type: 'VIDEO',
                            videoId: videoId
                        });
                    }
                });
            }
        }
    }
}

parseDir('Physics');
parseDir('Chemistry');
parseDir('Math');

console.log('Extracted videos:', extractedClasses.length);
console.log('Sample:', extractedClasses[0]);

fs.writeFileSync('d:/Codding/Study Fly/local_extracted_videos.json', JSON.stringify(extractedClasses, null, 2), 'utf-8');
