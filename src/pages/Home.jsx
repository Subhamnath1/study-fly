/**
 * @fileoverview Home — PW-style onboarding / landing page.
 */

import { useAuthContext } from '@context/AuthContext';
import { useDataContext } from '@context/DataContext';
import { useNavigate } from 'react-router-dom';
import { BookOpen, LogIn, Zap, Clock, Target, Award } from 'lucide-react';

/**
 * @returns {JSX.Element}
 */
export default function Home() {
    const { user } = useAuthContext();
    const { schedule } = useDataContext();
    const navigate = useNavigate();

    return (
        <div style={styles.page}>
            {/* ── Hero Card ── */}
            <div style={styles.heroCard}>
                <div style={styles.heroIcon}>
                    <Zap size={28} color="#fff" />
                </div>
                <h1 style={styles.heroTitle}>
                    Study <span style={{ color: 'var(--accent)' }}>Automaton</span>
                </h1>
                <p style={styles.heroSub}>
                    Your personal, time-locked study engine for Class 12.
                    Physics, Chemistry &amp; Math — scheduled, tracked, and automated.
                </p>

                {!user ? (
                    <button style={styles.ctaBtn} onClick={() => navigate('/login')}>
                        <LogIn size={18} /> Sign in with Telegram
                    </button>
                ) : (
                    <button style={styles.ctaBtn} onClick={() => navigate('/dashboard')}>
                        <BookOpen size={18} /> Open Dashboard
                    </button>
                )}
            </div>

            {/* ── Feature Cards ── */}
            <div style={styles.featuresGrid}>
                <FeatureCard
                    icon={<Clock size={22} color="var(--primary)" />}
                    title="Time-Locked"
                    desc="Videos unlock at scheduled times. No shortcuts."
                    bg="var(--primary-muted)"
                />
                <FeatureCard
                    icon={<Target size={22} color="var(--error)" />}
                    title="Gap Protocol"
                    desc="Auto practice + exam days between chapters."
                    bg="var(--error-muted)"
                />
                <FeatureCard
                    icon={<Award size={22} color="var(--success)" />}
                    title="Track Progress"
                    desc="Green ticks, backlogs, and weekly tests."
                    bg="var(--success-muted)"
                />
            </div>

            {/* ── Stats Strip ── */}
            <div style={styles.statsStrip}>
                <div style={styles.statItem}>
                    <span style={styles.statNum}>{schedule.length}</span>
                    <span style={styles.statLbl}>Days</span>
                </div>
                <div style={styles.divider} />
                <div style={styles.statItem}>
                    <span style={styles.statNum}>3</span>
                    <span style={styles.statLbl}>Subjects</span>
                </div>
                <div style={styles.divider} />
                <div style={styles.statItem}>
                    <span style={styles.statNum}>∞</span>
                    <span style={styles.statLbl}>Dedication</span>
                </div>
            </div>
        </div>
    );
}

function FeatureCard({ icon, title, desc, bg }) {
    return (
        <div style={styles.featureCard}>
            <div style={{ ...styles.featureIcon, background: bg }}>{icon}</div>
            <h3 style={styles.featureTitle}>{title}</h3>
            <p style={styles.featureDesc}>{desc}</p>
        </div>
    );
}

/** @type {Record<string, import('react').CSSProperties>} */
const styles = {
    page: {
        maxWidth: 520,
        margin: '0 auto',
        padding: '40px 16px 60px',
        display: 'flex',
        flexDirection: 'column',
        gap: 24,
        alignItems: 'center',
    },

    /* Hero */
    heroCard: {
        width: '100%',
        textAlign: 'center',
        padding: '36px 28px 32px',
        borderRadius: 'var(--radius-lg)',
        background: 'linear-gradient(135deg, var(--primary), #7C6BF0)',
        color: '#fff',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 14,
        boxShadow: '0 8px 30px rgba(90, 75, 218, 0.25)',
    },
    heroIcon: {
        width: 56,
        height: 56,
        borderRadius: 16,
        background: 'rgba(255,255,255,0.2)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
    },
    heroTitle: {
        fontSize: '1.8rem',
        fontWeight: 900,
        lineHeight: 1.15,
    },
    heroSub: {
        fontSize: '0.9rem',
        lineHeight: 1.6,
        opacity: 0.9,
        maxWidth: 380,
    },
    ctaBtn: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        padding: '12px 28px',
        borderRadius: 'var(--radius-full)',
        background: '#fff',
        color: 'var(--primary)',
        fontSize: '0.92rem',
        fontWeight: 700,
        border: 'none',
        cursor: 'pointer',
        marginTop: 4,
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        transition: 'transform var(--transition-fast)',
    },

    /* Features */
    featuresGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 12,
        width: '100%',
    },
    featureCard: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8,
        padding: '20px 12px',
        borderRadius: 'var(--radius-card)',
        background: 'var(--bg-card)',
        border: '1px solid var(--border-light)',
        boxShadow: 'var(--shadow-sm)',
        textAlign: 'center',
    },
    featureIcon: {
        width: 44,
        height: 44,
        borderRadius: 12,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    featureTitle: {
        fontSize: '0.82rem',
        fontWeight: 700,
        color: 'var(--text-main)',
    },
    featureDesc: {
        fontSize: '0.72rem',
        color: 'var(--text-muted)',
        lineHeight: 1.4,
    },

    /* Stats strip */
    statsStrip: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 24,
        padding: '18px 28px',
        borderRadius: 'var(--radius-card)',
        background: 'var(--bg-card)',
        border: '1px solid var(--border-light)',
        width: '100%',
        boxShadow: 'var(--shadow-sm)',
    },
    statItem: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 2,
    },
    statNum: {
        fontSize: '1.4rem',
        fontWeight: 800,
        color: 'var(--primary)',
    },
    statLbl: {
        fontSize: '0.7rem',
        fontWeight: 600,
        color: 'var(--text-muted)',
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
    },
    divider: {
        width: 1,
        height: 32,
        background: 'var(--border-light)',
    },
};
