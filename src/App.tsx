import { Routes, Route } from "react-router-dom";
import { LandingPage } from "@/pages/landing";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { LoginPage } from "@/pages/auth/login";
import { RegisterPage } from "@/pages/auth/register";
import { DashboardPage } from "@/pages/dashboard";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { FinancePage } from "@/pages/dashboard/finance";
import { HealthPage } from "@/pages/dashboard/health";
import { TasksPage } from "@/pages/dashboard/tasks";
import { SettingsPage } from "@/pages/dashboard/settings";
import { TermsPage } from "@/pages/legal/terms";
import { PrivacyPage } from "@/pages/legal/privacy";
import { Toaster } from "sonner";
import { useTheme } from "@/providers/theme-provider";
import { SpeedInsights } from "@vercel/speed-insights/react";

function App() {
  const { theme } = useTheme();

  return (
    <>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route
          path="/dashboard/*"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <Routes>
                  <Route index element={<DashboardPage />} />
                  <Route path="finance/*" element={<FinancePage />} />
                  <Route path="health/*" element={<HealthPage />} />
                  <Route path="tasks" element={<TasksPage />} />
                  <Route path="settings" element={<SettingsPage />} />
                </Routes>
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
      </Routes>
      <Toaster
        position="top-center"
        richColors
        theme={theme as "light" | "dark" | "system"}
      />
      <SpeedInsights />
    </>
  );
}

export default App;
