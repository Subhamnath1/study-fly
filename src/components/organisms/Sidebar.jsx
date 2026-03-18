/**
 * @fileoverview Sidebar — Fixed left navigation panel inspired by modern edu-platforms.
 *
 * Features:
 * - Brand logo + name
 * - Navigation links with active indicator
 * - User profile at bottom
 * - Collapses to icon-only on mobile via prop
 */

import { useLocation, useNavigate } from 'react-router-dom';
import { useAuthContext } from '@context/AuthContext';
import {
    LayoutDashboard,
    CalendarDays,
    BarChart3,
    Bot,
    LogOut,
    ChevronLeft,
    ChevronRight,
    Zap,
    BookOpen,
} from 'lucide-react';

const NAV_ITEMS = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
    { id: 'courses', label: 'Courses', icon: BookOpen, path: '/courses', badge: null },
    { id: 'calendar', label: 'Calendar', icon: CalendarDays, path: '/calendar', badge: null },
    { id: 'analytics', label: 'Analytics', icon: BarChart3, path: '/analytics', badge: null },
    { id: 'ai-tutor', label: 'AI Tutor', icon: Bot, path: '/ai-tutor', badge: 'NEW' },
];

/**
 * @param {Object} props
 * @param {boolean} props.collapsed
 * @param {() => void} props.onToggle
 */
export default function Sidebar({ collapsed, onToggle }) {
    const { user, logout } = useAuthContext();
    const location = useLocation();
    const navigate = useNavigate();

    const initials = user?.name
        ? user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
        : 'ST';

    return (
        <aside className={`sidebar ${collapsed ? 'sidebar--collapsed' : ''}`}>
            {/* ── Brand ── */}
            <div className="sidebar__brand">
                <div className="sidebar__logo">
                    <Zap size={20} color="#fff" />
                </div>
                {!collapsed && (
                    <div className="sidebar__brand-text">
                        <span className="sidebar__app-name">Study Fly</span>
                    </div>
                )}
            </div>

            {/* ── Nav Links ── */}
            <nav className="sidebar__nav">
                {NAV_ITEMS.map((item) => {
                    const isActive = location.pathname === item.path;
                    return (
                        <button
                            key={item.id}
                            className={`sidebar__link ${isActive ? 'sidebar__link--active' : ''}`}
                            onClick={() => navigate(item.path)}
                            title={collapsed ? item.label : undefined}
                        >
                            <item.icon size={20} />
                            {!collapsed && <span>{item.label}</span>}
                            {!collapsed && item.badge && (
                                <span className="sidebar__badge">{item.badge}</span>
                            )}
                        </button>
                    );
                })}
            </nav>

            {/* ── Spacer ── */}
            <div style={{ flex: 1 }} />

            {/* ── Collapse Toggle ── */}
            <button className="sidebar__toggle" onClick={onToggle} title="Toggle Sidebar">
                {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
            </button>

            {/* ── User Profile ── */}
            {user && (
                <div className="sidebar__user">
                    <div className="sidebar__avatar">
                        {user.photoURL ? (
                            <img src={user.photoURL} alt={user.name} className="sidebar__avatar-img" />
                        ) : (
                            <span className="sidebar__avatar-initials">{initials}</span>
                        )}
                    </div>
                    {!collapsed && (
                        <div className="sidebar__user-info">
                            <span className="sidebar__user-name">{user.name || 'Student'}</span>
                            <span className="sidebar__user-email">{user.email || 'Class 12 • 2026'}</span>
                        </div>
                    )}
                    {!collapsed && (
                        <button className="sidebar__logout" onClick={logout} title="Sign Out">
                            <LogOut size={16} />
                        </button>
                    )}
                </div>
            )}
        </aside>
    );
}
