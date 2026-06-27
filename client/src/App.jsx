import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import { ToastContainer, showToast } from './components/Toast';
import Login from './pages/Login';
import Unauthorized from './pages/Unauthorized';
import ChangePassword from './pages/ChangePassword';
import ResetPassword from './pages/ResetPassword';
import PrincipalDashboard from './pages/dashboards/PrincipalDashboard';
import StaffDashboard from './pages/dashboards/StaffDashboard';
import StudentDashboard from './pages/dashboards/StudentDashboard';
import PrincipalStudents from './pages/principal/Students';
import PrincipalStaff from './pages/principal/StaffPage';
import PrincipalAttendance from './pages/principal/Attendance';
import PrincipalMarks from './pages/principal/Marks';
import PrincipalTimetable from './pages/principal/Timetable';
import PrincipalNotices from './pages/principal/Notices';
import PrincipalFees from './pages/principal/Fees';
import PrincipalLeaveRequests from './pages/principal/LeaveRequests';
import PrincipalAuditLogs from './pages/principal/AuditLogs';
import StaffAttendance from './pages/staff/Attendance';
import StaffMarks from './pages/staff/Marks';
import StaffTimetable from './pages/staff/Timetable';
import StaffNotices from './pages/staff/Notices';
import StaffLeave from './pages/staff/Leave';
import StudentAttendance from './pages/student/Attendance';
import StudentMarks from './pages/student/Marks';
import StudentTimetable from './pages/student/Timetable';
import StudentNotices from './pages/student/Notices';
import StudentFeeStatus from './pages/student/FeeStatus';

import NotFound from './pages/NotFound';

const ROLE_REDIRECTS = {
  principal: '/principal/dashboard',
  staff: '/staff/dashboard',
  student: '/student/dashboard',
};

// Redirects logged-in users away from login/register
const GuestRoute = ({ children }) => {
  const { token, user } = useAuth();
  if (token && user) {
    return <Navigate to={ROLE_REDIRECTS[user.role] || '/'} replace />;
  }
  return children;
};

// Redirects home path / based on session
const HomeRedirect = () => {
  const { token, user } = useAuth();
  if (token && user) {
    return <Navigate to={ROLE_REDIRECTS[user.role] || '/login'} replace />;
  }
  return <Navigate to="/login" replace />;
};

function App() {
  const { user } = useAuth();

  useEffect(() => {
    if (user && user.lastPasswordChange) {
      const lastChange = new Date(user.lastPasswordChange);
      const diffTime = new Date() - lastChange;
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      const daysRemaining = 90 - diffDays;
      if (daysRemaining <= 7 && daysRemaining > 0) {
        const timer = setTimeout(() => {
          showToast(`Your password will expire in ${daysRemaining} days. Please update it soon!`, 'warning');
        }, 1200);
        return () => clearTimeout(timer);
      }
    }
  }, [user]);

  return (
    <>
      <ToastContainer />
      <Routes>
        {/* Public routes */}
        <Route
          path="/login"
          element={
            <GuestRoute>
              <Login />
            </GuestRoute>
          }
        />
        <Route
          path="/change-password"
          element={
            <ChangePassword />
          }
        />
        <Route
          path="/reset-password"
          element={
            <ResetPassword />
          }
        />

        <Route path="/unauthorized" element={<Unauthorized />} />

        {/* Principal routes */}
        <Route
          path="/principal/dashboard"
          element={
            <ProtectedRoute allowedRoles={['principal']}>
              <PrincipalDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/principal/students"
          element={
            <ProtectedRoute allowedRoles={['principal']}>
              <PrincipalStudents />
            </ProtectedRoute>
          }
        />
        <Route
          path="/principal/staff"
          element={
            <ProtectedRoute allowedRoles={['principal']}>
              <PrincipalStaff />
            </ProtectedRoute>
          }
        />

        <Route
          path="/principal/attendance"
          element={
            <ProtectedRoute allowedRoles={['principal']}>
              <PrincipalAttendance />
            </ProtectedRoute>
          }
        />
        <Route
          path="/principal/marks"
          element={
            <ProtectedRoute allowedRoles={['principal']}>
              <PrincipalMarks />
            </ProtectedRoute>
          }
        />
        <Route
          path="/principal/timetable"
          element={
            <ProtectedRoute allowedRoles={['principal']}>
              <PrincipalTimetable />
            </ProtectedRoute>
          }
        />
        <Route
          path="/principal/notices"
          element={
            <ProtectedRoute allowedRoles={['principal']}>
              <PrincipalNotices />
            </ProtectedRoute>
          }
        />
        <Route
          path="/principal/fees"
          element={
            <ProtectedRoute allowedRoles={['principal']}>
              <PrincipalFees />
            </ProtectedRoute>
          }
        />
        <Route
          path="/principal/leave-requests"
          element={
            <ProtectedRoute allowedRoles={['principal']}>
              <PrincipalLeaveRequests />
            </ProtectedRoute>
          }
        />
        <Route
          path="/principal/audit-logs"
          element={
            <ProtectedRoute allowedRoles={['principal']}>
              <PrincipalAuditLogs />
            </ProtectedRoute>
          }
        />

        {/* Staff routes */}
        <Route
          path="/staff/dashboard"
          element={
            <ProtectedRoute allowedRoles={['staff']}>
              <StaffDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/staff/attendance"
          element={
            <ProtectedRoute allowedRoles={['staff']}>
              <StaffAttendance />
            </ProtectedRoute>
          }
        />
        <Route
          path="/staff/marks"
          element={
            <ProtectedRoute allowedRoles={['staff']}>
              <StaffMarks />
            </ProtectedRoute>
          }
        />
        <Route
          path="/staff/timetable"
          element={
            <ProtectedRoute allowedRoles={['staff']}>
              <StaffTimetable />
            </ProtectedRoute>
          }
        />
        <Route
          path="/staff/notices"
          element={
            <ProtectedRoute allowedRoles={['staff']}>
              <StaffNotices />
            </ProtectedRoute>
          }
        />
        <Route
          path="/staff/leave"
          element={
            <ProtectedRoute allowedRoles={['staff']}>
              <StaffLeave />
            </ProtectedRoute>
          }
        />

        {/* Student routes */}
        <Route
          path="/student/dashboard"
          element={
            <ProtectedRoute allowedRoles={['student']}>
              <StudentDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/attendance"
          element={
            <ProtectedRoute allowedRoles={['student']}>
              <StudentAttendance />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/marks"
          element={
            <ProtectedRoute allowedRoles={['student']}>
              <StudentMarks />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/timetable"
          element={
            <ProtectedRoute allowedRoles={['student']}>
              <StudentTimetable />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/notices"
          element={
            <ProtectedRoute allowedRoles={['student']}>
              <StudentNotices />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/fee-status"
          element={
            <ProtectedRoute allowedRoles={['student']}>
              <StudentFeeStatus />
            </ProtectedRoute>
          }
        />

        {/* Root home redirect */}
        <Route path="/" element={<HomeRedirect />} />

        {/* Default redirect (404 Page) */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
}

export default App;
