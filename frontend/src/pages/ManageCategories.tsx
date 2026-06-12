import React, { useState, useEffect } from "react";
import { Navigate } from "react-router";
import {
    Plus,
    Edit3,
    Trash2,
    Loader2,
    Layers,
    Sliders,
    Tag,
    X,
} from "lucide-react";
import apiService from "../utils/apiService";
import toaster from "../utils/toaster";
import { motion, AnimatePresence } from "framer-motion";

interface ConfigItem {
    id: number;
    name: string;
    created_at?: string;
}

const ManageCategories: React.FC = () => {
    const userString = localStorage.getItem("user");
    const user = userString ? JSON.parse(userString) : null;
    const isAdmin = user?.role === "admin";

    // If not admin, block entry
    if (!isAdmin) {
        return <Navigate to="/app" replace />;
    }

    // Config Lists State
    const [deviceTypes, setDeviceTypes] = useState<ConfigItem[]>([]);
    const [accessories, setAccessories] = useState<ConfigItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Modals & Inputs State
    const [isTypeModalOpen, setIsTypeModalOpen] = useState(false);
    const [isAccModalOpen, setIsAccModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<"add" | "edit">("add");
    const [activeItem, setActiveItem] = useState<ConfigItem | null>(null);
    const [inputName, setInputName] = useState("");

    // Fetch config options
    const fetchConfigs = async () => {
        setLoading(true);
        try {
            const [typesRes, accRes] = await Promise.all([
                apiService.get("/api/v1/config/device-types"),
                apiService.get("/api/v1/config/accessories"),
            ]);
            setDeviceTypes(typesRes.data || typesRes);
            setAccessories(accRes.data || accRes);
        } catch (error: any) {
            console.error("Failed to load configs:", error);
            toaster("error", "Failed to load device types and accessories.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchConfigs();
    }, []);

    // Device Type CRUD Handlers
    const openTypeModal = (mode: "add" | "edit", item?: ConfigItem) => {
        setModalMode(mode);
        setActiveItem(item || null);
        setInputName(item ? item.name : "");
        setIsTypeModalOpen(true);
    };

    const handleTypeSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputName.trim()) {
            toaster("error", "Name cannot be empty");
            return;
        }
        setIsSubmitting(true);
        try {
            if (modalMode === "add") {
                const res = await apiService.post(
                    "/api/v1/config/device-types",
                    { name: inputName }
                );
                toaster("success", "Device type added successfully");
                setDeviceTypes((prev) =>
                    [...prev, res.data || res].sort((a, b) =>
                        a.name.localeCompare(b.name)
                    )
                );
            } else if (modalMode === "edit" && activeItem) {
                const res = await apiService.put(
                    `/api/v1/config/device-types/${activeItem.id}`,
                    { name: inputName }
                );
                toaster("success", "Device type updated successfully");
                setDeviceTypes((prev) =>
                    prev
                        .map((item) =>
                            item.id === activeItem.id ? res.data || res : item
                        )
                        .sort((a, b) => a.name.localeCompare(b.name))
                );
            }
            setIsTypeModalOpen(false);
            setInputName("");
            setActiveItem(null);
        } catch (error: any) {
            toaster(
                "error",
                error.response?.data?.message || "Operation failed."
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleTypeDelete = async (id: number, name: string) => {
        if (
            !window.confirm(
                `Are you sure you want to delete device type "${name}"? Any registers currently holding this value will show raw text.`
            )
        ) {
            return;
        }
        try {
            await apiService.delete(`/api/v1/config/device-types/${id}`);
            toaster("success", `Device type "${name}" deleted.`);
            setDeviceTypes((prev) => prev.filter((item) => item.id !== id));
        } catch (error: any) {
            toaster(
                "error",
                error.response?.data?.message || "Failed to delete device type."
            );
        }
    };

    // Accessory CRUD Handlers
    const openAccModal = (mode: "add" | "edit", item?: ConfigItem) => {
        setModalMode(mode);
        setActiveItem(item || null);
        setInputName(item ? item.name : "");
        setIsAccModalOpen(true);
    };

    const handleAccSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputName.trim()) {
            toaster("error", "Name cannot be empty");
            return;
        }
        setIsSubmitting(true);
        try {
            if (modalMode === "add") {
                const res = await apiService.post(
                    "/api/v1/config/accessories",
                    { name: inputName }
                );
                toaster("success", "Accessory added successfully");
                setAccessories((prev) =>
                    [...prev, res.data || res].sort((a, b) =>
                        a.name.localeCompare(b.name)
                    )
                );
            } else if (modalMode === "edit" && activeItem) {
                const res = await apiService.put(
                    `/api/v1/config/accessories/${activeItem.id}`,
                    { name: inputName }
                );
                toaster("success", "Accessory updated successfully");
                setAccessories((prev) =>
                    prev
                        .map((item) =>
                            item.id === activeItem.id ? res.data || res : item
                        )
                        .sort((a, b) => a.name.localeCompare(b.name))
                );
            }
            setIsAccModalOpen(false);
            setInputName("");
            setActiveItem(null);
        } catch (error: any) {
            toaster(
                "error",
                error.response?.data?.message || "Operation failed."
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleAccDelete = async (id: number, name: string) => {
        if (
            !window.confirm(
                `Are you sure you want to delete accessory "${name}"?`
            )
        ) {
            return;
        }
        try {
            await apiService.delete(`/api/v1/config/accessories/${id}`);
            toaster("success", `Accessory "${name}" deleted.`);
            setAccessories((prev) => prev.filter((item) => item.id !== id));
        } catch (error: any) {
            toaster(
                "error",
                error.response?.data?.message || "Failed to delete accessory."
            );
        }
    };

    return (
        <div className="space-y-6">
            {/* Page Summary */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-card/40 border border-border/80 p-6 rounded-2xl backdrop-blur-md">
                <div>
                    <h2 className="text-xl font-bold text-foreground">
                        Category & Checklist Management
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1">
                        Administer the dynamic dropdown menus and accessory
                        checklist items stored in the system database.
                    </p>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center items-center py-20">
                    <div className="flex flex-col items-center gap-3">
                        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
                        <span className="text-sm text-muted-foreground font-medium">
                            Fetching database registries...
                        </span>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* 1. Device Types Panel */}
                    <div className="bg-card border border-border shadow-md rounded-2xl overflow-hidden flex flex-col min-h-120">
                        <div className="p-5 border-b border-border bg-accent/5 flex justify-between items-center">
                            <div className="flex items-center gap-2.5">
                                <div className="h-8 w-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                                    <Sliders className="h-4 w-4" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-foreground text-sm">
                                        Device Categories
                                    </h3>
                                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                                        {deviceTypes.length} configured types
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => openTypeModal("add")}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold cursor-pointer transition-all border border-indigo-500 shadow-sm"
                            >
                                <Plus className="h-3.5 w-3.5" />
                                <span>Add Category</span>
                            </button>
                        </div>
                        <div className="flex-1 p-5 overflow-y-auto max-h-140 divide-y divide-border">
                            {deviceTypes.length === 0 ? (
                                <p className="text-center text-xs text-muted-foreground italic py-10">
                                    No categories defined.
                                </p>
                            ) : (
                                deviceTypes.map((type) => (
                                    <div
                                        key={type.id}
                                        className="flex justify-between items-center py-3 first:pt-0 last:pb-0 group"
                                    >
                                        <div className="flex items-center gap-2">
                                            <span className="h-2 w-2 rounded-full bg-indigo-500" />
                                            <span className="text-sm text-foreground font-medium">
                                                {type.name}
                                            </span>
                                            {type.name === "Other" && (
                                                <span className="text-[9px] bg-accent border px-1.5 py-0.5 rounded text-muted-foreground font-bold">
                                                    System Locked
                                                </span>
                                            )}
                                        </div>
                                        {type.name !== "Other" && (
                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() =>
                                                        openTypeModal(
                                                            "edit",
                                                            type
                                                        )
                                                    }
                                                    className="p-1.5 text-muted-foreground hover:text-indigo-500 hover:bg-indigo-500/10 rounded-lg cursor-pointer transition-all"
                                                    title="Edit Category"
                                                >
                                                    <Edit3 className="h-3.5 w-3.5" />
                                                </button>
                                                <button
                                                    onClick={() =>
                                                        handleTypeDelete(
                                                            type.id,
                                                            type.name
                                                        )
                                                    }
                                                    className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg cursor-pointer transition-all"
                                                    title="Delete Category"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* 2. Accessories Panel */}
                    <div className="bg-card border border-border shadow-md rounded-2xl overflow-hidden flex flex-col min-h-120">
                        <div className="p-5 border-b border-border bg-accent/5 flex justify-between items-center">
                            <div className="flex items-center gap-2.5">
                                <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                                    <Layers className="h-4 w-4" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-foreground text-sm">
                                        Common Accessories Checklist
                                    </h3>
                                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                                        {accessories.length} options defined
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => openAccModal("add")}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold cursor-pointer transition-all border border-emerald-500 shadow-sm"
                            >
                                <Plus className="h-3.5 w-3.5" />
                                <span>Add Accessory</span>
                            </button>
                        </div>
                        <div className="flex-1 p-5 overflow-y-auto max-h-140 divide-y divide-border">
                            {accessories.length === 0 ? (
                                <p className="text-center text-xs text-muted-foreground italic py-10">
                                    No accessories defined.
                                </p>
                            ) : (
                                accessories.map((acc) => (
                                    <div
                                        key={acc.id}
                                        className="flex justify-between items-center py-3 first:pt-0 last:pb-0 group"
                                    >
                                        <div className="flex items-center gap-2">
                                            <span className="h-2 w-2 rounded-full bg-emerald-500" />
                                            <span className="text-sm text-foreground font-medium">
                                                {acc.name}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() =>
                                                    openAccModal("edit", acc)
                                                }
                                                className="p-1.5 text-muted-foreground hover:text-emerald-600 hover:bg-emerald-500/10 rounded-lg cursor-pointer transition-all"
                                                title="Edit Accessory"
                                            >
                                                <Edit3 className="h-3.5 w-3.5" />
                                            </button>
                                            <button
                                                onClick={() =>
                                                    handleAccDelete(
                                                        acc.id,
                                                        acc.name
                                                    )
                                                }
                                                className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg cursor-pointer transition-all"
                                                title="Delete Accessory"
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* DEVICE TYPE MODAL */}
            <AnimatePresence>
                {isTypeModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
                            onClick={() => setIsTypeModalOpen(false)}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 15 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 15 }}
                            className="bg-card border border-border shadow-2xl rounded-xl w-full max-w-md overflow-hidden relative z-10 font-sans p-6"
                        >
                            <div className="flex justify-between items-center border-b pb-3 mb-4">
                                <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                                    <Tag className="h-4 w-4 text-indigo-500" />
                                    <span>
                                        {modalMode === "add"
                                            ? "Add New Category"
                                            : "Edit Category"}
                                    </span>
                                </h3>
                                <button
                                    onClick={() => setIsTypeModalOpen(false)}
                                    className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                            <form
                                onSubmit={handleTypeSubmit}
                                className="space-y-4"
                            >
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                                        Category Name
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="e.g., Server, Monitor"
                                        value={inputName}
                                        onChange={(e) =>
                                            setInputName(e.target.value)
                                        }
                                        className="w-full bg-background/50 border border-input rounded-lg px-3.5 py-2 text-sm text-foreground outline-none focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/10 transition-all"
                                        autoFocus
                                    />
                                </div>
                                <div className="flex justify-end gap-2.5 pt-2">
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setIsTypeModalOpen(false)
                                        }
                                        className="px-4 py-2 border border-border rounded-lg text-xs font-semibold text-muted-foreground hover:bg-accent cursor-pointer transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="flex items-center gap-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold cursor-pointer transition-all border border-indigo-500 shadow-sm"
                                    >
                                        {isSubmitting && (
                                            <Loader2 className="h-3 w-3 animate-spin" />
                                        )}
                                        <span>Save</span>
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* ACCESSORY MODAL */}
            <AnimatePresence>
                {isAccModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
                            onClick={() => setIsAccModalOpen(false)}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 15 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 15 }}
                            className="bg-card border border-border shadow-2xl rounded-xl w-full max-w-md overflow-hidden relative z-10 font-sans p-6"
                        >
                            <div className="flex justify-between items-center border-b pb-3 mb-4">
                                <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                                    <Tag className="h-4 w-4 text-emerald-500" />
                                    <span>
                                        {modalMode === "add"
                                            ? "Add New Accessory"
                                            : "Edit Accessory"}
                                    </span>
                                </h3>
                                <button
                                    onClick={() => setIsAccModalOpen(false)}
                                    className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                            <form
                                onSubmit={handleAccSubmit}
                                className="space-y-4"
                            >
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                                        Accessory Name
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="e.g., Stylus, USB Hub"
                                        value={inputName}
                                        onChange={(e) =>
                                            setInputName(e.target.value)
                                        }
                                        className="w-full bg-background/50 border border-input rounded-lg px-3.5 py-2 text-sm text-foreground outline-none focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/10 transition-all"
                                        autoFocus
                                    />
                                </div>
                                <div className="flex justify-end gap-2.5 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setIsAccModalOpen(false)}
                                        className="px-4 py-2 border border-border rounded-lg text-xs font-semibold text-muted-foreground hover:bg-accent cursor-pointer transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="flex items-center gap-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold cursor-pointer transition-all border border-emerald-500 shadow-sm"
                                    >
                                        {isSubmitting && (
                                            <Loader2 className="h-3 w-3 animate-spin" />
                                        )}
                                        <span>Save</span>
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default ManageCategories;
