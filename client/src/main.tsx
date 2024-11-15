import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { PrivyProvider } from "@privy-io/react-auth";
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <PrivyProvider appId="cm3ilse1808abchbqh50n3koh">
      <App />
    </PrivyProvider>
  </StrictMode>
);
