/**
 * @fileoverview Telegram Bot Server + Local Auth API.
 * Handles /start deep-link login flow.
 *
 * If Firebase isn't configured, it uses an in-memory Map and exposes
 * an Express API on port 3001 for the frontend to poll status.
 */

import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

import TelegramBot from 'node-telegram-bot-api';
import express from 'express';
import cors from 'cors';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';

// ── Configuration ──
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8715356383:AAFS5-oyvSf0Yt43iEdO4WDX6fPKq4ZABYM';
const API_PORT = process.env.BOT_API_PORT || 3001;

const firebaseConfig = {
    apiKey: process.env.VITE_FIREBASE_API_KEY,
    projectId: process.env.VITE_FIREBASE_PROJECT_ID,
};

const hasFirebase = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);

let db = null;
if (hasFirebase) {
    const app = initializeApp({
        apiKey: process.env.VITE_FIREBASE_API_KEY,
        authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
        projectId: process.env.VITE_FIREBASE_PROJECT_ID,
        storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
        appId: process.env.VITE_FIREBASE_APP_ID,
    }, 'telegram-bot');
    db = getFirestore(app);
}

// ── Local Fallback Store ──
// Map of token -> { status: 'pending' | 'confirmed', telegramUser?: {...} }
const localTokenStore = new Map();

// ── Express API (for local fallback polling) ──
const server = express();
server.use(cors());
server.use(express.json());

// Frontend creates a token
server.post('/api/auth/token', (req, res) => {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: 'Missing token' });
    localTokenStore.set(token, { status: 'pending', createdAt: Date.now() });
    res.json({ success: true });
});

// Frontend polls status
server.get('/api/auth/status', (req, res) => {
    const token = req.query.token;
    if (!token || !localTokenStore.has(token)) {
        return res.json({ status: 'invalid' });
    }
    const data = localTokenStore.get(token);
    res.json(data);
});

server.listen(API_PORT, () => {
    console.log(`🔌 Local Auth API running on http://localhost:${API_PORT}`);
});

// ── Telegram Bot Init ──
const bot = new TelegramBot(BOT_TOKEN, { polling: true });
console.log('🤖 Study Fly Telegram Bot is running...');
console.log(`   Database: ${hasFirebase ? 'Firebase Firestore' : 'Local In-Memory API'}`);

// Cleanup stale tokens every 5 minutes
setInterval(() => {
    const now = Date.now();
    for (const [token, data] of localTokenStore.entries()) {
        if (now - data.createdAt > 300000) localTokenStore.delete(token); // 5 mins
    }
}, 60000);

// ── /start Handler ──
bot.onText(/\/start(.*)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const token = (match[1] || '').trim();
    const user = msg.from;

    const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ');
    const username = user.username || 'N/A';
    const userId = user.id;

    if (!token) {
        bot.sendMessage(chatId, `👋 Welcome to *Study Fly Login Bot*!\n\nTo login, please click the "Login with Telegram" button on the Study Fly website.`);
        return;
    }

    const userData = {
        id: userId,
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        username: username,
        photo_url: '',
    };

    try {
        if (hasFirebase) {
            // Firebase Logic
            const tokenRef = doc(db, 'loginTokens', token);
            const tokenSnap = await getDoc(tokenRef);

            if (!tokenSnap.exists()) return bot.sendMessage(chatId, '❌ Invalid or expired login token.');
            if (tokenSnap.data().status === 'confirmed') return bot.sendMessage(chatId, '✅ You are already logged in!');

            await updateDoc(tokenRef, {
                status: 'confirmed',
                telegramUser: userData,
                confirmedAt: new Date().toISOString(),
            });

            // Ensure profile exists
            const userDocRef = doc(db, 'users', `telegram_${userId}`);
            const userSnap = await getDoc(userDocRef);
            if (!userSnap.exists()) {
                await setDoc(userDocRef, {
                    uid: `telegram_${userId}`,
                    name: fullName,
                    username: username,
                    photoURL: '',
                    createdAt: new Date().toISOString(),
                    batch: 'Class 12',
                    progress: {},
                    backlog: [],
                });
            }
        } else {
            // Local In-Memory Logic
            if (!localTokenStore.has(token)) return bot.sendMessage(chatId, '❌ Invalid or expired login token.');
            const tokenData = localTokenStore.get(token);
            if (tokenData.status === 'confirmed') return bot.sendMessage(chatId, '✅ You are already logged in!');

            localTokenStore.set(token, {
                status: 'confirmed',
                telegramUser: userData,
                confirmedAt: Date.now(),
            });
        }

        // Success
        bot.sendMessage(chatId,
            `✅ *Login Successful!*\n\nWelcome back, *${fullName}*!\nYou can now return to the Study Fly website.`,
            { parse_mode: 'Markdown' }
        );
        console.log(`   ✅ Login confirmed for: ${fullName} (@${username})`);

    } catch (error) {
        console.error('   ❌ Error processing login:', error);
        bot.sendMessage(chatId, '⚠️ Something went wrong. Please try again.');
    }
});

bot.on('polling_error', console.error);
