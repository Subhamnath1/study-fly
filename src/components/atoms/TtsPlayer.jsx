import { useState, useRef, useEffect } from 'react';
import { Play, Square, Loader2, Volume2 } from 'lucide-react';

const TTS_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:8000/api/tts' 
    : 'https://study-fly-tts-production.up.railway.app/api/tts';

// --- Global Cache and Context ---
// Stores audio buffers so we don't re-fetch them in the same session. Cleared on refresh.
const audioBufferCache = new Map();
let sharedAudioContext = null;

function getAudioContext() {
    if (!sharedAudioContext) {
        sharedAudioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    return sharedAudioContext;
}

/**
 * Strips markdown and LaTeX code to make clean text for TTS
 */
function cleanTextForSpeech(markdown) {
    if (!markdown) return "";
    let text = String(markdown);
    
    // Remove markdown headers
    text = text.replace(/#+\s/g, '');
    
    // Remove markdown bold/italics
    text = text.replace(/\*\*(.*?)\*\*/g, '$1');
    text = text.replace(/\*(.*?)\*/g, '$1');
    
    // Strip markdown links
    text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
    
    // Convert LaTeX equations to spoken equivalents (basic)
    text = text.replace(/\$\$(.*?)\$\$/gs, ' $1 ');
    text = text.replace(/\$(.*?)\$/g, ' $1 ');
    text = text.replace(/\\frac{(.*?)}{(.*?)}/g, ' $1 over $2 ');
    text = text.replace(/\\sqrt{(.*?)}/g, ' square root of $1 ');
    text = text.replace(/\\times/g, ' times ');
    text = text.replace(/\\div/g, ' divided by ');
    text = text.replace(/\\boxed{(.*?)}/g, ' $1 ');
    text = text.replace(/\\\[(.*?)\\\]/gs, ' $1 ');
    text = text.replace(/\\\((.*?)\\\)/gs, ' $1 ');
    
    // Remove stray LaTeX backslashes
    text = text.replace(/\\[a-zA-Z]+/g, ' ');
    
    // CRITICAL: NVIDIA Riva fails on unmatched brackets [] <> {} because it thinks they are SSML or phoneme tags.
    text = text.replace(/</g, ' less than ');
    text = text.replace(/>/g, ' greater than ');
    text = text.replace(/[{}[\]]/g, ' '); // Strip all {} and []
    
    // Clean up multiple spaces
    text = text.replace(/\s+/g, ' ');
    
    return text.trim();
}

/**
 * @param {Object} props
 * @param {string} props.text - The raw markdown text to read aloud
 * @param {boolean} [props.isGenerating] - If true, restricts usage
 */
export default function TtsPlayer({ text, isGenerating = false }) {
    const [status, setStatus] = useState('idle'); // idle | loading | playing
    const [error, setError] = useState(null);
    const audioRef = useRef(null);

    // Stop playback if component unmounts
    useEffect(() => {
        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current.src = "";
            }
        };
    }, []);

    const handlePlayStop = async () => {
        if (status === 'playing') {
            if (audioRef.current && audioRef.current.source) {
                audioRef.current.source.stop();
            }
            setStatus('idle');
            return;
        }

        if (!text || isGenerating) return;

        try {
            setStatus('loading');
            setError(null);

            const cleanedText = cleanTextForSpeech(text);
            const audioContext = getAudioContext();
            
            // Resume context if it was suspended by the browser
            if (audioContext.state === 'suspended') {
                await audioContext.resume();
            }

            let audioData;

            // Check if we already have the generated audio in our fast cache
            if (audioBufferCache.has(cleanedText)) {
                audioData = audioBufferCache.get(cleanedText);
            } else {
                const response = await fetch(TTS_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ text: cleanedText })
                });

                if (!response.ok) {
                    let errorMessage = 'Failed to generate audio';
                    try {
                        const errData = await response.json();
                        errorMessage = errData.detail || errorMessage;
                    } catch (e) {
                        errorMessage = `HTTP ${response.status}: Failed to generate audio`;
                    }
                    throw new Error(errorMessage);
                }

                const arrayBuffer = await response.arrayBuffer();
                
                // Generate a proper WAV header for 44.1kHz, 1 channel, 16-bit PCM (Riva Default)
                const wavHeader = new ArrayBuffer(44);
                const view = new DataView(wavHeader);
                
                // RIFF chunk descriptor
                writeString(view, 0, 'RIFF');
                view.setUint32(4, 36 + arrayBuffer.byteLength, true); // file length minus 8
                writeString(view, 8, 'WAVE');
                
                // fmt sub-chunk
                writeString(view, 12, 'fmt ');
                view.setUint32(16, 16, true); // size of fmt chunk
                view.setUint16(20, 1, true); // format = 1 (PCM)
                view.setUint16(22, 1, true); // channels = 1
                view.setUint32(24, 44100, true); // samplerate
                view.setUint32(28, 44100 * 1 * 2, true); // byterate
                view.setUint16(32, 2, true); // block align
                view.setUint16(34, 16, true); // bits per sample
                
                // data sub-chunk
                writeString(view, 36, 'data');
                view.setUint32(40, arrayBuffer.byteLength, true); // data length
                
                // Combine header and payload
                const wavBuffer = new Uint8Array(wavHeader.byteLength + arrayBuffer.byteLength);
                wavBuffer.set(new Uint8Array(wavHeader), 0);
                wavBuffer.set(new Uint8Array(arrayBuffer), wavHeader.byteLength);

                audioData = await audioContext.decodeAudioData(wavBuffer.buffer);
                
                // Save to cache for next time
                audioBufferCache.set(cleanedText, audioData);
            }
            
            const source = audioContext.createBufferSource();
            source.buffer = audioData;
            source.connect(audioContext.destination);
            
            audioRef.current = { source, context: audioContext };
            
            source.start(0);
            setStatus('playing');
            
            source.onended = () => {
                setStatus('idle');
            };
            
        } catch (err) {
            console.error('TTS Error:', err);
            const isLocal = window.location.hostname === 'localhost';
            setError(`Error: ${err.message || 'Network Fail'}. URL: ${TTS_URL.split('://')[1].split('/')[0]} ${isLocal ? '(Run npm run dev)' : ''}`);
            setStatus('idle');
        }
    };

    return (
        <div style={styles.container}>
            <button 
                onClick={handlePlayStop} 
                disabled={isGenerating || !text.trim()}
                style={{
                    ...styles.button,
                    opacity: (isGenerating || !text.trim()) ? 0.5 : 1,
                    background: status === 'playing' ? 'var(--primary-muted)' : 'transparent',
                    color: status === 'playing' ? 'var(--primary)' : 'var(--text-muted)'
                }}
                title={status === 'playing' ? "Stop reading" : "Read aloud"}
            >
                {status === 'loading' ? (
                    <Loader2 size={16} className="spin" />
                ) : status === 'playing' ? (
                    <Square size={14} fill="currentColor" />
                ) : (
                    <Volume2 size={16} />
                )}
                <span style={styles.label}>
                    {status === 'loading' ? 'Generating...' : status === 'playing' ? 'Playing' : 'Read Aloud'}
                </span>
            </button>
            {error && <span style={styles.error}>{error}</span>}
            <audio ref={audioRef} style={{ display: 'none' }} />
        </div>
    );
}

function writeString(view, offset, string) {
    for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
    }
}

const styles = {
    container: { display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, borderTop: '1px solid var(--border-light)', paddingTop: 8 },
    button: {
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '6px 12px',
        borderRadius: 'var(--radius-full)',
        border: '1px solid var(--border-light)',
        background: 'transparent',
        cursor: 'pointer',
        transition: 'all 0.2s',
    },
    label: { fontSize: '0.75rem', fontWeight: 600 },
    error: { fontSize: '0.7rem', color: 'var(--error)' }
};
