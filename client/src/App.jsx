import React, { Suspense, lazy } from 'react';
import {
    BrowserRouter,
    Routes,
    Route,
    Navigate,
    useNavigate
} from 'react-router-dom';
import { AuthProvider, useAuth, SYSTEM_ROLES } from '@context/AuthContext';
import { ProtectedRoute, PublicOnlyRoute } from '@components/guards/ProtectedRoute';
import AppShell from '@components/layout/AppShell';
const PublicRegistrationLedger = lazy(() => import('@pages/public/registration/PublicRegistrationLedger'));
const Login = lazy(() => import('@pages/auth/Login'));
const AdminDashboard = lazy(() => import('@pages/admin/AdminDashboard'));
const TeacherDirectory = lazy(() => import('@pages/admin/TeacherDirectory'));
const PendingApprovals = lazy(() => import('@pages/admin/PendingApprovals'));
const TeacherProfileDossier = lazy(() => import('@pages/admin/TeacherProfileDossier'));
const AttendanceManagement = lazy(() => import('@pages/admin/AttendanceManagement'));
const PayrollManagement = lazy(() => import('@pages/admin/PayrollManagement'));
const SystemSettings = lazy(() => import('@pages/admin/SystemSettings'));
const TeacherDashboardView = lazy(() =>
    import('@pages/teacher/TeacherPortalSuite').then((module) => ({ default: module.TeacherDashboardView }))
);
const TeacherAttendanceView = lazy(() =>
    import('@pages/teacher/TeacherPortalSuite').then((module) => ({ default: module.TeacherAttendanceView }))
);
const TeacherPayrollView = lazy(() =>
    import('@pages/teacher/TeacherPortalSuite').then((module) => ({ default: module.TeacherPayrollView }))
);
const TeacherProfileView = lazy(() =>
    import('@pages/teacher/TeacherPortalSuite').then((module) => ({ default: module.TeacherProfileView }))
);

function AppRoutes() {
    const { establishSession, defaultDashboardPath } = useAuth();
    const navigate = useNavigate();

    const teacherAllowedRoles = [
        SYSTEM_ROLES.TEACHER,
        SYSTEM_ROLES.ADMIN,
        SYSTEM_ROLES.SUPER_ADMIN
    ];

    return (
        <Suspense
            fallback={
                <div className="min-h-screen flex items-center justify-center bg-paper font-bengali text-emerald-deep">
                    পৃষ্ঠা লোড হচ্ছে…
                </div>
            }
        >
        <Routes>
            {/* ১. পাবলিক শিক্ষক নিবন্ধন ও ডিজিটাল আইডি কার্ড */}
            <Route path="/register" element={<PublicRegistrationLedger />} />

            {/* ২. সিকিউর লগইন গেটওয়ে */}
            <Route
                path="/login"
                element={
                    <PublicOnlyRoute>
                        <Login
                            onLoginSuccess={(userObj, jwtToken) => {
                                establishSession(userObj, jwtToken);
                                if (
                                    userObj?.role === SYSTEM_ROLES.SUPER_ADMIN ||
                                    userObj?.role === SYSTEM_ROLES.ADMIN
                                ) {
                                    navigate('/admin/dashboard', { replace: true });
                                } else {
                                    navigate('/teacher/portal', { replace: true });
                                }
                            }}
                            onSwitchToPublicRegistration={() => navigate('/register')}
                        />
                    </PublicOnlyRoute>
                }
            />

            {/* =================================================================
                ADMIN COMMAND CENTER ROUTES (/admin/*)
               ================================================================= */}
            <Route
                path="/admin/dashboard"
                element={
                    <ProtectedRoute allowedRoles={[SYSTEM_ROLES.SUPER_ADMIN, SYSTEM_ROLES.ADMIN]}>
                        <AppShell>
                            <AdminDashboard />
                        </AppShell>
                    </ProtectedRoute>
                }
            />

            <Route
                path="/admin/teachers"
                element={
                    <ProtectedRoute allowedRoles={[SYSTEM_ROLES.SUPER_ADMIN, SYSTEM_ROLES.ADMIN]}>
                        <AppShell>
                            <TeacherDirectory />
                        </AppShell>
                    </ProtectedRoute>
                }
            />

            <Route
                path="/admin/teachers/:id"
                element={
                    <ProtectedRoute allowedRoles={[SYSTEM_ROLES.SUPER_ADMIN, SYSTEM_ROLES.ADMIN]}>
                        <AppShell>
                            <TeacherProfileDossier />
                        </AppShell>
                    </ProtectedRoute>
                }
            />

            <Route
                path="/admin/approvals"
                element={
                    <ProtectedRoute allowedRoles={[SYSTEM_ROLES.SUPER_ADMIN, SYSTEM_ROLES.ADMIN]}>
                        <AppShell>
                            <PendingApprovals />
                        </AppShell>
                    </ProtectedRoute>
                }
            />

            <Route
                path="/admin/attendance"
                element={
                    <ProtectedRoute allowedRoles={[SYSTEM_ROLES.SUPER_ADMIN, SYSTEM_ROLES.ADMIN]}>
                        <AppShell>
                            <AttendanceManagement />
                        </AppShell>
                    </ProtectedRoute>
                }
            />

            <Route
                path="/admin/payroll"
                element={
                    <ProtectedRoute allowedRoles={[SYSTEM_ROLES.SUPER_ADMIN, SYSTEM_ROLES.ADMIN]}>
                        <AppShell>
                            <PayrollManagement />
                        </AppShell>
                    </ProtectedRoute>
                }
            />

            <Route
                path="/admin/settings"
                element={
                    <ProtectedRoute allowedRoles={[SYSTEM_ROLES.SUPER_ADMIN, SYSTEM_ROLES.ADMIN]}>
                        <AppShell>
                            <SystemSettings />
                        </AppShell>
                    </ProtectedRoute>
                }
            />

            {/* =================================================================
                TEACHER SELF-SERVICE PORTAL ROUTES (/teacher/*) — STEP 20
               ================================================================= */}
            <Route
                path="/teacher/portal"
                element={
                    <ProtectedRoute allowedRoles={teacherAllowedRoles}>
                        <AppShell>
                            <TeacherDashboardView />
                        </AppShell>
                    </ProtectedRoute>
                }
            />

            <Route
                path="/teacher/attendance"
                element={
                    <ProtectedRoute allowedRoles={teacherAllowedRoles}>
                        <AppShell>
                            <TeacherAttendanceView />
                        </AppShell>
                    </ProtectedRoute>
                }
            />

            <Route
                path="/teacher/payroll"
                element={
                    <ProtectedRoute allowedRoles={teacherAllowedRoles}>
                        <AppShell>
                            <TeacherPayrollView />
                        </AppShell>
                    </ProtectedRoute>
                }
            />

            <Route
                path="/teacher/profile"
                element={
                    <ProtectedRoute allowedRoles={teacherAllowedRoles}>
                        <AppShell>
                            <TeacherProfileView />
                        </AppShell>
                    </ProtectedRoute>
                }
            />

            {/* ডিফল্ট ফলব্যাক রাউট */}
            <Route path="/teacher/*" element={<Navigate to="/teacher/portal" replace />} />
            <Route path="*" element={<Navigate to={defaultDashboardPath || '/login'} replace />} />
        </Routes>
        </Suspense>
    );
}

export default function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <AppRoutes />
            </AuthProvider>
        </BrowserRouter>
    );
}
