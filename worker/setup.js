/**
 * @fileoverview One-time setup script.
 *
 * 1. Creates KV namespaces
 * 2. Uploads schedule.json to KV
 * 3. Deploys the Worker
 * 4. Registers Telegram webhooks
 *
 * Usage: node setup.js
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const NOTIFY_BOT_TOKEN = '8644741851:AAFxgricErodCecg8hTsPkystoDfYDTohVQ';
const LOGIN_BOT_TOKEN = '8715356383:AAFS5-oyvSf0Yt43iEdO4WDX6fPKq4ZABYM';

function run(cmd) {
    console.log(`\n> ${cmd}`);
    try {
        const output = execSync(cmd, { cwd: __dirname, encoding: 'utf-8', stdio: 'pipe' });
        console.log(output);
        return output;
    } catch (e) {
        console.error(e.stderr || e.message);
        return e.stdout || '';
    }
}

async function main() {
    console.log('═══════════════════════════════════════════');
    console.log('  Study Fly Bot Worker — Setup Script');
    console.log('═══════════════════════════════════════════\n');

    // Step 1: Create KV Namespaces
    console.log('📦 Step 1: Creating KV Namespaces...');

    const kvNames = ['SUBSCRIBERS', 'LOGIN_TOKENS', 'SCHEDULE'];
    const kvIds = {};

    for (const name of kvNames) {
        const output = run(`npx wrangler kv namespace create "${name}"`);
        const match = output.match(/id\s*=\s*"([^"]+)"/);
        if (match) {
            kvIds[name] = match[1];
            console.log(`   ✅ ${name} → ${match[1]}`);
        } else {
            console.log(`   ⚠️ ${name} — could not parse ID. Check output above.`);
        }
    }

    // Step 2: Update wrangler.toml with real KV IDs
    if (Object.keys(kvIds).length > 0) {
        console.log('\n📝 Step 2: Updating wrangler.toml with KV IDs...');
        let toml = fs.readFileSync(path.join(__dirname, 'wrangler.toml'), 'utf-8');

        if (kvIds.SUBSCRIBERS) toml = toml.replace('PLACEHOLDER_SUBSCRIBERS_KV_ID', kvIds.SUBSCRIBERS);
        if (kvIds.LOGIN_TOKENS) toml = toml.replace('PLACEHOLDER_LOGIN_TOKENS_KV_ID', kvIds.LOGIN_TOKENS);
        if (kvIds.SCHEDULE) toml = toml.replace('PLACEHOLDER_SCHEDULE_KV_ID', kvIds.SCHEDULE);

        fs.writeFileSync(path.join(__dirname, 'wrangler.toml'), toml);
        console.log('   ✅ wrangler.toml updated.\n');
    }

    // Step 3: Upload schedule.json to KV
    console.log('📅 Step 3: Uploading schedule.json to KV...');
    const schedulePath = path.resolve(__dirname, '..', 'src', 'data', 'schedule.json');
    if (fs.existsSync(schedulePath)) {
        const scheduleData = fs.readFileSync(schedulePath, 'utf-8');
        // Write to a temp file for KV put
        const tempFile = path.join(__dirname, '_schedule_upload.json');
        fs.writeFileSync(tempFile, scheduleData);

        const kvId = kvIds.SCHEDULE || 'PLACEHOLDER_SCHEDULE_KV_ID';
        run(`npx wrangler kv key put --namespace-id="${kvId}" "schedule_data" --path="${tempFile}"`);
        fs.unlinkSync(tempFile);
        console.log('   ✅ schedule.json uploaded to KV.\n');
    } else {
        console.log('   ⚠️ schedule.json not found at:', schedulePath);
    }

    // Step 4: Deploy the Worker
    console.log('🚀 Step 4: Deploying Worker...');
    run('npx wrangler deploy');

    // Step 5: Get the Worker URL
    console.log('\n🔗 Step 5: Registering Telegram Webhooks...');

    // The worker URL will be: https://study-fly-bot.<account-subdomain>.workers.dev
    // We need to figure this out from the deploy output or ask the user
    const deployOutput = run('npx wrangler whoami');
    console.log('   Check your Cloudflare dashboard for the Worker URL.');
    console.log('   Then run:');
    console.log(`   node register-webhooks.js <WORKER_URL>`);
    console.log('\n   Example:');
    console.log('   node register-webhooks.js https://study-fly-bot.your-subdomain.workers.dev');

    console.log('\n═══════════════════════════════════════════');
    console.log('  Setup Complete! ✅');
    console.log('═══════════════════════════════════════════');
}

main().catch(console.error);
