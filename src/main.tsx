import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { ThemeProvider } from "@/providers/theme-provider";
import { AuthProvider } from "@/providers/auth-provider";
import { QueryProvider } from "./providers/query-provider";
import App from "./App";
import "./index.css";

async function prepareDev() {
  const keepDevServiceWorker = import.meta.env.VITE_PWA_DEV_ENABLED === "true";

  if (
    import.meta.env.DEV &&
    !keepDevServiceWorker &&
    "serviceWorker" in navigator
  ) {
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.all(regs.map((r) => r.unregister()));
  }
}

prepareDev().then(() => {
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <BrowserRouter>
        <ThemeProvider>
          <QueryProvider>
            <AuthProvider>
              <App />
            </AuthProvider>
          </QueryProvider>
        </ThemeProvider>
      </BrowserRouter>
    </StrictMode>
  );
});
