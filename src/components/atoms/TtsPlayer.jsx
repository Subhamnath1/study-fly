import { useState, useRef, useEffect } from 'react';
import { Play, Square, Loader2, Volume2 } from 'lucide-react';

const TTS_URL = 'http://localhost:8000/api/tts';

/**
 * Strips markdown and LaTeX code to make clean text for TTS
 */
function cleanTextForSpeech(markdown) {
    let text = markdown;
    
    // Remove markdown headers
    text = text.replace(/#+\s/g, '');
    
    // Remove markdown bold/italics
    text = text.replace(/\*\*(.*?)\*\*/g, '$1');
    text = text.replace(/\*(.*?)\*/g, '$1');
    
    // Convert LaTeX equations to spoken equivalents (basic)
    text = text.replace(/\$\$(.*?)\$\$/gs, ' the equation $1 ');
    text = text.replace(/\$(.*?)\$/g, ' $1 ');
    text = text.replace(/\\frac{(.*?)}{(.*?)}/g, ' $1 over $2 ');
    text = text.replace(/\\sqrt{(.*?)}/g, ' square root of $1 ');
    text = text.replace(/\\times/g, ' times ');
    text = text.replace(/\\div/g, ' divided by ');
    text = text.replace(/\\boxed{(.*?)}/g, ' the final answer $1 ');
    text = text.replace(/\\\[(.*?)\\\]/gs, ' $1 ');
    text = text.replace(/\\\((.*?)\\\)/gs, ' $1 ');
    
    // Remove stray LaTeX backslashes
    text = text.replace(/\\[a-zA-Z]+/g, '');
    
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
            audioRef.current?.pause();
            setStatus('idle');
            return;
        }

        if (!text || isGenerating) return;

        try {
            setStatus('loading');
            setError(null);

            const cleanedText = cleanTextForSpeech(text);

            const response = await fetch(TTS_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: cleanedText })
            });

            if (!response.ok) {
                throw new Error('Failed to generate audio');
            }

            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            
            if (audioRef.current) {
                audioRef.current.src = url;
                await audioRef.current.play();
                setStatus('playing');
                
                audioRef.current.onended = () => {
                    setStatus('idle');
                    URL.revokeObjectURL(url);
                };
            }
        } catch (err) {
            console.error('TTS Error:', err);
            setError('Failed: Ensure "npm run dev" is running + test on localhost:5173 (Live HTTPS blocks local HTTP)');
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
