import { Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ProtectedRoute from "./components/common/ProtectedRoute";

// ── Worker ──────────────────────────────────────────────────
import WorkerLayout from "./components/worker/WorkerLayout";
import WorkerHomePage from "./pages/worker/WorkerHomePage";
import WorkerTasksPage from "./pages/worker/WorkerTasksPage";
import WorkerMapPage from "./pages/worker/WorkerMapPage";
import WorkerNotificationsPage from "./pages/worker/WorkerNotificationsPage";
import WorkerProfilePage from "./pages/worker/WorkerProfilePage";

// ── Citizen ─────────────────────────────────────────────────
import CitizenLayout from "./components/citizen/CitizenLayout";
import CitizenHomePage from "./pages/citizen/CitizenHomePage";
import CitizenReportPage from "./pages/citizen/CitizenReportPage";
import CitizenComplaintsPage from "./pages/citizen/CitizenComplaintsPage";
import CitizenMapPage from "./pages/citizen/CitizenMapPage";
import CitizenNotificationsPage from "./pages/citizen/CitizenNotificationsPage";
import CitizenProfilePage from "./pages/citizen/CitizenProfilePage";

// ── Admin ────────────────────────────────────────────────────
import AdminLayout from "./components/admin/AdminLayout";
import AdminHomePage from "./pages/admin/AdminHomePage";

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
        <Route path="/admin/home" element={<AdminHomePage />} />
      </Route>

      {/* ── Fallback: redirect unknown routes to login ── */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
