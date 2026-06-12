import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { HashRouter } from "react-router";
import { Toaster } from "react-hot-toast";
import AppRouter from "./Router";
import "./index.css";

createRoot(document.getElementById("root")!).render(
    <StrictMode>
        <HashRouter>
            <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
            <AppRouter />
        </HashRouter>
    </StrictMode>
);
