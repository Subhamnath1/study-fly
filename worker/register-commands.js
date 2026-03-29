/**
 * @fileoverview Register bot commands with Telegram's setMyCommands API.
 *
 * This makes commands appear in the "/" menu inside Telegram chat.
 * Run once after deploying or updating commands.
 *
 * Usage: node register-commands.js
 */

const NOTIFY_BOT_TOKEN = '8644741851:AAFxgricErodCecg8hTsPkystoDfYDTohVQ';

const COMMANDS = [
    { command: 'start', description: '🎓 Subscribe to Study Fly notifications' },
    { command: 'stop', description: '🔕 Unsubscribe from notifications' },
    { command: 'help', description: '🛠 View all available commands' },
    { command: 'today', description: "📅 Today's class schedule" },
    { command: 'tomorrow', description: "📅 Tomorrow's schedule" },
    { command: 'week', description: '📆 7-day schedule overview' },
    { command: 'next', description: '⏳ Next upcoming class' },
    { command: 'exam', description: '📝 Upcoming chapter tests' },
    { command: 'dnd', description: '🌙 Toggle Do Not Disturb mode' },
    { command: 'stats', description: '📊 View bot & system stats' },
    { command: 'streak', description: '🔥 View your interaction streak' },
    { command: 'quote', description: '💡 Get a motivational quote' },
    { command: 'calendar', description: '🗓 Open the web calendar' },
    { command: 'subjects', description: '📚 Active subjects overview' },
    { command: 'feedback', description: '✍️ Send feedback or ideas' },
    { command: 'id', description: '👤 Your profile details' },
    { command: 'ping', description: '🏓 Check if bot is alive' },
    { command: 'test', description: '🧪 Send a test notification' },
];

async function registerCommands() {
    console.log('📋 Registering commands with Telegram...\n');

    const res = await fetch(
        `https://api.telegram.org/bot${NOTIFY_BOT_TOKEN}/setMyCommands`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ commands: COMMANDS }),
        }
    );

    const data = await res.json();

    if (data.ok) {
        console.log(`✅ Successfully registered ${COMMANDS.length} commands!\n`);
        console.log('Commands now visible in Telegram:');
        for (const cmd of COMMANDS) {
            console.log(`   /${cmd.command} — ${cmd.description}`);
        }
    } else {
        console.error('❌ Failed to register commands:', data.description);
    }

    // Also verify webhook is properly set
    console.log('\n🔍 Checking current webhook status...');
    const webhookRes = await fetch(
        `https://api.telegram.org/bot${NOTIFY_BOT_TOKEN}/getWebhookInfo`
    );
    const webhookData = await webhookRes.json();

    if (webhookData.ok) {
        const info = webhookData.result;
        console.log(`   URL: ${info.url || '(not set!)'}`);
        console.log(`   Pending updates: ${info.pending_update_count}`);
        if (info.last_error_message) {
            console.log(`   ⚠️ Last error: ${info.last_error_message}`);
            console.log(`   ⚠️ Error date: ${new Date(info.last_error_date * 1000).toISOString()}`);
        }
    }
}

registerCommands().catch(console.error);
