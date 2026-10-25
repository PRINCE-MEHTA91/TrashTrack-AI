import { Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ProtectedRoute from "./components/common/ProtectedRoute";

// ── Worker ──────────────────────────────────────────────────
import WorkerLayout from "./components/worker/WorkerLayout";
import WorkerHomePage from "./pages/worker/WorkerHomePage";
import WorkerTasksPage from "./pages/worker/WorkerTasksPage";
import WorkerComplaintsPage from "./pages/worker/WorkerComplaintsPage";
import WorkerMapPage from "./pages/worker/WorkerMapPage";
import WorkerNotificationsPage from "./pages/worker/WorkerNotificationsPage";
import WorkerProfilePage from "./pages/worker/WorkerProfilePage";

// ── Citizen ─────────────────────────────────────────────────
import CitizenLayout from "./components/citizen/CitizenLayout";
import CitizenHomePage from "./pages/citizen/CitizenHomePage";
import CitizenReportPage from "./pages/citizen/CitizenReportPage";
import CitizenComplaintsPage from "./pages/citizen/CitizenComplaintsPage";
import CitizenCommunityPage from "./pages/citizen/CitizenCommunityPage";
import CitizenMapPage from "./pages/citizen/CitizenMapPage";
import CitizenNotificationsPage from "./pages/citizen/CitizenNotificationsPage";
import CitizenProfilePage from "./pages/citizen/CitizenProfilePage";

// ── Admin ────────────────────────────────────────────────────
import AdminLayout from "./components/admin/AdminLayout";
import AdminHomePage from "./pages/admin/AdminHomePage";
import AdminComplaintsPage from "./pages/admin/AdminComplaintsPage";
import AdminWorkforcePage from "./pages/admin/AdminWorkforcePage";
import AdminMunicipalPage from "./pages/admin/AdminMunicipalPage";
import AdminReportsPage from "./pages/admin/AdminReportsPage";
import AdminSettingsPage from "./pages/admin/AdminSettingsPage";
import AdminNotificationsPage from "./pages/admin/AdminNotificationsPage";

function App() {
  return (
    <Routes>
      {/* ── Public routes ── */}
      <Route path="/" element={<LoginPage />} />
      <Route path="/login" element={<Navigate to="/" replace />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />

      {/* ── Legacy dashboard redirects → new /home routes ── */}
      <Route path="/worker/dashboard" element={<Navigate to="/worker/home" replace />} />
      <Route path="/citizen/dashboard" element={<Navigate to="/citizen/home" replace />} />
      <Route path="/admin/dashboard" element={<Navigate to="/admin/home" replace />} />

      {/* ── Worker routes (role = worker only) ── */}
      <Route
        element={
          <ProtectedRoute allowedRoles={["worker"]}>
            <WorkerLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/worker/home" element={<WorkerHomePage />} />
        <Route path="/worker/tasks" element={<WorkerTasksPage />} />
        <Route path="/worker/complaints" element={<WorkerComplaintsPage />} />
        <Route path="/worker/map" element={<WorkerMapPage />} />
        <Route path="/worker/notifications" element={<WorkerNotificationsPage />} />
        <Route path="/worker/profile" element={<WorkerProfilePage />} />
      </Route>

      {/* ── Citizen routes (role = citizen only) ── */}
      <Route
        element={
          <ProtectedRoute allowedRoles={["citizen"]}>
            <CitizenLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/citizen/home" element={<CitizenHomePage />} />
        <Route path="/citizen/report" element={<CitizenReportPage />} />
        <Route path="/citizen/complaints" element={<CitizenComplaintsPage />} />
        <Route path="/citizen/community" element={<CitizenCommunityPage />} />
        <Route path="/citizen/map" element={<CitizenMapPage />} />
        <Route path="/citizen/notifications" element={<CitizenNotificationsPage />} />
        <Route path="/citizen/profile" element={<CitizenProfilePage />} />
      </Route>

      {/* ── Admin routes (role = admin only) ── */}
      <Route
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/admin/home"       element={<AdminHomePage />} />
        <Route path="/admin/complaints" element={<AdminComplaintsPage />} />
        <Route path="/admin/workforce"  element={<AdminWorkforcePage />} />
        <Route path="/admin/municipal"  element={<AdminMunicipalPage />} />
        <Route path="/admin/reports"       element={<AdminReportsPage />} />
        <Route path="/admin/notifications" element={<AdminNotificationsPage />} />
        <Route path="/admin/settings"      element={<AdminSettingsPage />} />
      </Route>

      {/* ── Fallback: redirect unknown routes to login ── */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
