import { Routes, Route } from "react-router-dom";
import { LandingPage } from "@/pages/landing";
import { PlaceholderPage } from "@/pages/placeholder";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { LoginPage } from "@/pages/auth/login";
import { RegisterPage } from "@/pages/auth/register";
import { DashboardPage } from "@/pages/dashboard";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { FinancePage } from "@/pages/dashboard/finance";
import { TasksPage } from "@/pages/dashboard/tasks";
import { SettingsPage } from "@/pages/dashboard/settings";

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route
        path="/privacy"
        element={
          <PlaceholderPage
            title="Политика конфиденциальности"
            message="Страница в разработке"
          />
        }
      />
      <Route
        path="/terms"
        element={
          <PlaceholderPage
            title="Условия использования"
            message="Страница в разработке"
          />
        }
      />
      <Route
        path="/dashboard/*"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <Routes>
                <Route index element={<DashboardPage />} />
                <Route path="finance" element={<FinancePage />} />
                <Route path="tasks" element={<TasksPage />} />
                <Route path="settings" element={<SettingsPage />} />
              </Routes>
            </DashboardLayout>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

export default App;
