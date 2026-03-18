/**
 * @fileoverview App — root component with lazy-loaded routes, AppShell sidebar layout, and ErrorBoundary.
 */

import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import ErrorBoundary from '@atoms/ErrorBoundary';
import ProtectedRoute from '@templates/ProtectedRoute';
import AppShell from '@templates/AppShell';
import { AuthProvider } from '@context/AuthContext';
import { DataProvider } from '@context/DataContext';
import { syncServerTime } from '@services/timeService';

/* Sync server clock on app init (non-blocking) */
syncServerTime();

/* ------- Lazy-loaded pages ------- */
const Home = lazy(() => import('@pages/Home'));
const Dashboard = lazy(() => import('@pages/Dashboard'));
const Player = lazy(() => import('@pages/Player'));
const ExamPortal = lazy(() => import('@pages/ExamPortal'));
const ExamSuccess = lazy(() => import('@pages/ExamSuccess'));
const DppPortal = lazy(() => import('@pages/DppPortal'));
const DppResult = lazy(() => import('@pages/DppResult'));
const CalendarPage = lazy(() => import('@pages/CalendarPage'));
const CoursesPage = lazy(() => import('@pages/CoursesPage'));
const SubjectView = lazy(() => import('@pages/SubjectView'));
const AnalyticsPage = lazy(() => import('@pages/AnalyticsPage'));
const AiTutorPage = lazy(() => import('@pages/AiTutorPage'));
const Result = lazy(() => import('@pages/Result'));
const Login = lazy(() => import('@pages/Login'));
const NotFound = lazy(() => import('@pages/NotFound'));

/**
 * Global loading fallback shown while lazy chunks are being fetched.
 * @returns {import('react').JSX.Element}
 */
function PageLoader() {
  return (
    <div className="loader-container">
      <div className="spinner" />
      <span className="loader-text">Loading module…</span>
    </div>
  );
}

/**
 * Root application component.
 * @returns {import('react').JSX.Element}
 */
export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <DataProvider>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* Public Route */}
              <Route path="/login" element={<Login />} />

              {/* Protected Routes with Sidebar Layout */}
              <Route
                element={
                  <ProtectedRoute>
                    <AppShell />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Home />} />
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="courses" element={<CoursesPage />} />
                <Route path="courses/:subjectId" element={<SubjectView />} />
                <Route path="calendar" element={<CalendarPage />} />
                <Route path="analytics" element={<AnalyticsPage />} />
                <Route path="ai-tutor" element={<AiTutorPage />} />
                <Route path="result/:examId" element={<Result />} />
                <Route path="watch/:videoId" element={<Player />} />
                <Route path="exam/:examId" element={<ExamPortal />} />
                <Route path="exam-success" element={<ExamSuccess />} />
                <Route path="dpp/:dppId" element={<DppPortal />} />
                <Route path="dpp-result" element={<DppResult />} />
              </Route>

              {/* 404 Fallback */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </DataProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
