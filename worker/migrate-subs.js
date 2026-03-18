/**
 * @fileoverview Migrate local subscribers from telegram_subscribers.json to Cloudflare KV.
 * 
 * Usage: node migrate-subs.js
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SUB_FILE = path.resolve(__dirname, '..', 'telegram_subscribers.json');

// From wrangler.toml or previous setup
const NAMESPACE_ID = 'c480026ae5494cb4881e910a268c5d57';

if (!fs.existsSync(SUB_FILE)) {
    console.error('❌ telegram_subscribers.json not found.');
    process.exit(1);
}

const subs = JSON.parse(fs.readFileSync(SUB_FILE, 'utf-8'));
console.log(`📡 Found ${subs.length} local subscribers. Migrating to KV...`);

for (const chatId of subs) {
    console.log(`   Migrating ${chatId}...`);
    try {
        const value = JSON.stringify({
            chatId,
            name: 'Migrated User',
            subscribedAt: new Date().toISOString()
        });

        // Use wrangler kv key put --remote
        execSync(`npx wrangler kv key put --namespace-id="${NAMESPACE_ID}" "sub:${chatId}" '${value}' --remote`, { stdio: 'inherit' });
        console.log(`   ✅ Success: ${chatId}`);
    } catch (e) {
        console.error(`   ❌ Failed: ${chatId}`, e.message);
    }
}

console.log('\nMigration complete! 🎉');
