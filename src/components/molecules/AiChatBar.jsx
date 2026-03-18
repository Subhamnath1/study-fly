/**
 * @fileoverview AiChatBar — Decorative AI search input with quick-action chips.
 *
 * This is a placeholder UI. The actual AI API will be wired later.
 */

import { useState } from 'react';
import { Sparkles, Send } from 'lucide-react';

const CHIPS = [
    { id: 'explain', label: 'Concept Explainer', emoji: '🧠' },
    { id: 'practice', label: 'Practice Partner', emoji: '🎯' },
    { id: 'summary', label: 'Lesson Summary', emoji: '📚' },
    { id: 'insight', label: 'Progress Insight', emoji: '📊' },
];

export default function AiChatBar() {
    const [query, setQuery] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!query.trim()) return;
        // Placeholder — will call AI API later
        console.log('[AI Chat]', query);
        setQuery('');
    };

    const handleChip = (chip) => {
        console.log('[AI Chip]', chip.label);
        setQuery(chip.label + ': ');
    };

    return (
        <div style={styles.wrapper}>
            <form onSubmit={handleSubmit} style={styles.inputRow}>
                <div style={styles.inputIcon}>
                    <Sparkles size={18} color="var(--primary)" />
                </div>
                <input
                    type="text"
                    placeholder="Ask me anything about your studies"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    style={styles.input}
                />
                <button type="submit" style={styles.sendBtn}>
                    <Send size={16} />
                </button>
            </form>

            <div style={styles.chips}>
                {CHIPS.map((chip) => (
                    <button
                        key={chip.id}
                        style={styles.chip}
                        onClick={() => handleChip(chip)}
                    >
                        <span>{chip.emoji}</span>
                        <span>{chip.label}</span>
                    </button>
                ))}
            </div>
        </div>
    );
}

const styles = {
    wrapper: {
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
    },
    inputRow: {
        display: 'flex',
        alignItems: 'center',
        background: '#fff',
        borderRadius: '12px',
        padding: '6px 8px 6px 12px',
        gap: 12,
        boxShadow: '0 4px 14px rgba(0,0,0,0.05)',
    },
    inputIcon: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
    },
    input: {
        flex: 1,
        border: 'none',
        outline: 'none',
        background: 'transparent',
        fontSize: '0.88rem',
        fontWeight: 500,
        color: 'var(--text-main)',
    },
    sendBtn: {
        width: 34,
        height: 34,
        borderRadius: 8,
        background: 'var(--primary)',
        color: '#fff',
        border: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        flexShrink: 0,
        transition: 'background var(--transition-fast)',
    },
    chips: {
        display: 'flex',
        gap: 8,
        flexWrap: 'wrap',
    },
    chip: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '6px 14px',
        borderRadius: 'var(--radius-full)',
        background: 'rgba(255,255,255,0.25)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
        border: '1px solid rgba(255,255,255,0.3)',
        color: '#fff',
        fontSize: '0.76rem',
        fontWeight: 600,
        cursor: 'pointer',
        transition: 'all var(--transition-fast)',
        whiteSpace: 'nowrap',
    },
};
