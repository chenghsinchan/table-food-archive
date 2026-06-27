import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { seedIfEmpty } from "@/lib/seed";
import "./index.css";

// Populate a fresh archive with sample data on first run.
seedIfEmpty();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
