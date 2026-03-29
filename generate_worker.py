# Generator for worker/src/index.js
import os

worker_code = """/**
 * @fileoverview Cloudflare Worker — Study Fly Bot Server (Mega Upgrade).
 *
 * Handles:
 *  1. Telegram Webhook for Login Bot (/webhook/login)
 *  2. Telegram Webhook for Notification Bot (/webhook/notify)
 *  3. Login Token REST API (/api/auth/token, /api/auth/status)
 *  4. Cron Trigger — checks schedule every minute (notifications, reminders, summaries)
 *  5. API Endpoints for user progress saving / retrieving
 *  6. LLM proxy for Mistral AI
 */

// ==========================================
// 1. HELPERS & CONSTANTS
// ==========================================

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
};

function corsResponse(body, status = 200) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    });
}

function htmlEscape(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

async function tg(token, method, body) {
    const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
    return res.json();
}

const QUOTES = [
    "The secret of getting ahead is getting started.",
    "It always seems impossible until it's done.",
    "Don't stop when you're tired. Stop when you're done.",
    "Study while others are sleeping; work while others are loafing; prepare while others are playing; and dream while others are wishing.",
    "Success is no accident. It is hard work, perseverance, learning, studying, sacrifice and most of all, love of what you are doing or learning to do.",
    "The future belongs to those who believe in the beauty of their dreams.",
    "Strive for progress, not perfection."
];

// Time calculation helper for IST
function getISTDate() {
    const now = new Date();
    // Use en-US to get reliable parsing format strings
    const str = now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" });
    return new Date(str);
}

function parseTimeToMins(timeStr) {
    if (!timeStr) return 0;
    const match = timeStr.match(/(\\d+):(\\d+)\\s*(AM|PM)/i);
    if (!match) return 0;
    let h = parseInt(match[1]);
    let m = parseInt(match[2]);
    let ampm = match[3].toUpperCase();
    if (h === 12 && ampm === 'AM') h = 0;
    if (h < 12 && ampm === 'PM') h += 12;
    return h * 60 + m;
}

// Convert MM/DD/YYYY from toLocaleString to YYYY-MM-DD
function formatISTDateForJSON(istDate) {
    const y = istDate.getFullYear();
    const m = String(istDate.getMonth() + 1).padStart(2, '0');
    const d = String(istDate.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

// Format hh:mm A
function formatISTTimeForJSON(istDate) {
    let h = istDate.getHours();
    const m = String(istDate.getMinutes()).padStart(2, '0');
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12;
    if (h === 0) h = 12;
    const hh = String(h).padStart(2, '0');
    return `${hh}:${m} ${ampm}`;
}

// ==========================================
// 2. LOGIN BOT HANDLER
// ==========================================

async function handleLoginWebhook(update, env) {
    const msg = update.message;
    if (!msg?.text) return;

    const chatId = msg.chat.id;
    const user = msg.from;
    const text = msg.text;

    const startMatch = text.match(/^\\/start\\s*(.*)/);
    if (!startMatch) return;

    const token = startMatch[1]?.trim();
    const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ');

    if (!token) {
        await tg(env.LOGIN_BOT_TOKEN, 'sendMessage', {
            chat_id: chatId,
            text: '<b>Welcome to Study Fly Login Bot!</b>\\n\\nTo login, please click <i>"Login with Telegram"</i> on the Study Fly website.',
            parse_mode: 'HTML',
        });
        return;
    }

    const tokenData = await env.LOGIN_TOKENS.get(token, 'json');
    if (!tokenData) {
        await tg(env.LOGIN_BOT_TOKEN, 'sendMessage', { chat_id: chatId, text: '❌ Invalid or expired login token.' });
        return;
    }

    if (tokenData.status === 'confirmed') {
        await tg(env.LOGIN_BOT_TOKEN, 'sendMessage', { chat_id: chatId, text: '✅ You are already logged in!' });
        return;
    }

    const userData = {
        id: user.id,
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        username: user.username || '',
        photo_url: '',
    };

    await env.LOGIN_TOKENS.put(token, JSON.stringify({
        status: 'confirmed',
        telegramUser: userData,
        confirmedAt: new Date().toISOString(),
    }), { expirationTtl: 300 });

    await tg(env.LOGIN_BOT_TOKEN, 'sendMessage', {
        chat_id: chatId,
        text: `✅ <b>Login Successful!</b>\\n\\nWelcome, <b>${htmlEscape(fullName)}</b>!\\nReturn to the Study Fly website to continue.`,
        parse_mode: 'HTML',
    });
}

// ==========================================
// 3. NOTIFY BOT HANDLER & COMMANDS
// ==========================================

async function handleNotifyWebhook(update, env) {
    if (update.callback_query) {
        return await handleCallbackQuery(update.callback_query, env);
    }

    const msg = update.message;
    if (!msg?.text) return;

    const chatId = msg.chat.id;
    const text = msg.text.trim();
    const cmd = text.split(' ')[0].toLowerCase();
    const firstName = htmlEscape(msg.from.first_name || 'Student');

    // Basic user info
    let subData = await env.SUBSCRIBERS.get(`sub:${chatId}`, 'json');

    switch (cmd) {
        case '/start':
            if (!subData) {
                subData = { chatId, name: msg.from.first_name, subscribedAt: new Date().toISOString(), dnd: false, interactions: 1 };
            }
            await env.SUBSCRIBERS.put(`sub:${chatId}`, JSON.stringify(subData));

            const welcomeMsg = `🎓 <b>Welcome to Study Fly Notify, ${firstName}!</b>

I am your personal study assistant. I will send you:
🚀 <b>Class Links</b> the moment they unlock
⏳ <b>Pre-class reminders</b> (15m before)
📝 <b>Exam Alerts</b> and countdowns
📊 <b>Morning & Night recaps</b>

Explore commands with /help`;

            await tg(env.NOTIFY_BOT_TOKEN, 'sendPhoto', {
                chat_id: chatId,
                photo: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=800&auto=format&fit=crop',
                caption: welcomeMsg,
                parse_mode: 'HTML',
                reply_markup: {
                    inline_keyboard: [
                        [{ text: '🏫 Open Dashboard', url: `${env.SITE_URL || 'https://study-fly.pages.dev'}/dashboard` }],
                        [{ text: '❓ View Help', callback_data: 'cmd_help' }, { text: '📅 Today', callback_data: 'cmd_today' }]
                    ]
                }
            });
            break;

        case '/stop':
            await env.SUBSCRIBERS.delete(`sub:${chatId}`);
            await tg(env.NOTIFY_BOT_TOKEN, 'sendMessage', { chat_id: chatId, text: '🔕 You have been unsubscribed. Use /start to join again.' });
            break;

        case '/help':
            await sendHelpMenu(chatId, env);
            break;

        case '/today':
            await sendScheduleForDay(chatId, env, 0, "Today's Schedule");
            break;

        case '/tomorrow':
            await sendScheduleForDay(chatId, env, 1, "Tomorrow's Schedule");
            break;

        case '/week':
            await sendWeekOverview(chatId, env);
            break;

        case '/next':
            await sendNextClass(chatId, env);
            break;

        case '/exam':
            await sendUpcomingExams(chatId, env);
            break;

        case '/stats':
            await sendBotStats(chatId, env);
            break;

        case '/streak':
            if (subData) {
                subData.interactions = (subData.interactions || 0) + 1;
                await env.SUBSCRIBERS.put(`sub:${chatId}`, JSON.stringify(subData));
            }
            await tg(env.NOTIFY_BOT_TOKEN, 'sendMessage', {
                chat_id: chatId,
                text: `🔥 <b>Interaction Streak!</b>\\n\\nYou have interacted with the bot <b>${subData?.interactions || 1}</b> times.\\nKeep up the momentum and stay consistent!`,
                parse_mode: 'HTML'
            });
            break;

        case '/quote':
            const q = QUOTES[Math.floor(Math.random() * QUOTES.length)];
            await tg(env.NOTIFY_BOT_TOKEN, 'sendMessage', {
                chat_id: chatId,
                text: `💡 <b>Daily Motivation</b>\\n\\n<i>"${q}"</i>`,
                parse_mode: 'HTML'
            });
            break;

        case '/dnd':
            if (!subData) return;
            subData.dnd = !subData.dnd;
            await env.SUBSCRIBERS.put(`sub:${chatId}`, JSON.stringify(subData));
            await tg(env.NOTIFY_BOT_TOKEN, 'sendMessage', {
                chat_id: chatId,
                text: subData.dnd ? '🌙 <b>Do Not Disturb is ON</b>.\\nYou will not receive automated notifications (commands still work).' : '☀️ <b>Do Not Disturb is OFF</b>.\\nYou will now receive all notifications.',
                parse_mode: 'HTML'
            });
            break;

        case '/calendar':
            await tg(env.NOTIFY_BOT_TOKEN, 'sendMessage', {
                chat_id: chatId,
                text: `📅 <b>Study Fly Calendar</b>\\n\\nView your full interactive calendar on the web:`,
                parse_mode: 'HTML',
                reply_markup: {
                    inline_keyboard: [[{ text: "🗓 Open Calendar", url: `${env.SITE_URL || 'https://study-fly.pages.dev'}/calendar` }]]
                }
            });
            break;

        case '/id':
            const status = subData ? (subData.dnd ? 'Paused (DND)' : 'Active') : 'Not Subscribed';
            await tg(env.NOTIFY_BOT_TOKEN, 'sendMessage', {
                chat_id: chatId,
                text: `👤 <b>Your Info</b>\\nID: <code>${chatId}</code>\\nStatus: ${status}\\nName: ${firstName}`,
                parse_mode: 'HTML'
            });
            break;

        case '/ping':
            await tg(env.NOTIFY_BOT_TOKEN, 'sendMessage', { chat_id: chatId, text: `🏓 <b>Pong!</b>\\nSystem is operational.\\nTime (IST): ${formatISTTimeForJSON(getISTDate())}`, parse_mode: 'HTML' });
            break;

        case '/feedback':
            const fbText = text.replace('/feedback', '').trim();
            if (!fbText) {
                await tg(env.NOTIFY_BOT_TOKEN, 'sendMessage', { chat_id: chatId, text: '✍️ Please include a message. Example: <code>/feedback Add dark mode!</code>', parse_mode: 'HTML' });
            } else {
                const fbKey = `feedback:${chatId}:${Date.now()}`;
                await env.USER_DATA.put(fbKey, JSON.stringify({ user: firstName, chatId, message: fbText, date: new Date().toISOString() }));
                await tg(env.NOTIFY_BOT_TOKEN, 'sendMessage', { chat_id: chatId, text: '✅ Thank you! Your feedback has been recorded.', parse_mode: 'HTML' });
            }
            break;

        case '/subjects':
            await sendSubjectsOverview(chatId, env);
            break;
            
        case '/test':
            const dummySubj = {
                subject: 'Physics', topic: 'Testing Mega Update Notification', duration: '01:15:30', 
                videoId: 'dummy', type: 'VIDEO', thumbnail: 'https://images.unsplash.com/photo-1636466497217-26a8cbeaf0aa?q=80&w=800&auto=format&fit=crop'
            };
            await broadcastToChat(env, chatId, dummySubj, 'CLASS', 'LIVE');
            break;

        default:
            // Unrecognized
            if (text.startsWith('/')) {
                await tg(env.NOTIFY_BOT_TOKEN, 'sendMessage', { chat_id: chatId, text: '❌ Unknown command. Tap /help for a list of valid commands.' });
            }
            break;
    }
}

// ==========================================
// 4. CALLBACK QUERIES
// ==========================================

async function handleCallbackQuery(cb, env) {
    const data = cb.data;
    const chatId = cb.message.chat.id;

    if (data === 'cmd_help') {
        await sendHelpMenu(chatId, env);
    } else if (data === 'cmd_today') {
        await sendScheduleForDay(chatId, env, 0, "Today's Schedule");
    } else if (data === 'cmd_tomorrow') {
        await sendScheduleForDay(chatId, env, 1, "Tomorrow's Schedule");
    }

    // Answer to remove loading spinner
    await tg(env.NOTIFY_BOT_TOKEN, 'answerCallbackQuery', { callback_query_id: cb.id });
}

// ==========================================
// 5. COMMAND ASSISTANTS
// ==========================================

async function sendHelpMenu(chatId, env) {
    const text = `🛠 <b>Command Center</b>

<b>📅 Schedule</b>
/today - Today's classes
/tomorrow - Tomorrow's classes
/week - 7-day overview
/next - Next upcoming class
/exam - Upcoming chapter tests

<b>⚙️ Utilities & Settings</b>
/dnd - Toggle Do Not Disturb
/stats - View bot statistics
/streak - View your interaction streak
/quote - Daily motivation
/calendar - Link to full calendar
/subjects - Progress overviews
/feedback - Send us an idea
/id - Your profile details

<i>Tap any command above to trigger it!</i>`;
    await tg(env.NOTIFY_BOT_TOKEN, 'sendMessage', { chat_id: chatId, text, parse_mode: 'HTML' });
}

async function sendScheduleForDay(chatId, env, dayOffset, title) {
    const scheduleRaw = await env.SCHEDULE.get('schedule_data');
    if (!scheduleRaw) return;
    const schedule = JSON.parse(scheduleRaw);

    const ist = getISTDate();
    ist.setDate(ist.getDate() + dayOffset);
    const targetDate = formatISTDateForJSON(ist);

    const entry = schedule.find(d => d.date === targetDate);
    if (!entry || !entry.subjects || entry.subjects.length === 0) {
        let msg = `📅 <b>${title}</b> (${targetDate})\\n\\n`;
        if (entry && entry.dayType === 'HOLIDAY') msg += `🌴 <b>Vacation / Holiday!</b>\\nEnjoy your break!`;
        else msg += `📭 No classes scheduled for this day.`;
        return await tg(env.NOTIFY_BOT_TOKEN, 'sendMessage', { chat_id: chatId, text: msg, parse_mode: 'HTML' });
    }

    let msg = `📅 <b>${title}</b> (${targetDate})\\n`;
    if (entry.dayType === 'CHAPTER_EXAM') msg += `⚠️ <b>EXAM DAY</b>\\n\\n`;
    else if (entry.dayType === 'WEEKLY_TEST') msg += `📝 <b>WEEKLY TEST</b>\\n\\n`;
    else if (entry.dayType === 'REVISION' || entry.dayType === 'GAP_PRACTICE') msg += `🧘 <b>REVISION DAY</b>\\n\\n`;
    else msg += `\\n`;

    for (const s of entry.subjects) {
        msg += `🔹 <b>${htmlEscape(s.subject)}</b> @ ${s.unlockTime}\\n`;
        msg += `   ╰ ${htmlEscape(s.topic)}\\n\\n`;
    }

    await tg(env.NOTIFY_BOT_TOKEN, 'sendMessage', { chat_id: chatId, text: msg, parse_mode: 'HTML' });
}

async function sendWeekOverview(chatId, env) {
    const scheduleRaw = await env.SCHEDULE.get('schedule_data');
    if (!scheduleRaw) return;
    const schedule = JSON.parse(scheduleRaw);
    
    const ist = getISTDate();
    let msg = `📆 <b>Upcoming 7 Days</b>\\n\\n`;

    for (let i = 0; i < 7; i++) {
        const d = new Date(ist);
        d.setDate(d.getDate() + i);
        const dStr = formatISTDateForJSON(d);
        const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
        
        const entry = schedule.find(x => x.date === dStr);
        if (!entry) {
            msg += `<b>${dayName}</b> (${dStr.substring(5)}): 📭 None\\n`;
            continue;
        }

        let icon = '📘';
        if (entry.dayType === 'CHAPTER_EXAM' || entry.dayType === 'WEEKLY_TEST') icon = '📝';
        if (entry.dayType === 'REVISION' || entry.dayType === 'GAP_PRACTICE') icon = '🧘';
        if (entry.dayType === 'HOLIDAY') icon = '🌴';
        
        let subText = entry.subjects ? `${entry.subjects.length} events` : 'Empty';
        msg += `<b>${dayName}</b> (${dStr.substring(5)}): ${icon} ${subText}\\n`;
    }

    await tg(env.NOTIFY_BOT_TOKEN, 'sendMessage', { chat_id: chatId, text: msg, parse_mode: 'HTML' });
}

async function sendUpcomingExams(chatId, env) {
    const scheduleRaw = await env.SCHEDULE.get('schedule_data');
    if (!scheduleRaw) return;
    const schedule = JSON.parse(scheduleRaw);
    const today = formatISTDateForJSON(getISTDate());

    let exams = [];
    for (const d of schedule) {
        if (d.date >= today && (d.dayType === 'CHAPTER_EXAM' || d.dayType === 'WEEKLY_TEST' || (d.subjects && d.subjects.some(s => s.topic.includes("Test"))))) {
            exams.push(d);
            if (exams.length >= 5) break;
        }
    }

    let msg = `📝 <b>Upcoming Exams</b>\\n\\n`;
    if (exams.length === 0) msg += `No upcoming exams found! 🎉`;
    else {
        for (const e of exams) {
            msg += `🗓 <b>${e.date}</b> (${e.dayType})\\n`;
            for (const s of e.subjects) {
                if (s.topic.includes('Test')) {
                    msg += `   ╰ ${htmlEscape(s.subject)}: ${htmlEscape(s.topic)}\\n`;
                }
            }
            msg += `\\n`;
        }
    }

    await tg(env.NOTIFY_BOT_TOKEN, 'sendMessage', { chat_id: chatId, text: msg, parse_mode: 'HTML' });
}

async function sendNextClass(chatId, env) {
    const scheduleRaw = await env.SCHEDULE.get('schedule_data');
    if (!scheduleRaw) return;
    const schedule = JSON.parse(scheduleRaw);
    const ist = getISTDate();
    const todayStr = formatISTDateForJSON(ist);
    const nowMins = parseTimeToMins(formatISTTimeForJSON(ist));

    let nextClass = null;
    let nextDate = null;

    for (const d of schedule) {
        if (d.date < todayStr) continue;
        if (!d.subjects) continue;

        for (const s of d.subjects) {
            const classMins = parseTimeToMins(s.unlockTime);
            if (d.date === todayStr && classMins <= nowMins) continue;

            if (!nextClass) {
                nextClass = s;
                nextDate = d.date;
                break;
            }
        }
        if (nextClass) break;
    }

    if (!nextClass) {
        return await tg(env.NOTIFY_BOT_TOKEN, 'sendMessage', { chat_id: chatId, text: `📭 No upcoming classes found.` });
    }

    const tCode = nextDate === todayStr ? 'Today' : nextDate;
    await tg(env.NOTIFY_BOT_TOKEN, 'sendMessage', {
        chat_id: chatId,
        text: `⏳ <b>Next Class Incoming</b>\\n\\n🔹 <b>${htmlEscape(nextClass.subject)}</b>\\n╰ ${htmlEscape(nextClass.topic)}\\n\\n⏰ <b>${nextClass.unlockTime}</b> (${tCode})`,
        parse_mode: 'HTML'
    });
}

async function sendBotStats(chatId, env) {
    let subCount = 0;
    const subList = await env.SUBSCRIBERS.list({ prefix: 'sub:' });
    subCount = subList.keys.length;

    const cronRecord = await env.SCHEDULE.get('last_cron_run', 'json');
    const cronStatus = cronRecord ? `Active (Last: ${cronRecord.time})` : 'Offline';

    const msg = `📊 <b>Bot & System Stats</b>\\n\\n👥 Total Subscribers: <b>${subCount}</b>\\n⚙️ Cron Heartbeat: ${cronStatus}\\n⏱ Engine Version: v2.0 (MegaUpgrade)\\n\\n<i>Your study sidekick is running perfectly!</i>`;
    await tg(env.NOTIFY_BOT_TOKEN, 'sendMessage', { chat_id: chatId, text: msg, parse_mode: 'HTML' });
}

async function sendSubjectsOverview(chatId, env) {
    // Just a quick placeholder list for subjects. 
    const msg = `📚 <b>Active Subjects</b>\\n\\n⚛️ <b>Physics</b>: Active\\n➗ <b>Math</b>: Active\\n🧪 <b>Chemistry</b>: Active\\n\\nUse dashboard to track exact completion %.`;
    await tg(env.NOTIFY_BOT_TOKEN, 'sendMessage', { chat_id: chatId, text: msg, parse_mode: 'HTML' });
}

// ==========================================
// 6. BROADCAST (RICH UI CARDS)
// ==========================================

// type: 'REMINDER' | 'LIVE' | 'SUMMARY'
async function broadcastToChat(env, chatId, subj, dayType, notifType = 'LIVE') {
    const isExam = dayType === 'CHAPTER_EXAM' || dayType === 'WEEKLY_TEST';
    const siteUrl = env.SITE_URL || 'https://study-fly.pages.dev';

    let title, emoji, border;
    
    if (notifType === 'REMINDER') {
        emoji = '⏳'; title = 'STARTS IN 15 MIN';
    } else {
        emoji = isExam ? '📝' : '🚀'; 
        title = isExam ? 'EXAM IS LIVE' : 'CLASS IS LIVE';
    }

    const caption = `${emoji} <b>${subj.subject.toUpperCase()} ${title}!</b>
    
📚 <b>Topic:</b> ${htmlEscape(subj.topic)}
⏱ <b>Time:</b> ${subj.unlockTime}
${subj.duration ? `🕰 <b>Duration:</b> ${subj.duration}` : ''}

<i>${notifType === 'REMINDER' ? 'Grab your notes & get ready!' : 'Head to your dashboard to start.'}</i>`;

    const replyMarkup = { inline_keyboard: [[{ text: '🏫 Open Dashboard', url: `${siteUrl}/dashboard` }]] };
    if (subj.videoId && notifType === 'LIVE') {
        replyMarkup.inline_keyboard.push([{ text: '▶️ Watch Video', url: `${siteUrl}/watch/${subj.videoId}` }]);
    }

    try {
        if (subj.thumbnail && notifType === 'LIVE' && !isExam) {
            await tg(env.NOTIFY_BOT_TOKEN, 'sendPhoto', {
                chat_id: chatId,
                photo: subj.thumbnail,
                caption,
                parse_mode: 'HTML',
                reply_markup: replyMarkup,
            });
        } else {
            await tg(env.NOTIFY_BOT_TOKEN, 'sendMessage', {
                chat_id: chatId,
                text: caption,
                parse_mode: 'HTML',
                reply_markup: replyMarkup,
            });
        }
    } catch (e) {
        console.error(`[Broadcast] Failed for ${chatId}:`, e);
    }
}

async function broadcastSummary(env, chatId, dateStr, subjects, type) {
    let msg = '';
    if (type === 'MORNING') {
        msg = `🌅 <b>Good Morning, Champion!</b>\\nHere is your master plan for today (${dateStr}):\\n\\n`;
    } else {
        msg = `🌙 <b>Good Night!</b>\\nHere is a recap of what unlocked today (${dateStr}):\\n\\n`;
    }

    if (!subjects || subjects.length === 0) {
        msg += `📭 Nothing scheduled. Excellent time to review backlog or relax.`;
    } else {
        for (const s of subjects) {
            msg += `🔹 <b>${htmlEscape(s.subject)}</b> @ ${s.unlockTime}\\n`;
            msg += `   ╰ ${htmlEscape(s.topic)}\\n\\n`;
        }
    }

    if (type === 'MORNING') msg += `<i>Have a highly productive day! Let's crush it.</i>`;
    else msg += `<i>Sleep well and prepare to crush tomorrow!</i>`;

    await tg(env.NOTIFY_BOT_TOKEN, 'sendMessage', { chat_id: chatId, text: msg, parse_mode: 'HTML' });
}

// ==========================================
// 7. CRON TRIGGER ENGINE
// ==========================================

async function handleScheduledEvent(env) {
    const scheduleRaw = await env.SCHEDULE.get('schedule_data');
    if (!scheduleRaw) return;
    const schedule = JSON.parse(scheduleRaw);

    const istDate = getISTDate();
    const todayStr = formatISTDateForJSON(istDate);
    const currentTimeStr = formatISTTimeForJSON(istDate);
    const nowMins = parseTimeToMins(currentTimeStr);

    await env.SCHEDULE.put('last_cron_run', JSON.stringify({ time: currentTimeStr, date: todayStr, utc: new Date().toISOString() }));

    const todayEntry = schedule.find((d) => d.date === todayStr);
    
    // Fetch active subs (excluding DND)
    const activeSubs = [];
    const subscriberKeys = await env.SUBSCRIBERS.list({ prefix: 'sub:' });
    for (const key of subscriberKeys.keys) {
        const sub = await env.SUBSCRIBERS.get(key.name, 'json');
        if (sub && sub.chatId && !sub.dnd) {
            activeSubs.push(sub.chatId);
        }
    }
    if (activeSubs.length === 0) return;

    // --- MORNING / NIGHT SUMMARIES — Deduplicated by Date ---
    // Make sure we only fire these once per day. We store markers in KV.
    if (currentTimeStr === '07:00 AM' && todayEntry) {
        const marker = `summary:morn:${todayStr}`;
        if (!await env.SCHEDULE.get(marker)) {
            await env.SCHEDULE.put(marker, '1', { expirationTtl: 86400 });
            for (const cid of activeSubs) await broadcastSummary(env, cid, todayStr, todayEntry.subjects, 'MORNING');
        }
    }
    
    if (currentTimeStr === '10:00 PM' && todayEntry && todayEntry.subjects?.length > 0) {
        const marker = `summary:night:${todayStr}`;
        if (!await env.SCHEDULE.get(marker)) {
            await env.SCHEDULE.put(marker, '1', { expirationTtl: 86400 });
            for (const cid of activeSubs) await broadcastSummary(env, cid, todayStr, todayEntry.subjects, 'NIGHT');
        }
    }

    if (!todayEntry || !todayEntry.subjects) return;

    // --- CLASS LIVE & 15-MIN REMINDERS ---
    for (const subj of todayEntry.subjects) {
        const classMins = parseTimeToMins(subj.unlockTime);
        if (classMins === 0) continue;

        // Exactly Live
        if (nowMins === classMins) {
            const marker = `live:${todayStr}:${subj.subject}:${subj.topic}`;
            if (!await env.SCHEDULE.get(marker)) {
                await env.SCHEDULE.put(marker, '1', { expirationTtl: 86400 });
                for (const cid of activeSubs) await broadcastToChat(env, cid, subj, todayEntry.dayType, 'LIVE');
            }
        }
        
        // 15 Min Reminder
        if (classMins - nowMins === 15) {
            const marker = `reminder:${todayStr}:${subj.subject}:${subj.topic}`;
            if (!await env.SCHEDULE.get(marker)) {
                await env.SCHEDULE.put(marker, '1', { expirationTtl: 86400 });
                for (const cid of activeSubs) await broadcastToChat(env, cid, subj, todayEntry.dayType, 'REMINDER');
            }
        }
    }
}

// ==========================================
// 8. USER DATA REST API (Keep Untouched)
// ==========================================

async function handleGetUserData(request, env) {
    const url = new URL(request.url);
    const username = url.searchParams.get('username');
    if (!username) return corsResponse({ error: 'Missing username' }, 400);

    const key = `user:${username.toLowerCase()}`;
    const data = await env.USER_DATA.get(key, 'json');
    return corsResponse({ data: data || null });
}

async function handleSaveUserData(request, env) {
    try {
        const { username, data } = await request.json();
        if (!username || !data) return corsResponse({ error: 'Missing username or data' }, 400);

        const key = `user:${username.toLowerCase()}`;
        const existing = (await env.USER_DATA.get(key, 'json')) || {};
        const merged = {
            ...existing,
            ...data,
            videoProgress: { ...(existing.videoProgress || {}), ...(data.videoProgress || {}) },
            dppCompleted: { ...(existing.dppCompleted || {}), ...(data.dppCompleted || {}) },
            dppSaves: { ...(existing.dppSaves || {}), ...(data.dppSaves || {}) },
            examOmr: { ...(existing.examOmr || {}), ...(data.examOmr || {}) },
            examSubmitted: { ...(existing.examSubmitted || {}), ...(data.examSubmitted || {}) },
            lastSynced: new Date().toISOString(),
        };

        await env.USER_DATA.put(key, JSON.stringify(merged));
        return corsResponse({ success: true, lastSynced: merged.lastSynced });
    } catch (e) {
        return corsResponse({ error: 'Invalid request body' }, 400);
    }
}

async function handleTokenCreate(request, env) {
    const { token } = await request.json();
    if (!token) return corsResponse({ error: 'Missing token' }, 400);

    await env.LOGIN_TOKENS.put(token, JSON.stringify({ status: 'pending', createdAt: new Date().toISOString() }), { expirationTtl: 300 });
    return corsResponse({ success: true });
}

async function handleTokenStatus(request, env) {
    const url = new URL(request.url);
    const token = url.searchParams.get('token');
    if (!token) return corsResponse({ status: 'invalid' });

    const data = await env.LOGIN_TOKENS.get(token, 'json');
    if (!data) return corsResponse({ status: 'invalid' });
    return corsResponse(data);
}

// ==========================================
// 9. MAIN FETCH DISPATCHER
// ==========================================

export default {
    async fetch(request, env) {
        const url = new URL(request.url);

        if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS_HEADERS });

        if (request.method === 'POST' && url.pathname === '/webhook/login') {
            await handleLoginWebhook(await request.json(), env);
            return new Response('OK');
        }

        if (request.method === 'POST' && url.pathname === '/webhook/notify') {
            await handleNotifyWebhook(await request.json(), env);
            return new Response('OK');
        }

        if (request.method === 'POST' && url.pathname === '/api/auth/token') return handleTokenCreate(request, env);
        if (request.method === 'GET' && url.pathname === '/api/auth/status') return handleTokenStatus(request, env);

        if (request.method === 'GET' && url.pathname === '/api/user-data') return handleGetUserData(request, env);
        if (request.method === 'POST' && url.pathname === '/api/user-data') return handleSaveUserData(request, env);

        if (request.method === 'POST' && url.pathname === '/api/ai/mistral') {
            try {
                const body = await request.text();
                const mistralKey = env.MISTRAL_API_KEY || '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';
                const nvRes = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${mistralKey}`, 'Accept': 'text/event-stream', 'Content-Type': 'application/json' },
                    body: body
                });
                const newHeaders = new Headers(nvRes.headers);
                newHeaders.set('Access-Control-Allow-Origin', '*');
                newHeaders.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
                return new Response(nvRes.body, { status: nvRes.status, headers: newHeaders });
            } catch (err) {
                return corsResponse({ error: 'Worker AI proxy failed' }, 500);
            }
        }

        if (url.pathname === '/') {
            return corsResponse({ status: 'ok', service: 'Study Fly Mega Bot', version: '2.0.0', timestamp: new Date().toISOString() });
        }

        return new Response('Not Found', { status: 404 });
    },

    async scheduled(event, env, ctx) {
        ctx.waitUntil(handleScheduledEvent(env));
    },
};
"""

with open(r'd:\Codding\Study Fly\worker\src\index.js', 'w', encoding='utf-8') as f:
    f.write(worker_code)

print("Mega Update written successfully to worker index.js")
