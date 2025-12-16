import { createRoot } from "react-dom/client";
import { SettingsProvider } from "@/contexts/SettingsContext";
import "./index.css";
import App from "./App.tsx";

// Note: StrictMode disabled - it causes WebSocket connection issues
// due to double-mount behavior in development mode.
// This does NOT affect production builds.
createRoot(document.getElementById("root")!).render(
  <SettingsProvider>
    <App />
  </SettingsProvider>
);
