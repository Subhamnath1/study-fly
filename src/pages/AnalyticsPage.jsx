/**
 * @fileoverview AnalyticsPage — Study statistics and performance overview.
 */

import { useMemo } from 'react';
import { useSchedule } from '@hooks/useSchedule';
import { useProgress } from '@hooks/useProgress';
import { BarChart3, TrendingUp, Clock, Target, Award, Flame } from 'lucide-react';

export default function AnalyticsPage() {
    const { schedule, backlog } = useSchedule();
    const { progressMap } = useProgress();

    const stats = useMemo(() => {
        if (!schedule) return { total: 0, completed: 0, pending: 0, subjects: {} };

        let total = 0, completed = 0;
        const subjects = {};

        schedule.forEach((day) => {
            if (!day.subjects) return;
            day.subjects.forEach((s) => {
                total++;
                if (progressMap[s.videoId]?.completed) completed++;
                if (!subjects[s.subject]) subjects[s.subject] = { total: 0, completed: 0 };
                subjects[s.subject].total++;
                if (progressMap[s.videoId]?.completed) subjects[s.subject].completed++;
            });
        });

        return { total, completed, pending: total - completed, subjects };
    }, [schedule, progressMap]);

    const pct = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

    return (
        <div style={styles.page}>
            <h2 style={styles.pageTitle}>📊 Analytics</h2>

            {/* Overview Cards */}
            <div style={styles.overviewGrid}>
                <OverviewCard icon={<Target size={22} />} value={stats.total} label="Total Lessons" color="var(--primary)" />
                <OverviewCard icon={<Award size={22} />} value={stats.completed} label="Completed" color="var(--success)" />
                <OverviewCard icon={<Clock size={22} />} value={stats.pending} label="Pending" color="var(--warning)" />
                <OverviewCard icon={<TrendingUp size={22} />} value={`${pct}%`} label="Progress" color="var(--info)" />
            </div>

            {/* Subject Breakdown */}
            <div style={styles.sectionCard}>
                <h3 style={styles.sectionTitle}>Subject Breakdown</h3>
                <div style={styles.subjectBars}>
                    {Object.entries(stats.subjects).map(([name, data]) => {
                        const subjPct = data.total > 0 ? Math.round((data.completed / data.total) * 100) : 0;
                        return (
                            <div key={name} style={styles.barRow}>
                                <span style={styles.barLabel}>{name}</span>
                                <div style={styles.barTrack}>
                                    <div style={{ ...styles.barFill, width: `${subjPct}%`, background: `var(--${name.toLowerCase()})` }} />
                                </div>
                                <span style={styles.barPct}>{subjPct}%</span>
                                <span style={styles.barCount}>{data.completed}/{data.total}</span>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Overall Progress Ring */}
            <div style={styles.sectionCard}>
                <h3 style={styles.sectionTitle}>Overall Completion</h3>
                <div style={styles.ringWrapper}>
                    <svg width="160" height="160" viewBox="0 0 160 160">
                        <circle cx="80" cy="80" r="65" fill="none" stroke="var(--border-light)" strokeWidth="12" />
                        <circle
                            cx="80" cy="80" r="65" fill="none"
                            stroke="var(--primary)" strokeWidth="12"
                            strokeDasharray={`${(pct / 100) * 408} 408`}
                            strokeDashoffset="0"
                            strokeLinecap="round"
                            transform="rotate(-90 80 80)"
                            style={{ transition: 'stroke-dasharray 0.5s ease' }}
                        />
                        <text x="80" y="75" textAnchor="middle" fontSize="28" fontWeight="800" fill="var(--text-main)">{pct}%</text>
                        <text x="80" y="100" textAnchor="middle" fontSize="12" fontWeight="500" fill="var(--text-muted)">Complete</text>
                    </svg>
                </div>
            </div>
        </div>
    );
}

function OverviewCard({ icon, value, label, color }) {
    return (
        <div style={styles.overviewCard}>
            <div style={{ ...styles.iconCircle, background: color + '14', color }}>{icon}</div>
            <span style={styles.overviewValue}>{value}</span>
            <span style={styles.overviewLabel}>{label}</span>
        </div>
    );
}

const styles = {
    page: { padding: '24px 28px 40px', maxWidth: 1200, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 },
    pageTitle: { fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-main)' },

    overviewGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 },
    overviewCard: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '24px 16px', borderRadius: 'var(--radius-lg)', background: 'var(--bg-card)', border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-sm)' },
    iconCircle: { width: 48, height: 48, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' },
    overviewValue: { fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-main)' },
    overviewLabel: { fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' },

    sectionCard: { background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-light)', padding: 24, boxShadow: 'var(--shadow-sm)' },
    sectionTitle: { fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: 20 },

    subjectBars: { display: 'flex', flexDirection: 'column', gap: 14 },
    barRow: { display: 'flex', alignItems: 'center', gap: 12 },
    barLabel: { width: 90, fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' },
    barTrack: { flex: 1, height: 10, borderRadius: 6, background: 'var(--bg-app)' },
    barFill: { height: '100%', borderRadius: 6, transition: 'width var(--transition-base)' },
    barPct: { width: 40, fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)', textAlign: 'right' },
    barCount: { width: 50, fontSize: '0.72rem', color: 'var(--text-muted)', textAlign: 'right' },

    ringWrapper: { display: 'flex', justifyContent: 'center', padding: '16px 0' },
};
