/**
 * Quick test: Try multiple keys and models to find a working combination.
 */
const KEYS = [
    'AIzaSyC_tkBvEwdTneUSn-mdAelLfw9TEc5fYp0',
    'AIzaSyCETamSiYKQfVNitqlCNhv_Y36EXUPtkvA',
    'AIzaSyDYXbfEIH9oSNq6V-PBp2l-9fsmFRvU1jI',
    'AIzaSyBE-Ih4Sx_aPwcTDQlIP4vklliaV6X0Cj4',
    'AIzaSyAYnqkOLFAIf8OzFR9JuXn3RTf2PboPTOA',
];

const MODELS = ['gemini-2.5-flash', 'gemini-3-flash-preview'];

async function testKey(key, model, keyLabel) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ role: 'user', parts: [{ text: 'Say hello in one word' }] }],
                generationConfig: { maxOutputTokens: 20 },
            }),
        });
        if (res.ok) {
            const data = await res.json();
            const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
            console.log(`✅ ${keyLabel} + ${model}: "${text?.trim()}"`);
            return true;
        } else {
            console.log(`❌ ${keyLabel} + ${model}: ${res.status}`);
            return false;
        }
    } catch (e) {
        console.log(`❌ ${keyLabel} + ${model}: ${e.message}`);
        return false;
    }
}

async function main() {
    console.log('Testing API keys across models...\n');
    for (const model of MODELS) {
        console.log(`--- ${model} ---`);
        for (let i = 0; i < KEYS.length; i++) {
            const ok = await testKey(KEYS[i], model, `Key ${String.fromCharCode(65 + i)}`);
            if (ok) break; // Stop on first success for each model
        }
        console.log('');
    }
}

main();
