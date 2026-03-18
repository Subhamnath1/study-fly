/**
 * @fileoverview TopBar — PW-style sticky header with logo, greeting, and user avatar.
 */

import { useAuthContext } from '@context/AuthContext';
import { Bell, LogOut, User } from 'lucide-react';

/**
 * PW-style top navigation bar.
 * @returns {JSX.Element}
 */
export default function TopBar() {
    const { user, logout } = useAuthContext();

    const initials = user?.name
        ? user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
        : 'ST';

    return (
        <header style={styles.bar}>
            {/* Left: Brand */}
            <div style={styles.brand}>
                <div style={styles.logoCircle}>
                    <span style={styles.logoText}>SA</span>
                </div>
                <div>
                    <h1 style={styles.appName}>Study Automaton</h1>
                    <p style={styles.batch}>Class 12 • 2026</p>
                </div>
            </div>

            {/* Right: Actions */}
            <div style={styles.actions}>
                <button style={styles.iconBtn} aria-label="Notifications">
                    <Bell size={20} color="var(--text-muted)" />
                </button>

                {user ? (
                    <div style={styles.avatarRow}>
                        <div style={styles.avatar}>
                            {user.photoURL ? (
                                <img src={user.photoURL} alt={user.name} style={styles.avatarImg} />
                            ) : (
                                <span style={styles.avatarInitials}>{initials}</span>
                            )}
                        </div>
                        <button style={styles.iconBtn} onClick={logout} aria-label="Sign Out">
                            <LogOut size={18} color="var(--text-muted)" />
                        </button>
                    </div>
                ) : (
                    <div style={styles.avatar}>
                        <User size={18} color="#fff" />
                    </div>
                )}
            </div>
        </header>
    );
}

/** @type {Record<string, import('react').CSSProperties>} */
const styles = {
    bar: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 20px',
        background: 'var(--bg-card)',
        borderBottom: '1px solid var(--border-light)',
        position: 'sticky',
        top: 0,
        zIndex: 'var(--z-sticky)',
    },
    brand: {
        display: 'flex',
        alignItems: 'center',
        gap: 12,
    },
    logoCircle: {
        width: 40,
        height: 40,
        borderRadius: 10,
        background: 'linear-gradient(135deg, var(--primary), #7C6BF0)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
    },
    logoText: {
        color: '#fff',
        fontWeight: 800,
        fontSize: '0.85rem',
        letterSpacing: '-0.02em',
    },
    appName: {
        fontSize: '1.05rem',
        fontWeight: 700,
        color: 'var(--text-main)',
        lineHeight: 1.2,
    },
    batch: {
        fontSize: '0.72rem',
        color: 'var(--text-muted)',
        fontWeight: 500,
    },
    actions: {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
    },
    iconBtn: {
        width: 36,
        height: 36,
        borderRadius: 10,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-app)',
        border: 'none',
        cursor: 'pointer',
        transition: 'background var(--transition-fast)',
    },
    avatarRow: {
        display: 'flex',
        alignItems: 'center',
        gap: 6,
    },
    avatar: {
        width: 36,
        height: 36,
        borderRadius: 10,
        background: 'linear-gradient(135deg, var(--primary), #7C6BF0)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        flexShrink: 0,
    },
    avatarImg: {
        width: '100%',
        height: '100%',
        objectFit: 'cover',
    },
    avatarInitials: {
        color: '#fff',
        fontSize: '0.78rem',
        fontWeight: 700,
    },
};
