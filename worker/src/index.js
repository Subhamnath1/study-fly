/**
 * @fileoverview Cloudflare Worker — Study Fly Bot Server.
 *
 * Handles:
 *  1. Telegram Webhook for Login Bot (/webhook/login)
 *  2. Telegram Webhook for Notification Bot (/webhook/notify)
 *  3. Login Token REST API (/api/auth/token, /api/auth/status)
 *  4. Cron Trigger — checks schedule every minute and sends notifications
 *
 * KV Namespaces:
 *  - SUBSCRIBERS: stores subscriber chat IDs
 *  - LOGIN_TOKENS: stores pending/confirmed login tokens
 *  - SCHEDULE: stores the schedule.json data
 */

// ── Telegram API Helper ──

/**
 * Send a request to the Telegram Bot API.
 * @param {string} token Bot token
 * @param {string} method API method name
 * @param {object} body Request body
 */
async function tg(token, method, body) {
    const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
    return res.json();
}

// ── CORS Headers ──

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

// ── Login Bot Webhook Handler ──

async function handleLoginWebhook(update, env) {
    const msg = update.message;
    if (!msg?.text) return;

    const chatId = msg.chat.id;
    const user = msg.from;
    const text = msg.text;

    // /start {token}
    const startMatch = text.match(/^\/start\s*(.*)/);
    if (!startMatch) return;

    const token = startMatch[1]?.trim();
    const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ');

    if (!token) {
        await tg(env.LOGIN_BOT_TOKEN, 'sendMessage', {
            chat_id: chatId,
            text: '👋 Welcome to *Study Fly Login Bot*!\n\nTo login, click "Login with Telegram" on the website.',
            parse_mode: 'Markdown',
        });
        return;
    }

    // Check token exists
    const tokenData = await env.LOGIN_TOKENS.get(token, 'json');
    if (!tokenData) {
        await tg(env.LOGIN_BOT_TOKEN, 'sendMessage', {
            chat_id: chatId,
            text: '❌ Invalid or expired login token.',
        });
        return;
    }

    if (tokenData.status === 'confirmed') {
        await tg(env.LOGIN_BOT_TOKEN, 'sendMessage', {
            chat_id: chatId,
            text: '✅ You are already logged in!',
        });
        return;
    }

    // Confirm the token
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
    }), { expirationTtl: 300 }); // Auto-expire after 5 min

    await tg(env.LOGIN_BOT_TOKEN, 'sendMessage', {
        chat_id: chatId,
        text: `✅ *Login Successful!*\n\nWelcome, *${fullName}*!\nReturn to the Study Fly website.`,
        parse_mode: 'Markdown',
    });
}

// ── Notification Bot Webhook Handler ──

async function handleNotifyWebhook(update, env) {
    const msg = update.message;
    if (!msg?.text) return;

    const chatId = msg.chat.id;
    const text = msg.text;
    const firstName = msg.from.first_name || 'Student';

    // /start — subscribe
    if (text.startsWith('/start')) {
        // Store subscriber in KV
        await env.SUBSCRIBERS.put(`sub:${chatId}`, JSON.stringify({
            chatId,
            name: firstName,
            subscribedAt: new Date().toISOString(),
        }));

        await tg(env.NOTIFY_BOT_TOKEN, 'sendMessage', {
            chat_id: chatId,
            text: `👋 Welcome to *Study Fly Notifications*, ${firstName}!\n\nYou are now subscribed. I will send you:\n🚀 *Thumbnails & Links* when a new Class unlocks.\n📝 *Exam Reminders* when a Chapter Test starts.\n\nType /stop to unsubscribe.`,
            parse_mode: 'Markdown',
        });
        return;
    }

    // /stop — unsubscribe
    if (text === '/stop') {
        await env.SUBSCRIBERS.delete(`sub:${chatId}`);
        await tg(env.NOTIFY_BOT_TOKEN, 'sendMessage', {
            chat_id: chatId,
            text: '🔕 You have been unsubscribed from all class notifications.',
        });
        return;
    }

    // /test — send test notification
    if (text === '/test') {
        const dummySubj = {
            subject: 'Physics',
            topic: 'Unit 2: Current Electricity - Test Notification',
            duration: '01:15:30',
            videoId: '1_2_dummy_video_example',
            type: 'VIDEO',
            thumbnail: 'https://images.unsplash.com/photo-1636466497217-26a8cbeaf0aa?q=80&w=800&auto=format&fit=crop',
        };
        await broadcastToChat(env, chatId, dummySubj, 'CLASS');
        return;
    }
}

// ── Broadcast Notification ──

async function broadcastToChat(env, chatId, subj, dayType) {
    const emoji = dayType === 'CHAPTER_EXAM' ? '📝' : '🚀';
    const typeStr = dayType === 'CHAPTER_EXAM' ? 'EXAM' : 'CLASS';
    const siteUrl = env.SITE_URL || 'https://study-fly.pages.dev';

    const caption = `${emoji} *${subj.subject} ${typeStr} IS LIVE!*\n\n*Topic*: ${subj.topic}\n*Duration*: ${subj.duration ?? 'Unknown'}\n\nWatch it now on your Dashboard!`;

    const replyMarkup = {
        inline_keyboard: [
            [{ text: '🏫 Open Dashboard', url: `${siteUrl}/dashboard` }],
        ],
    };

    if (subj.videoId) {
        replyMarkup.inline_keyboard.push([
            { text: '▶️ Watch Video', url: `${siteUrl}/watch/${subj.videoId}` },
        ]);
    }

    try {
        if (subj.thumbnail) {
            await tg(env.NOTIFY_BOT_TOKEN, 'sendPhoto', {
                chat_id: chatId,
                photo: subj.thumbnail,
                caption,
                parse_mode: 'Markdown',
                reply_markup: replyMarkup,
            });
        } else {
            await tg(env.NOTIFY_BOT_TOKEN, 'sendMessage', {
                chat_id: chatId,
                text: caption,
                parse_mode: 'Markdown',
                reply_markup: replyMarkup,
            });
        }
    } catch (e) {
        console.error(`[Broadcast] Failed for ${chatId}:`, e);
    }
}

// ── Cron: Check Schedule & Broadcast ──

async function handleScheduledEvent(env) {
    // 1. Load schedule from KV
    const scheduleRaw = await env.SCHEDULE.get('schedule_data');
    if (!scheduleRaw) {
        console.log('[Cron] No schedule data in KV.');
        return;
    }

    const scheduleArray = JSON.parse(scheduleRaw);

    // 2. Get IST Time and Date using Intl (Robust Method)
    // Cloudflare Workers support IANA time zones
    const now = new Date();

    // Format: 'YYYY-MM-DD' for date matching
    const todayStr = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).format(now);

    // Format: 'hh:mm A' for unlockTime matching
    const currentTimeStr = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    }).format(now);

    // Log check for debugging (view via KV or wrangler tail)
    await env.SCHEDULE.put('last_cron_run', JSON.stringify({
        time: currentTimeStr,
        date: todayStr,
        utc: now.toISOString()
    }));

    // 3. Find today's entry
    // Note: en-CA gives YYYY-MM-DD
    const todayEntry = scheduleArray.find((d) => d.date === todayStr);
    if (!todayEntry || !todayEntry.subjects) return;

    // 4. Check for matching unlock times
    for (const subj of todayEntry.subjects) {
        // Normalise string for comparison (some Intl settings might include small space/case diffs like \u202F)
        const targetTime = subj.unlockTime.replace(/\u202F/g, ' ').trim().toUpperCase();
        const nowTime = currentTimeStr.replace(/\u202F/g, ' ').trim().toUpperCase();

        if (targetTime === nowTime) {
            console.log(`[Cron] Matches! Broadcasting: ${subj.subject} - ${subj.topic}`);

            // 5. Get all subscribers from KV
            const subscriberKeys = await env.SUBSCRIBERS.list({ prefix: 'sub:' });
            for (const key of subscriberKeys.keys) {
                const sub = await env.SUBSCRIBERS.get(key.name, 'json');
                if (sub?.chatId) {
                    await broadcastToChat(env, sub.chatId, subj, todayEntry.dayType);
                }
            }
        }
    }
}

// ── User Data (Progress Sync) API ──

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

        // Merge: load existing data, deep merge, then save
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

// ── Main Worker Export ──

async function handleTokenCreate(request, env) {
    const { token } = await request.json();
    if (!token) return corsResponse({ error: 'Missing token' }, 400);

    await env.LOGIN_TOKENS.put(token, JSON.stringify({
        status: 'pending',
        createdAt: new Date().toISOString(),
    }), { expirationTtl: 300 }); // 5 min expiry

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

// ── Main Worker Export ──

export default {
    /**
     * Handles incoming HTTP requests (webhooks + API).
     */
    async fetch(request, env) {
        const url = new URL(request.url);

        // CORS preflight
        if (request.method === 'OPTIONS') {
            return new Response(null, { status: 204, headers: CORS_HEADERS });
        }

        // Telegram Webhooks
        if (request.method === 'POST' && url.pathname === '/webhook/login') {
            const update = await request.json();
            await handleLoginWebhook(update, env);
            return new Response('OK');
        }

        if (request.method === 'POST' && url.pathname === '/webhook/notify') {
            const update = await request.json();
            await handleNotifyWebhook(update, env);
            return new Response('OK');
        }

        // Login Token API
        if (request.method === 'POST' && url.pathname === '/api/auth/token') {
            return handleTokenCreate(request, env);
        }

        if (request.method === 'GET' && url.pathname === '/api/auth/status') {
            return handleTokenStatus(request, env);
        }

        // User Data (Progress Sync) API
        if (request.method === 'GET' && url.pathname === '/api/user-data') {
            return handleGetUserData(request, env);
        }

        if (request.method === 'POST' && url.pathname === '/api/user-data') {
            return handleSaveUserData(request, env);
        }

        // Mistral AI Proxy (CORS Solution)
        if (request.method === 'POST' && url.pathname === '/api/ai/mistral') {
            try {
                const body = await request.text();
                // We use env var or fallback to the provided key
                const mistralKey = env.MISTRAL_API_KEY || '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';
                
                const nvRes = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${mistralKey}`,
                        'Accept': 'text/event-stream',
                        'Content-Type': 'application/json'
                    },
                    body: body
                });

                const newHeaders = new Headers(nvRes.headers);
                newHeaders.set('Access-Control-Allow-Origin', '*');
                newHeaders.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');

                return new Response(nvRes.body, {
                    status: nvRes.status,
                    headers: newHeaders
                });
            } catch (err) {
                return corsResponse({ error: 'Worker failed to contact AI service' }, 500);
            }
        }

        // Health check
        if (url.pathname === '/') {
            return corsResponse({
                status: 'ok',
                service: 'Study Fly Bot Worker',
                timestamp: new Date().toISOString(),
            });
        }

        return new Response('Not Found', { status: 404 });
    },

    /**
     * Handles cron trigger events (every minute).
     */
    async scheduled(event, env, ctx) {
        ctx.waitUntil(handleScheduledEvent(env));
    },
};
