import fs from 'fs';
import path from 'path';
import cron from 'node-cron';
import TelegramBot from 'node-telegram-bot-api';

// Telegram Bot Token provided by User
const token = '8644741851:AAFxgricErodCecg8hTsPkystoDfYDTohVQ';
const bot = new TelegramBot(token, { polling: true });

// Local database to store subscribed chat IDs
const DB_FILE = path.join(process.cwd(), 'telegram_subscribers.json');
const SCHEDULE_FILE = path.join(process.cwd(), 'src', 'data', 'schedule.json');

// Initialize missing DB
if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify([]));
}

function getSubscribers() {
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
}

function addSubscriber(chatId) {
    const subs = getSubscribers();
    if (!subs.includes(chatId)) {
        subs.push(chatId);
        fs.writeFileSync(DB_FILE, JSON.stringify(subs));
    }
}

function removeSubscriber(chatId) {
    let subs = getSubscribers();
    subs = subs.filter(id => id !== chatId);
    fs.writeFileSync(DB_FILE, JSON.stringify(subs));
}

// ── Bot Commands ──

bot.onText(/\/start(.*)/, (msg) => {
    const chatId = msg.chat.id;
    addSubscriber(chatId);
    console.log(`[Telegram] New subscriber: ${chatId} (${msg.from.first_name})`);

    const welcomeMsg = `
👋 Welcome to *Study Fly Notifications*, ${msg.from.first_name}!

You are now subscribed. I will automatically send you:
🚀 *Thumbnails & Links* exactly when a new Class unlocks.
📝 *Exam Reminders* when a Chapter Test starts.

You can stop these anytime by typing /stop.
    `;
    bot.sendMessage(chatId, welcomeMsg, { parse_mode: 'Markdown' });
});

bot.onText(/\/stop/, (msg) => {
    const chatId = msg.chat.id;
    removeSubscriber(chatId);
    console.log(`[Telegram] Unsubscribed: ${chatId}`);
    bot.sendMessage(chatId, '🔕 You have been unsubscribed from all class notifications.');
});

bot.onText(/\/test/, async (msg) => {
    const chatId = msg.chat.id;
    console.log(`[Telegram] Test notification requested by: ${chatId}`);

    const dummySubject = {
        subject: "Physics",
        topic: "Unit 2: Current Electricity - Test Notification",
        duration: "01:15:30",
        videoId: "1_2_dummy_video_example",
        type: "VIDEO",
        // Valid placeholder thumbnail for testing via URL
        thumbnail: "https://images.unsplash.com/photo-1636466497217-26a8cbeaf0aa?q=80&w=800&auto=format&fit=crop"
    };

    await broadcastEvent(dummySubject, 'CLASS', [chatId]);
});

// ── Schedule Polling ──

function loadSchedule() {
    try {
        return JSON.parse(fs.readFileSync(SCHEDULE_FILE, 'utf-8'));
    } catch (e) {
        console.error('[Cron] Failed to load schedule.json', e);
        return null;
    }
}

/**
 * Checks the schedule.json file to see if any `unlockTime` exactly matches the current system time.
 */
function checkScheduleForLiveClasses() {
    const scheduleData = loadSchedule();
    if (!Array.isArray(scheduleData)) return;

    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const todayStr = `${year}-${month}-${day}`;

    const todaySchedule = scheduleData.find(d => d.date === todayStr);

    if (!todaySchedule || !todaySchedule.subjects) return;

    // Format current time as 'hh:mm A'
    let hours = now.getHours();
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const currentTimeStr = `${String(hours).padStart(2, '0')}:${minutes} ${ampm}`;

    todaySchedule.subjects.forEach(subj => {
        if (subj.unlockTime === currentTimeStr) {
            console.log(`[Cron] Broadcasting LIVE event: ${subj.subject} - ${subj.topic}`);
            broadcastEvent(subj, todaySchedule.dayType);
        }
    });
}

/**
 * Broadcasts the live class to all subscribed Telegram users (or specific target chats), including Thumbnail if present.
 */
async function broadcastEvent(subj, dayType, targetChats = null) {
    const subs = targetChats || getSubscribers();
    if (subs.length === 0) return;

    const emoji = dayType === 'CHAPTER_EXAM' ? '📝' : '🚀';
    const typeStr = dayType === 'CHAPTER_EXAM' ? 'EXAM' : 'CLASS';

    // Construct rich message
    const caption = `
${emoji} *${subj.subject} ${typeStr} IS LIVE!*
    
*Topic*: ${subj.topic}
*Duration*: ${subj.duration ?? 'Unknown'}

Watch it now on your Dashboard!
    `;

    // Inline button back to the web app
    const replyMarkup = {
        inline_keyboard: [[
            { text: "🏫 Open Dashboard", url: "https://main.study-fly.pages.dev/dashboard" }
        ]]
    };

    // If there is a video link attached, include a direct button to the app's video player
    if (subj.videoId) {
        const link = `https://main.study-fly.pages.dev/watch/${subj.videoId}`;
        replyMarkup.inline_keyboard.push([{ text: "▶️ Watch Video", url: link }]);
    }

    // Send to all
    for (const chatId of subs) {
        try {
            if (subj.thumbnail) {
                // Send rich photo with caption
                await bot.sendPhoto(chatId, subj.thumbnail, {
                    caption: caption,
                    parse_mode: 'Markdown',
                    reply_markup: replyMarkup
                });
            } else {
                // Send text only
                await bot.sendMessage(chatId, caption, {
                    parse_mode: 'Markdown',
                    reply_markup: replyMarkup
                });
            }
        } catch (e) {
            console.error(`[Telegram] Failed to send to ${chatId}:`, e.message);
        }
    }
}

// ── Start Cron Job ──

// Run every minute at 0 seconds
cron.schedule('* * * * *', () => {
    // console.log('[Cron] Checking schedule tick...', new Date().toLocaleTimeString());
    checkScheduleForLiveClasses();
});

console.log('✈️ Study Fly Telegram Bot is running...');
