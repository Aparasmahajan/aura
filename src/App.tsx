import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { PortalProvider } from './contexts/PortalContext';
import PortalLoader from './pages/PortalLoader';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import DashboardPage from './pages/DashboardPage';
import HomePage from './pages/HomePage';

const FolderDetailsPage = lazy(() => import('./pages/FolderDetailsPage'));
const SuperAdminPage = lazy(() => import('./pages/SuperAdminPage'));
const StudentLayout = lazy(() => import('./pages/student/StudentLayout'));
const ExamPage = lazy(() => import('./pages/exam/ExamPage'));

const PageLoader = () => (
  <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f7fafc' }}>
    <div style={{ width: 40, height: 40, border: '4px solid #e2e8f0', borderTopColor: '#667eea', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
  </div>
);

// Redirects after login based on role
function RoleRedirect({ portalName }: { portalName: string }) {
  const { user } = useAuth();
  if (!user) return <Navigate to={`/${portalName}/login`} replace />;
  if (user.role === 'student') return <Navigate to={`/${portalName}/student/home`} replace />;
  return <Navigate to={`/${portalName}/dashboard`} replace />;
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <PortalProvider>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/exam" element={<Suspense fallback={<PageLoader />}><ExamPage /></Suspense>} />
            <Route path="/admn" element={<Suspense fallback={<PageLoader />}><SuperAdminPage /></Suspense>} />

            <Route path="/:portalName" element={<PortalLoader />}>
              <Route index element={<RoleRedirectIndex />} />
              <Route path="login" element={<LoginPage />} />
              <Route path="signup" element={<SignupPage />} />

              {/* Admin / sub_admin / administrator portal */}
              <Route path="dashboard" element={<DashboardPage />} />
              <Route path="folder/:folderId" element={<Suspense fallback={<PageLoader />}><FolderDetailsPage /></Suspense>} />

              {/* Student LMS portal — all tabs nested under StudentLayout */}
              <Route path="student" element={<Suspense fallback={<PageLoader />}><StudentLayout /></Suspense>}>
                <Route index element={<Navigate to="home" replace />} />
                <Route path="home" element={<Suspense fallback={<PageLoader />}><LazyStudentHome /></Suspense>} />
                <Route path="lectures" element={<Suspense fallback={<PageLoader />}><LazyStudentLectures /></Suspense>} />
                <Route path="folder/:folderId" element={<Suspense fallback={<PageLoader />}><LazyStudentFolderView /></Suspense>} />
                <Route path="exams" element={<Suspense fallback={<PageLoader />}><LazyStudentExams /></Suspense>} />
                <Route path="assignments" element={<Suspense fallback={<PageLoader />}><LazyStudentAssignments /></Suspense>} />
                <Route path="attendance" element={<Suspense fallback={<PageLoader />}><LazyStudentAttendance /></Suspense>} />
                <Route path="fees" element={<Suspense fallback={<PageLoader />}><LazyStudentFees /></Suspense>} />
                <Route path="profile" element={<Suspense fallback={<PageLoader />}><LazyStudentProfile /></Suspense>} />
              </Route>
            </Route>
          </Routes>
        </PortalProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

// Redirects from portal root based on role
function RoleRedirectIndex() {
  const { user, isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="login" replace />;
  if (user?.role === 'student') return <Navigate to="student/home" replace />;
  return <Navigate to="dashboard" replace />;
}

// Lazy student page imports
const LazyStudentHome = lazy(() => import('./pages/student/StudentHomePage'));
const LazyStudentLectures = lazy(() => import('./pages/student/StudentLecturesPage'));
const LazyStudentFolderView = lazy(() => import('./pages/student/StudentFolderViewPage'));
const LazyStudentExams = lazy(() => import('./pages/student/StudentExamsPage'));
const LazyStudentAssignments = lazy(() => import('./pages/student/StudentAssignmentsPage'));
const LazyStudentAttendance = lazy(() => import('./pages/student/StudentAttendancePage'));
const LazyStudentFees = lazy(() => import('./pages/student/StudentFeesPage'));
const LazyStudentProfile = lazy(() => import('./pages/student/StudentProfilePage'));

export default App;
