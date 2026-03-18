/**
 * @fileoverview Gemini AI Service — Multi-key rotation with per-model tracking.
 *
 * - 10 Google API keys with automatic rotation on 429 (rate-limit) errors.
 * - Rate limits are tracked independently per model (a key exhausted for
 *   gemini-2.5-flash may still work for gemini-3-flash-preview).
 * - Exposes `chatWithGemini(messages, modelId)` for the AI Tutor page.
 */

// ── API Keys Pool ──
const API_KEYS = [
    'AIzaSyC_tkBvEwdTneUSn-mdAelLfw9TEc5fYp0',
    'AIzaSyCETamSiYKQfVNitqlCNhv_Y36EXUPtkvA',
    'AIzaSyDYXbfEIH9oSNq6V-PBp2l-9fsmFRvU1jI',
    'AIzaSyBE-Ih4Sx_aPwcTDQlIP4vklliaV6X0Cj4',
    'AIzaSyAYnqkOLFAIf8OzFR9JuXn3RTf2PboPTOA',
    'AIzaSyBxQ_UhyDWsO0Bd1e65DjweKkLCDG4lItI',
    'AIzaSyAMcjeeFKBw4VRW3G6sQ_g88rolN2kr5z4',
    'AIzaSyC3QhsAsYKrsEpvLca_dDAkDnfajRdyJkw',
    'AIzaSyBP6fE9OWoi2eLqCXhMDCaj1mOIY0v9Ko8',
    'AIzaSyAtFu7xVgUkk9PAQOUVZ93gL_aCgbVLUGo',
];

// ── Available Models Mapping ──
// We use the user's preferred labels for logic and display.
// Internally mapped to functional API IDs.
export const GEMINI_MODELS = [
    { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash', description: 'Stable • Reasoning • Fast' },
    { id: 'gemini-3.0-flash', label: 'Gemini 3.0 Flash', description: 'Latest • Pro Intelligence • Preview' },
];

/**
 * Helper to get user-friendly label for a model ID
 */
function getModelLabel(modelId) {
    if (modelId === 'gemini-2.5-flash') return 'Gemini 2.5 Flash (Ultra-Lite)';
    return GEMINI_MODELS.find(m => m.id === modelId)?.label || modelId;
}

// ── Per-model key index tracking ──
const keyIndexMap = {};
GEMINI_MODELS.forEach((m) => { keyIndexMap[m.id] = 0; });
keyIndexMap['gemini-2.5-flash'] = 0;

/**
 * System prompt injected into every conversation.
 */
const SYSTEM_PROMPT = `You are "Study Fly AI", an expert academic tutor for Class 12 students studying Physics, Chemistry, and Mathematics (PCM).

Your responsibilities:
- Explain concepts clearly with real-world analogies
- Generate practice questions when asked
- Point out common exam mistakes
- Summarize chapters concisely
- Use markdown formatting for better readability
- Be encouraging and supportive

Always respond in English. Keep answers focused and exam-relevant.`;

/**
 * Get the current API key for a given model.
 */
function getKeyForModel(modelId) {
    const idx = keyIndexMap[modelId] ?? 0;
    return API_KEYS[idx % API_KEYS.length];
}

/**
 * Rotate to the next API key for this specific model.
 */
function rotateKeyForModel(modelId) {
    const current = keyIndexMap[modelId] ?? 0;
    const next = current + 1;
    keyIndexMap[modelId] = next;
    return next;
}

/**
 * Build the Gemini REST API URL for Streaming.
 */
function buildApiUrl(modelId, apiKey) {
    return `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:streamGenerateContent?key=${apiKey}&alt=sse`;
}

/**
 * Convert our message format to Gemini's `contents` array.
 */
function toGeminiContents(messages) {
    return messages
        .filter((m) => m.role !== 'system')
        .map((m) => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content }],
        }));
}

/**
 * Send a chat message to Google Gemini and yield the response as a stream.
 * Automatically Cascades through all available models and all 10 API keys.
 */
export async function* streamGeminiChat(messages, preferredModelId = 'gemini-3-flash-preview', reasoningMode = false) {
    const contents = toGeminiContents([...messages]);
    let lastError = null;

    const modelsToTry = [
        preferredModelId,
        ...GEMINI_MODELS.map(m => m.id).filter(id => id !== preferredModelId),
        'gemini-2.5-flash',
    ];

    for (const modelId of modelsToTry) {
        const readableName = getModelLabel(modelId);

        for (let attempt = 0; attempt < API_KEYS.length; attempt++) {
            const apiKey = getKeyForModel(modelId);
            const url = buildApiUrl(modelId, apiKey);

            try {
                const response = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents,
                        generationConfig: { temperature: 0.7, maxOutputTokens: 2048 },
                    }),
                });

                if (response.status === 429 || response.status === 403 || response.status === 401) {
                    const statusType = response.status === 429 ? 'Rate Limited' : 'Key Error';
                    console.warn(`[GeminiService] ${statusType} on ${readableName} (Key ${((keyIndexMap[modelId] || 0) % API_KEYS.length) + 1})`);
                    rotateKeyForModel(modelId);
                    lastError = new Error(`${statusType} on ${readableName} - Attempt ${attempt + 1}`);
                    continue;
                }

                if (!response.ok) {
                    if (response.status === 404) break;
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData?.error?.message || `API Error: ${response.status}`);
                }

                const reader = response.body.getReader();
                const decoder = new TextDecoder('utf-8');
                let buffer = '';

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    buffer += decoder.decode(value, { stream: true });
                    const parts = buffer.split('\n\n');
                    buffer = parts.pop() || '';
                    for (const part of parts) {
                        if (part.startsWith('data: ')) {
                            const dataStr = part.slice(6);
                            if (dataStr === '[DONE]') continue;
                            try {
                                const data = JSON.parse(dataStr);
                                const textChunk = data?.candidates?.[0]?.content?.parts?.[0]?.text;
                                if (textChunk) yield textChunk;
                            } catch (e) { }
                        }
                    }
                }
                return;

            } catch (err) {
                if (err.message?.includes('fetch') || err.message?.includes('Network')) {
                    rotateKeyForModel(modelId);
                    lastError = err;
                    continue;
                }
                throw err;
            }
        }
    }
    throw lastError || new Error('All models exhausted. Please try again later.');
}

async function fetchImageAsBase64(imageUrl) {
    const response = await fetch(imageUrl);
    if (!response.ok) throw new Error(`HTTP ${response.status} fetching image`);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve({ mimeType: blob.type, data: reader.result.split(',')[1] });
        reader.onerror = () => reject(new Error('FileReader error'));
        reader.readAsDataURL(blob);
    });
}

/**
 * Send an image and a prompt to Google Gemini and yield the response as a stream.
 */
export async function* streamGeminiVision(imageUrl, prompt, preferredModelId = 'gemini-3-flash-preview') {
    let base64Image;
    try {
        base64Image = await fetchImageAsBase64(imageUrl);
    } catch (e) {
        throw new Error('Image Load Error: ' + e.message);
    }

    const contents = [{
        role: 'user',
        parts: [
            { text: SYSTEM_PROMPT + '\n\n' + prompt },
            { inlineData: { mimeType: base64Image.mimeType, data: base64Image.data } }
        ]
    }];

    let lastError = null;
    const modelsToTry = [
        preferredModelId,
        ...GEMINI_MODELS.map(m => m.id).filter(id => id !== preferredModelId),
        'gemini-1.5-flash-8b',
    ];

    for (const modelId of modelsToTry) {
        const readableName = getModelLabel(modelId);

        for (let attempt = 0; attempt < API_KEYS.length; attempt++) {
            const apiKey = getKeyForModel(modelId);
            const url = buildApiUrl(modelId, apiKey);

            try {
                const response = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents,
                        generationConfig: { temperature: 0.4, maxOutputTokens: 2048 },
                    }),
                });

                if (response.status === 429 || response.status === 403 || response.status === 401) {
                    const statusType = response.status === 429 ? 'Rate Limited' : 'Key Error';
                    console.warn(`[GeminiService] Vision ${statusType} on ${readableName}`);
                    rotateKeyForModel(modelId);
                    lastError = new Error(`${statusType} on ${readableName} - Attempt ${attempt + 1}`);
                    continue;
                }

                if (!response.ok) {
                    if (response.status === 404) break;
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData?.error?.message || `API Error: ${response.status}`);
                }

                const reader = response.body.getReader();
                const decoder = new TextDecoder('utf-8');
                let buffer = '';

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    buffer += decoder.decode(value, { stream: true });
                    const parts = buffer.split('\n\n');
                    buffer = parts.pop() || '';
                    for (const part of parts) {
                        if (part.startsWith('data: ')) {
                            const dataStr = part.slice(6);
                            if (dataStr === '[DONE]') continue;
                            try {
                                const data = JSON.parse(dataStr);
                                const textChunk = data?.candidates?.[0]?.content?.parts?.[0]?.text;
                                if (textChunk) yield textChunk;
                            } catch (e) { }
                        }
                    }
                }
                return;

            } catch (err) {
                if (err.message?.includes('fetch') || err.message?.includes('Network')) {
                    rotateKeyForModel(modelId);
                    lastError = err;
                    continue;
                }
                throw err;
            }
        }
    }
    throw lastError || new Error('All vision models exhausted.');
}
