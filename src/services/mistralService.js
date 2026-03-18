/**
 * @fileoverview Mistral AI Service — Integration with NVIDIA NIM
 * Replaces Gemini AI for DPP Solution and Hints.
 */

// ── API Configuration ──
// Use the Cloudflare Worker proxy to avoid CORS errors
const API_BASE = import.meta.env.VITE_WORKER_URL || 'https://study-fly-bot.study-fly-bot.workers.dev';
const INVOKE_URL = `${API_BASE}/api/ai/mistral`;

/**
 * System prompt injected into the vision conversation.
 */
const SYSTEM_PROMPT = `You are "Study Fly AI", an expert academic tutor for Class 12 students studying Physics, Chemistry, and Mathematics (PCM).

Your responsibilities:
- Explain concepts clearly with real-world analogies
- Point out common exam mistakes
- Summarize chapters concisely
- Use markdown formatting for better readability
- CRITICAL: You MUST wrap ALL mathematical expressions, equations, and LaTeX commands (especially \`\\boxed{}\`) inside inline math (\`$ ... $\`) or block math (\`$$ ... $$\`). Never write LaTeX outside of math blocks!
- Be encouraging and supportive

Always respond in English. Keep answers focused and exam-relevant.`;

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
 * Send an image and a prompt to Mistral and yield the response as a stream.
 */
export async function* streamMistralVision(imageUrl, prompt, preferredModelId = 'mistralai/mistral-large-3-675b-instruct-2512') {
    let base64Image;
    try {
        base64Image = await fetchImageAsBase64(imageUrl);
    } catch (e) {
        throw new Error('Image Load Error: ' + e.message);
    }

    const payload = {
        model: preferredModelId,
        messages: [
            {
                role: "user",
                content: [
                    { type: "text", text: SYSTEM_PROMPT + '\n\n' + prompt },
                    { type: "image_url", image_url: { url: `data:${base64Image.mimeType};base64,${base64Image.data}` } }
                ]
            }
        ],
        max_tokens: 2048,
        temperature: 0.15,
        top_p: 1.00,
        stream: true
    };

    let response;
    try {
        response = await fetch(INVOKE_URL, {
            method: 'POST',
            headers: {
                "Accept": "text/event-stream",
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });
    } catch (err) {
        throw new Error('Network Error: Failed to contact AI service.');
    }

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData?.detail || errorData?.message || `API Error: ${response.status}`);
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
                if (dataStr.trim() === '[DONE]') continue;
                try {
                    const data = JSON.parse(dataStr);
                    const textChunk = data?.choices?.[0]?.delta?.content;
                    if (textChunk) yield textChunk;
                } catch (e) { 
                    // Safely ignore parse errors for chunks
                }
            }
        }
    }
}
