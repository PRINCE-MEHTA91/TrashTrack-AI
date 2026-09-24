import { Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ProtectedRoute from "./components/common/ProtectedRoute";
import WorkerLayout from "./components/worker/WorkerLayout";
import WorkerHomePage from "./pages/worker/WorkerHomePage";
import WorkerTasksPage from "./pages/worker/WorkerTasksPage";
import WorkerMapPage from "./pages/worker/WorkerMapPage";
import WorkerNotificationsPage from "./pages/worker/WorkerNotificationsPage";
import WorkerProfilePage from "./pages/worker/WorkerProfilePage";

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

      {/* ── Worker routes (role = worker) ── */}
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

      {/* ── Citizen routes (placeholder — to be implemented) ── */}
      {/* <Route element={<ProtectedRoute allowedRoles={["citizen"]}><CitizenLayout /></ProtectedRoute>}> */}
      {/*   <Route path="/citizen/home" element={<CitizenHomePage />} /> */}
      {/* </Route> */}

      {/* ── Admin routes (placeholder — to be implemented) ── */}
      {/* <Route element={<ProtectedRoute allowedRoles={["admin"]}><AdminLayout /></ProtectedRoute>}> */}
      {/*   <Route path="/admin/home" element={<AdminHomePage />} /> */}
      {/* </Route> */}

      {/* ── Fallback ── */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;

