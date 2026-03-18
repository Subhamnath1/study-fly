/**
 * @fileoverview DppResult — The post-submission summary page for DPPs.
 * Route: /dpp-result
 */

import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ChevronLeft, BarChart2, CheckCircle, XCircle, SkipForward, Clock, Target, Play, Eye } from 'lucide-react';
import dppsData from '@data/dpps.json';

export default function DppResult() {
    const location = useLocation();
    const navigate = useNavigate();
    const [viewMode, setViewMode] = useState('summary'); // 'summary' | 'analysis'

    // Expect resultData from react-router state
    const { resultData } = location.state || {};

    if (!resultData) {
        return (
            <div style={styles.blocker}>
                <h2 style={styles.blockerTitle}>No Result Data</h2>
                <button style={styles.backBtn} onClick={() => navigate('/courses')}>
                    Go to Courses
                </button>
            </div>
        );
    }

    const {
        dppId, dppTitle, totalQuestions, totalMarks,
        score, correct, incorrect, skipped, accuracy,
        completedPct, timeElapsed, userAnswers
    } = resultData;

    const dpp = dppsData[dppId];

    const formatTimer = (secs) => {
        const h = Math.floor(secs / 3600);
        const m = Math.floor((secs % 3600) / 60);
        const s = secs % 60;
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    return (
        <div style={styles.page}>
            {/* Simple Top Navigation */}
            <header style={styles.header}>
                <button style={styles.headerBackBtn} onClick={() => navigate('/courses')}>
                    <ChevronLeft size={16} /> Back
                </button>
                <div style={styles.xpBadge}>
                    <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#64748B' }}>
                        XP 0
                    </span>
                </div>
            </header>

            <main style={styles.content}>
                {/* Header Banner */}
                <div style={styles.banner}>
                    <div style={styles.bannerInfo}>
                        <h2 style={styles.bannerTitle}>{dppTitle}</h2>
                        <span style={styles.bannerSubtitle}>
                            📄 {totalQuestions} Questions • {totalMarks} Marks
                        </span>

                        <div style={styles.bannerActions}>
                            <button style={styles.btnReattempt} onClick={() => navigate(`/dpp/${dppId}`)}>
                                Reattempt
                            </button>
                            <button style={styles.btnReview} onClick={() => setViewMode(viewMode === 'summary' ? 'analysis' : 'summary')}>
                                <Eye size={16} /> {viewMode === 'summary' ? 'View Analysis' : 'View Summary'}
                            </button>
                            <button style={styles.btnSolutions} onClick={() => {
                                if (dpp?.pdf) {
                                    window.open(dpp.pdf, '_blank');
                                }
                            }}>
                                View Solutions
                            </button>
                        </div>
                    </div>
                </div>

                {viewMode === 'summary' ? (
                    <>
                        <h3 className="stagger-1" style={styles.sectionTitle}>Result Summary</h3>

                {/* Score Card */}
                <div className="stagger-1" style={styles.scoreCard}>
                    <div>
                        <div style={styles.cardHeader}>SCORE</div>
                        <div style={styles.scoreText}>
                            <span style={styles.scoreHighlight}>{score}</span>/{totalMarks}
                        </div>
                    </div>
                    <div>
                        <BarChart2 size={48} color="#94A3B8" strokeWidth={1.5} />
                    </div>
                </div>

                {/* Progress Grid */}
                <h4 className="stagger-2" style={styles.subSectionTitle}>Your Progress</h4>

                <div className="stagger-3" style={styles.progressGrid}>
                    {/* Correct */}
                    <div style={styles.statBox}>
                        <div style={styles.statRow}>
                            <span style={{ ...styles.statLabel, color: '#10B981' }}>
                                <CheckCircle size={14} /> Correct
                            </span>
                            <span style={styles.statValue}>{correct}/{totalQuestions}</span>
                        </div>
                        <div style={styles.statBarBg}><div style={{ ...styles.statBarFill, width: `${(correct / totalQuestions) * 100}%`, background: '#10B981' }} /></div>
                    </div>

                    {/* Incorrect */}
                    <div style={styles.statBox}>
                        <div style={styles.statRow}>
                            <span style={{ ...styles.statLabel, color: '#EF4444' }}>
                                <XCircle size={14} /> Incorrect
                            </span>
                            <span style={styles.statValue}>{incorrect}/{totalQuestions}</span>
                        </div>
                        <div style={styles.statBarBg}><div style={{ ...styles.statBarFill, width: `${(incorrect / totalQuestions) * 100}%`, background: '#EF4444' }} /></div>
                    </div>

                    {/* Skipped */}
                    <div style={styles.statBox}>
                        <div style={styles.statRow}>
                            <span style={{ ...styles.statLabel, color: '#64748B' }}>
                                <SkipForward size={14} /> Skipped
                            </span>
                            <span style={styles.statValue}>{skipped}/{totalQuestions}</span>
                        </div>
                        <div style={styles.statBarBg}><div style={{ ...styles.statBarFill, width: `${(skipped / totalQuestions) * 100}%`, background: '#94A3B8' }} /></div>
                    </div>

                    {/* Accuracy */}
                    <div style={styles.statBox}>
                        <div style={styles.statRow}>
                            <span style={{ ...styles.statLabel, color: '#3B82F6' }}>
                                <Target size={14} /> Accuracy
                            </span>
                            <span style={styles.statValue}>{accuracy}%</span>
                        </div>
                        <div style={styles.statBarBg}><div style={{ ...styles.statBarFill, width: `${accuracy}%`, background: '#3B82F6' }} /></div>
                    </div>

                    {/* Completed */}
                    <div style={styles.statBox}>
                        <div style={styles.statRow}>
                            <span style={{ ...styles.statLabel, color: '#8B5CF6' }}>
                                <Play size={14} /> Completed
                            </span>
                            <span style={styles.statValue}>{completedPct}%</span>
                        </div>
                        <div style={styles.statBarBg}><div style={{ ...styles.statBarFill, width: `${completedPct}%`, background: '#8B5CF6' }} /></div>
                    </div>

                    {/* Time Taken */}
                    <div style={styles.statBox}>
                        <div style={styles.statRow}>
                            <span style={{ ...styles.statLabel, color: '#F59E0B' }}>
                                <Clock size={14} /> Total Time
                            </span>
                            <span style={{ ...styles.statValue, letterSpacing: '0.05em' }}>{formatTimer(timeElapsed)}</span>
                        </div>
                        <div style={styles.statBarBg}><div style={{ ...styles.statBarFill, width: `100%`, background: '#F59E0B' }} /></div>
                    </div>

                    {/* Average Time Per Question */}
                    <div style={styles.statBox}>
                        <div style={styles.statRow}>
                            <span style={{ ...styles.statLabel, color: '#A855F7' }}>
                                <Clock size={14} /> Avg Time / Q
                            </span>
                            <span style={{ ...styles.statValue, letterSpacing: '0.05em' }}>{formatTimer(totalQuestions > 0 ? timeElapsed / totalQuestions : 0)}</span>
                        </div>
                        <div style={styles.statBarBg}><div style={{ ...styles.statBarFill, width: `100%`, background: '#A855F7' }} /></div>
                    </div>

                </div>
                    </>
                ) : (
                    <>
                        <h3 className="stagger-1" style={styles.sectionTitle}>Question Analysis</h3>
                        <div className="stagger-2" style={styles.analysisGrid}>
                            {dpp && dpp.questions.map((q) => {
                                const userAns = userAnswers?.[q.q];
                                const isSkipped = userAns === undefined || userAns === '';
                                const isTypeInt = q.type === 'integer';
                                
                                let statusColor = '#94A3B8'; // gray for skipped
                                let statusBg = '#F8FAFC';
                                let statusIcon = <SkipForward size={16} />;

                                if (!isSkipped) {
                                    if (isTypeInt) {
                                        if (userAns === 'SOLVED') {
                                            statusColor = '#10B981'; statusBg = '#ECFDF5'; statusIcon = <CheckCircle size={16} />;
                                        } else {
                                            statusColor = '#EF4444'; statusBg = '#FEF2F2'; statusIcon = <XCircle size={16} />;
                                        }
                                    } else {
                                        if (userAns.toString() === q.answer?.toString()) {
                                            statusColor = '#10B981'; statusBg = '#ECFDF5'; statusIcon = <CheckCircle size={16} />;
                                        } else {
                                            statusColor = '#EF4444'; statusBg = '#FEF2F2'; statusIcon = <XCircle size={16} />;
                                        }
                                    }
                                }

                                return (
                                    <div key={q.q} style={{ ...styles.analysisCard, borderColor: statusColor, background: statusBg }}>
                                        <div style={styles.analysisHeader}>
                                            <span style={{ fontWeight: 700, color: '#1E293B' }}>Q{q.q}</span>
                                            <span style={{ color: statusColor, display: 'flex', alignItems: 'center' }}>
                                                {statusIcon}
                                            </span>
                                        </div>
                                        <div style={styles.analysisBody}>
                                            {isSkipped ? (
                                                <span style={{ color: '#64748B', fontStyle: 'italic', fontSize: '0.85rem' }}>Skipped</span>
                                            ) : (
                                                <>
                                                    <div style={styles.ansRow}>
                                                        <span style={styles.ansLabel}>Your Answer:</span>
                                                        <span style={{ fontWeight: 700, color: statusColor }}>{userAns}</span>
                                                    </div>
                                                    {!isTypeInt && userAns.toString() !== q.answer?.toString() && (
                                                        <div style={styles.ansRow}>
                                                            <span style={styles.ansLabel}>Correct:</span>
                                                            <span style={{ fontWeight: 700, color: '#10B981' }}>{q.answer}</span>
                                                        </div>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </>
                )}
            </main>
        </div>
    );
}

const styles = {
    blocker: { height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#F8FAFC' },
    blockerTitle: { fontSize: '1.5rem', fontWeight: 800, color: '#1E293B', marginBottom: 16 },
    backBtn: { padding: '10px 24px', borderRadius: 24, background: '#6366F1', color: '#fff', border: 'none', fontWeight: 600, cursor: 'pointer' },

    page: { minHeight: '100vh', background: '#fff', fontFamily: 'inherit' },

    header: {
        height: 60, borderBottom: '1px solid #E2E8F0', padding: '0 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between'
    },
    headerBackBtn: {
        background: 'none', border: 'none', fontSize: '0.9rem', fontWeight: 600,
        color: '#1E293B', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer'
    },
    xpBadge: {
        background: '#F8FAFC', padding: '6px 12px', borderRadius: 24, border: '1px solid #E2E8F0'
    },

    content: { maxWidth: 900, margin: '0 auto', padding: '40px 24px' },

    banner: {
        background: '#EFEEFE', // light purple from reference
        borderRadius: 16, padding: '32px 40px', marginBottom: 32,
        backgroundImage: 'linear-gradient(to right, #EFEEFE, #EAE8FC)',
        position: 'relative', overflow: 'hidden'
    },
    bannerInfo: { position: 'relative', zIndex: 2 },
    bannerTitle: { fontSize: '1.3rem', fontWeight: 700, color: '#1E293B', marginBottom: 8 },
    bannerSubtitle: { fontSize: '0.85rem', color: '#64748B', fontWeight: 600 },

    bannerActions: { display: 'flex', gap: 12, marginTop: 24, flexWrap: 'wrap' },
    btnReattempt: {
        background: '#fff', border: '1px solid #6366F1', color: '#6366F1',
        fontWeight: 600, fontSize: '0.9rem', padding: '10px 20px', borderRadius: 8, cursor: 'pointer'
    },
    btnReview: {
        background: '#fff', border: '1px solid #10B981', color: '#10B981',
        fontWeight: 600, fontSize: '0.9rem', padding: '10px 20px', borderRadius: 8, cursor: 'pointer',
        display: 'flex', alignItems: 'center', gap: 6
    },
    btnSolutions: {
        background: '#6366F1', border: 'none', color: '#fff',
        fontWeight: 600, fontSize: '0.9rem', padding: '10px 20px', borderRadius: 8, cursor: 'pointer'
    },

    sectionTitle: { fontSize: '1.1rem', fontWeight: 700, color: '#1E293B', marginBottom: 16 },

    scoreCard: {
        border: '1px solid #93C5FD', borderRadius: 12, padding: '24px 32px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        background: '#F0F9FF', marginBottom: 32
    },
    cardHeader: { fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.05em', color: '#1E293B', marginBottom: 8 },
    scoreText: { fontSize: '1.2rem', fontWeight: 700, color: '#64748B' },
    scoreHighlight: { fontSize: '2.5rem', color: '#0F172A', marginLeft: -4 },

    subSectionTitle: { fontSize: '0.9rem', fontWeight: 700, color: '#1E293B', marginBottom: 16 },

    progressGrid: {
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 16,
        background: '#F8FAFC', padding: 24, borderRadius: 12, border: '1px solid #E2E8F0'
    },
    statBox: {
        background: '#fff', border: '1px solid #E2E8F0', borderRadius: 8, padding: '16px'
    },
    statRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    statLabel: { fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 },
    statValue: { fontSize: '0.85rem', fontWeight: 700, color: '#1E293B' },
    statBarBg: { width: '100%', height: 4, background: '#F1F5F9', borderRadius: 4, overflow: 'hidden' },
    statBarFill: { height: '100%', borderRadius: 4 },

    analysisGrid: {
        display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 12,
        marginTop: 16
    },
    analysisCard: {
        border: '1px solid', borderRadius: 8, padding: '12px', display: 'flex', flexDirection: 'column'
    },
    analysisHeader: {
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #E2E8F0', paddingBottom: 6, marginBottom: 8
    },
    analysisBody: {
        display: 'flex', flexDirection: 'column', gap: 4
    },
    ansRow: {
        display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem'
    },
    ansLabel: {
        color: '#64748B'
    }
};
