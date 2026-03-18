/**
 * @fileoverview SubjectTabs — PW-style horizontal pill filter for subjects.
 */

import { BookOpen, FlaskConical, Sigma, LayoutGrid } from 'lucide-react';

const TABS = [
    { key: 'all', label: 'All', icon: LayoutGrid, color: 'var(--primary)' },
    { key: 'Physics', label: 'Physics', icon: BookOpen, color: 'var(--physics)' },
    { key: 'Math', label: 'Math', icon: Sigma, color: 'var(--math)' },
    { key: 'Chemistry', label: 'Chemistry', icon: FlaskConical, color: 'var(--chemistry)' },
];

/**
 * @param {Object} props
 * @param {string} props.active - Currently selected tab key.
 * @param {(key: string) => void} props.onChange - Callback when tab is clicked.
 * @returns {JSX.Element}
 */
export default function SubjectTabs({ active, onChange }) {
    return (
        <div style={styles.track} className="hide-scrollbar">
            {TABS.map((tab) => {
                const isActive = active === tab.key;
                const Icon = tab.icon;

                return (
                    <button
                        key={tab.key}
                        onClick={() => onChange(tab.key)}
                        style={{
                            ...styles.pill,
                            ...(isActive
                                ? { background: tab.color, color: '#fff', borderColor: tab.color }
                                : {}),
                        }}
                    >
                        <Icon size={15} />
                        {tab.label}
                    </button>
                );
            })}
        </div>
    );
}

/** @type {Record<string, import('react').CSSProperties>} */
const styles = {
    track: {
        display: 'flex',
        gap: 10,
        overflowX: 'auto',
        padding: '4px 0',
    },
    pill: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '8px 16px',
        borderRadius: 'var(--radius-full)',
        fontSize: '0.82rem',
        fontWeight: 600,
        whiteSpace: 'nowrap',
        border: '1.5px solid var(--border-light)',
        background: 'var(--bg-card)',
        color: 'var(--text-muted)',
        cursor: 'pointer',
        transition: 'all var(--transition-fast)',
        flexShrink: 0,
    },
};
