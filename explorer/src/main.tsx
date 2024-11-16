import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import SolvNetDashboard from "./App.tsx";
import "./index.css";
import.meta.env;

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <SolvNetDashboard />
  </StrictMode>
);
