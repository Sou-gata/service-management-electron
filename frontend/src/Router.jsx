import React, { useEffect } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router";
import Login from "./pages/Login";
import ProtectedRoute from "./components/ProtectedRoute";
import HomeLayout from "./components/HomeLayout";
import Home from "./pages/Home";
import Services from "./pages/Services";
import Servicing from "./pages/Servicing";
import CompletedServicing from "./pages/CompletedServicing";
import ManageCategories from "./pages/ManageCategories";
import Reports from "./pages/Reports";
import ManageUsers from "./pages/ManageUsers";
import BackupRestore from "./pages/BackupRestore";
import ManageCompanies from "./pages/ManageCompanies";
import { setNavigate } from "./utils/navigationHelper";

// Electron environment: Intercept blob URLs to open via system shell
if (
    typeof window !== "undefined" &&
    window.electronAPI &&
    window.electronAPI.isElectron
) {
    const blobMap = new Map();
    const originalCreateObjectURL = URL.createObjectURL;
    URL.createObjectURL = function (blob) {
        const url = originalCreateObjectURL(blob);
        blobMap.set(url, blob);
        return url;
    };

    const originalRevokeObjectURL = URL.revokeObjectURL;
    URL.revokeObjectURL = function (url) {
        blobMap.delete(url);
        originalRevokeObjectURL(url);
    };

    const originalOpen = window.open;
    window.open = function (url, target, features) {
        if (typeof url === "string" && url.startsWith("blob:")) {
            const handleBlob = (blob) => {
                const reader = new FileReader();
                reader.onloadend = function () {
                    if (typeof reader.result === "string") {
                        const base64Data = reader.result.split(",")[1];
                        const filename = "receipt_report.pdf";
                        window.electronAPI.openPdfBuffer(base64Data, filename);
                    }
                };
                reader.readAsDataURL(blob);
            };

            const cachedBlob = blobMap.get(url);
            if (cachedBlob) {
                handleBlob(cachedBlob);
            } else {
                fetch(url)
                    .then((res) => res.blob())
                    .then((blob) => {
                        handleBlob(blob);
                    })
                    .catch((err) => {
                        console.error("Failed to intercept and open blob PDF via fetch:", err);
                        originalOpen.call(window, url, target, features);
                    });
            }
            return {
                focus: () => {},
                close: () => {},
                onload: null,
            };
        }
        return originalOpen.call(window, url, target, features);
    };
}

const LoginOrRedirect = () => {
    const token = localStorage.getItem("token");
    if (token) {
        return <Navigate to="/app" replace />;
    }
    return <Login />;
};

const AppRouter = () => {
    const navigate = useNavigate();

    useEffect(() => {
        setNavigate(navigate);
    }, [navigate]);

    return (
        <Routes>
            <Route path="/" element={<LoginOrRedirect />} />
            <Route path="/login" element={<Navigate to="/" replace />} />

            <Route element={<ProtectedRoute />}>
                <Route path="/app" element={<HomeLayout />}>
                    <Route index element={<Home />} />
                    <Route
                        path="services/active"
                        element={<Services key="active" />}
                    />
                    <Route path="services/servicing" element={<Servicing />} />
                    <Route path="services/completed" element={<CompletedServicing />} />
                    <Route
                        path="services/delivered"
                        element={<Services key="delivered" />}
                    />
                    <Route
                        path="manage-categories"
                        element={<ManageCategories />}
                    />
                    <Route path="companies" element={<ManageCompanies />} />
                    <Route path="users" element={<ManageUsers />} />
                    <Route path="reports" element={<Reports />} />
                    <Route path="backup" element={<BackupRestore />} />
                </Route>
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
};

export default AppRouter;
