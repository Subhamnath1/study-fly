/**
 * @fileoverview Register Telegram Webhooks to point at the Cloudflare Worker.
 *
 * Usage: node register-webhooks.js <WORKER_URL>
 * Example: node register-webhooks.js https://study-fly-bot.your-subdomain.workers.dev
 */

const WORKER_URL = process.argv[2];

if (!WORKER_URL) {
    console.error('❌ Usage: node register-webhooks.js <WORKER_URL>');
    console.error('   Example: node register-webhooks.js https://study-fly-bot.abc123.workers.dev');
    process.exit(1);
}

const BOTS = [
    {
        name: 'Login Bot',
        token: '8715356383:AAFS5-oyvSf0Yt43iEdO4WDX6fPKq4ZABYM',
        path: '/webhook/login',
    },
    {
        name: 'Notification Bot',
        token: '8644741851:AAFxgricErodCecg8hTsPkystoDfYDTohVQ',
        path: '/webhook/notify',
    },
];

async function registerWebhooks() {
    console.log('🔗 Registering Telegram Webhooks...\n');

    for (const bot of BOTS) {
        const webhookUrl = `${WORKER_URL}${bot.path}`;
        console.log(`   ${bot.name}: ${webhookUrl}`);

        const res = await fetch(
            `https://api.telegram.org/bot${bot.token}/setWebhook`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: webhookUrl }),
            }
        );

        const data = await res.json();
        if (data.ok) {
            console.log(`   ✅ ${bot.name} webhook set successfully!`);
        } else {
            console.error(`   ❌ ${bot.name} failed:`, data.description);
        }
        console.log();
    }

    console.log('Done! Both bots are now connected to your Cloudflare Worker. 🎉');
}

registerWebhooks().catch(console.error);
