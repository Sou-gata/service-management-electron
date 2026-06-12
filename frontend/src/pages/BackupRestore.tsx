import React, { useState, useRef } from "react";
import { Navigate } from "react-router";
import {
    Database,
    Download,
    UploadCloud,
    AlertTriangle,
    Loader2,
    File,
    X,
    ShieldAlert,
    CheckCircle2
} from "lucide-react";
import apiService from "../utils/apiService";
import toaster from "../utils/toaster";
import { motion, AnimatePresence } from "framer-motion";

const BackupRestore: React.FC = () => {
    const userString = localStorage.getItem("user");
    const user = userString ? JSON.parse(userString) : null;
    const isAdmin = user?.role === "admin";

    // If not admin, block entry
    if (!isAdmin) {
        return <Navigate to="/app" replace />;
    }

    const [isDownloading, setIsDownloading] = useState(false);
    const [isRestoring, setIsRestoring] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [confirmOverwrite, setConfirmOverwrite] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Download Backup handler
    const handleDownloadBackup = async () => {
        setIsDownloading(true);
        try {
            const dateStr = new Date().toISOString().slice(0, 10);
            await apiService.downloadFile(
                "/api/v1/database/backup",
                `service_management_backup_${dateStr}.db`
            );
            toaster("success", "Database backup downloaded successfully.");
        } catch (error: any) {
            console.error("Backup download failed:", error);
            toaster("error", "Failed to download database backup.");
        } finally {
            setIsDownloading(false);
        }
    };

    // File Selection handler
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];
            // Check file extension
            if (!file.name.endsWith(".db") && !file.name.endsWith(".sqlite")) {
                toaster("error", "Please select a valid SQLite database file (.db or .sqlite)");
                setSelectedFile(null);
                return;
            }
            setSelectedFile(file);
        }
    };

    const triggerFileBrowse = () => {
        fileInputRef.current?.click();
    };

    const clearSelectedFile = () => {
        setSelectedFile(null);
        setConfirmOverwrite(false);
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    // Restore Backup handler
    const handleRestoreBackup = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedFile) {
            toaster("error", "Please select a backup file to restore.");
            return;
        }
        if (!confirmOverwrite) {
            toaster("error", "Please confirm that you understand the data overwrite risk.");
            return;
        }

        setIsRestoring(true);
        try {
            const formData = new FormData();
            formData.append("backup", selectedFile);

            console.log("[Restore] Uploading database backup...");
            await apiService.post("/api/v1/database/restore", formData, {
                headers: {
                    "Content-Type": "multipart/form-data",
                },
            });

            toaster("success", "Database restored successfully! Reloading registry...");
            
            // Wait 2 seconds for the toast to be readable and then perform a clean reload
            setTimeout(() => {
                window.location.reload();
            }, 2000);

        } catch (error: any) {
            console.error("Restore failed:", error);
            toaster(
                "error",
                error.response?.data?.message || "Failed to restore database from backup."
            );
            setIsRestoring(false);
        }
    };

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            {/* Page Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-card/40 border border-border/80 p-6 rounded-2xl backdrop-blur-md">
                <div>
                    <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                        <Database className="h-5 w-5 text-indigo-500" />
                        <span>Database Backup & Restore</span>
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1">
                        Safeguard your records by exporting backups, or restore previous system registries from backup files.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Backup Panel */}
                <div className="bg-card border border-border shadow-md rounded-2xl overflow-hidden flex flex-col p-6 space-y-6">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                            <Download className="h-5 w-5" />
                        </div>
                        <div>
                            <h3 className="font-bold text-foreground text-base">Export Database Backup</h3>
                            <p className="text-xs text-muted-foreground">Save system registries to a local file</p>
                        </div>
                    </div>

                    <p className="text-sm text-muted-foreground leading-relaxed">
                        Exporting a backup will compile all active users, service requests, device categories, accessories, and settings into a single database file. It is recommended to perform regular backups to prevent accidental data loss.
                    </p>

                    <div className="p-4 bg-accent/20 border border-border/40 rounded-xl space-y-2.5">
                        <h4 className="text-xs font-bold text-foreground uppercase tracking-wide">Included in Backup:</h4>
                        <ul className="text-xs text-muted-foreground space-y-1.5 list-disc pl-4">
                            <li>All user accounts, credentials, and roles</li>
                            <li>Active & delivered customer service requests</li>
                            <li>Client history, repair summaries, and pricing</li>
                            <li>Configured device categories & check-list items</li>
                        </ul>
                    </div>

                    <div className="pt-4 flex-1 flex items-end">
                        <button
                            onClick={handleDownloadBackup}
                            disabled={isDownloading}
                            className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold cursor-pointer transition-all border border-indigo-500 shadow-md shadow-indigo-500/10 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isDownloading ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Download className="h-4 w-4" />
                            )}
                            <span>{isDownloading ? "Generating Backup File..." : "Download Database Backup"}</span>
                        </button>
                    </div>
                </div>

                {/* Restore Panel */}
                <div className="bg-card border border-border shadow-md rounded-2xl overflow-hidden flex flex-col p-6 space-y-6">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-600 dark:text-rose-400 shrink-0">
                            <UploadCloud className="h-5 w-5" />
                        </div>
                        <div>
                            <h3 className="font-bold text-foreground text-base">Restore System Registry</h3>
                            <p className="text-xs text-muted-foreground">Import previous system data from a backup</p>
                        </div>
                    </div>

                    <form onSubmit={handleRestoreBackup} className="space-y-6 flex-1 flex flex-col justify-between">
                        <div className="space-y-4">
                            {/* File Upload Dropzone */}
                            {!selectedFile ? (
                                <div
                                    onClick={triggerFileBrowse}
                                    className="border-2 border-dashed border-border hover:border-indigo-500/50 rounded-xl p-8 text-center cursor-pointer transition-all bg-accent/5 hover:bg-accent/10 flex flex-col items-center justify-center gap-3"
                                >
                                    <UploadCloud className="h-8 w-8 text-muted-foreground" />
                                    <div>
                                        <p className="text-sm font-semibold text-foreground">Click to browse backup file</p>
                                        <p className="text-xs text-muted-foreground mt-1">Accepts SQLite database backups (.db, .sqlite)</p>
                                    </div>
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        onChange={handleFileChange}
                                        accept=".db,.sqlite"
                                        className="hidden"
                                    />
                                </div>
                            ) : (
                                <div className="border border-border/80 rounded-xl p-4 bg-accent/10 flex items-center justify-between">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="h-9 w-9 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                                            <File className="h-5 w-5" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-semibold text-foreground truncate">{selectedFile.name}</p>
                                            <p className="text-[10px] text-muted-foreground">
                                                {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={clearSelectedFile}
                                        className="p-1.5 hover:bg-accent rounded-lg text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                </div>
                            )}

                            {/* Warning Box */}
                            {selectedFile && (
                                <motion.div
                                    initial={{ opacity: 0, y: 5 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-start gap-3"
                                >
                                    <AlertTriangle className="h-5 w-5 text-rose-500 shrink-0 mt-0.5" />
                                    <div className="space-y-1">
                                        <h4 className="text-xs font-bold text-rose-500 uppercase tracking-wider">Critical Warning</h4>
                                        <p className="text-xs text-rose-600 dark:text-rose-400 leading-relaxed">
                                            Restoring this file will delete and overwrite your current active database records. Any changes made since the backup was taken will be lost forever.
                                        </p>
                                    </div>
                                </motion.div>
                            )}

                            {/* Confirmation Checkbox */}
                            {selectedFile && (
                                <div className="flex items-start gap-2.5 p-1">
                                    <input
                                        type="checkbox"
                                        id="confirm-checkbox"
                                        checked={confirmOverwrite}
                                        onChange={(e) => setConfirmOverwrite(e.target.checked)}
                                        className="mt-1 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500/20 cursor-pointer"
                                    />
                                    <label htmlFor="confirm-checkbox" className="text-xs text-muted-foreground select-none cursor-pointer leading-normal">
                                        I understand that restoring will overwrite all current database tables and data.
                                    </label>
                                </div>
                            )}
                        </div>

                        <div className="pt-4">
                            <button
                                type="submit"
                                disabled={!selectedFile || !confirmOverwrite || isRestoring}
                                className="w-full flex items-center justify-center gap-2 py-3 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-sm font-semibold cursor-pointer transition-all border border-rose-500 shadow-md shadow-rose-500/10 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isRestoring ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <ShieldAlert className="h-4 w-4" />
                                )}
                                <span>{isRestoring ? "Restoring Database..." : "Restore Database"}</span>
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default BackupRestore;
