/**
 * @fileoverview 404 Not Found page.
 */

import { Home } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

/**
 * NotFound page component — displayed when no route matches.
 *
 * @returns {JSX.Element}
 */
export default function NotFound() {
    const navigate = useNavigate();

    return (
        <div style={styles.page}>
            <span style={styles.code}>404</span>
            <h1 style={styles.title}>Page Not Found</h1>
            <p style={styles.sub}>
                The page you're looking for doesn't exist or has been moved.
            </p>
            <button style={styles.btn} onClick={() => navigate('/')} id="notfound-home-btn">
                <Home size={18} />
                Back to Home
            </button>
        </div>
    );
}

/** @type {Record<string, import('react').CSSProperties>} */
const styles = {
    page: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '80vh',
        gap: 'var(--space-md)',
        textAlign: 'center',
        padding: 'var(--space-xl)',
    },
    code: {
        fontSize: '5rem',
        fontWeight: 900,
        lineHeight: 1,
        background: 'linear-gradient(135deg, var(--primary), var(--accent))',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
    },
    title: {
        fontSize: '1.5rem',
        fontWeight: 700,
        color: 'var(--text)',
    },
    sub: {
        fontSize: '0.95rem',
        color: 'var(--text-secondary)',
        maxWidth: '380px',
    },
    btn: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        padding: '12px 28px',
        borderRadius: 'var(--radius-full)',
        background: 'var(--primary)',
        color: '#fff',
        fontSize: '0.925rem',
        fontWeight: 600,
        border: 'none',
        cursor: 'pointer',
        marginTop: 'var(--space-sm)',
    },
};
