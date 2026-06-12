import React, { useEffect } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router";
import Login from "./pages/Login";
import ProtectedRoute from "./components/ProtectedRoute";
import HomeLayout from "./components/HomeLayout";
import Home from "./pages/Home";
import Services from "./pages/Services";
import Servicing from "./pages/Servicing";
import ManageCategories from "./pages/ManageCategories";
import Reports from "./pages/Reports";
import ManageUsers from "./pages/ManageUsers";
import BackupRestore from "./pages/BackupRestore";
import ManageCompanies from "./pages/ManageCompanies";
import { setNavigate } from "./utils/navigationHelper";



// Simple stub components for other layout sub-routes (placeholder views user can fill)
const ServicesPlaceholder = () => (
    <div className="bg-card/45 border border-border p-8 rounded-lg text-center">
        <h2 className="text-xl font-bold text-foreground mb-2">
            Services Portal
        </h2>
        <p className="text-sm text-muted-foreground">
            Configure and manage active network services here.
        </p>
    </div>
);



const LogsPlaceholder = () => (
    <div className="bg-card/45 border border-border p-8 rounded-lg text-center">
        <h2 className="text-xl font-bold text-foreground mb-2">
            System Audit Logs
        </h2>
        <p className="text-sm text-muted-foreground">
            View real-time event logs, system warnings, and database operations.
        </p>
    </div>
);



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
                    <Route path="services/active" element={<Services key="active" />} />
                    <Route path="services/servicing" element={<Servicing />} />
                    <Route path="services/delivered" element={<Services key="delivered" />} />
                    <Route path="manage-categories" element={<ManageCategories />} />
                    <Route path="companies" element={<ManageCompanies />} />
                    <Route path="users" element={<ManageUsers />} />
                    <Route path="reports" element={<Reports />} />
                    <Route path="backup" element={<BackupRestore />} />
                    <Route path="logs" element={<LogsPlaceholder />} />
                </Route>
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
};

export default AppRouter;
