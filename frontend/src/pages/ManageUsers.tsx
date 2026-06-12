import React, { useState, useEffect } from "react";
import { Navigate } from "react-router";
import {
    Plus,
    Edit3,
    Trash2,
    Loader2,
    Key,
    X,
    Shield,
    User,
    UserPlus,
    Mail,
    Check,
} from "lucide-react";
import apiService from "../utils/apiService";
import toaster from "../utils/toaster";
import { motion, AnimatePresence } from "framer-motion";

interface UserItem {
    id: number;
    username: string;
    email: string | null;
    role: string;
    created_at?: string;
    updated_at?: string;
}

const ManageUsers: React.FC = () => {
    const userString = localStorage.getItem("user");
    const currentUser = userString ? JSON.parse(userString) : null;
    const isAdmin = currentUser?.role === "admin";

    // If not admin, block entry
    if (!isAdmin) {
        return <Navigate to="/app" replace />;
    }

    const [users, setUsers] = useState<UserItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Modals State
    const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<"add" | "edit">("add");
    const [activeUser, setActiveUser] = useState<UserItem | null>(null);

    // Form inputs state
    const [usernameInput, setUsernameInput] = useState("");
    const [emailInput, setEmailInput] = useState("");
    const [roleInput, setRoleInput] = useState("user");
    const [passwordInput, setPasswordInput] = useState("");

    // Fetch all users
    const fetchUsers = async () => {
        setLoading(true);
        try {
            const res = await apiService.get("/api/v1/users");
            setUsers(res.data || res);
        } catch (error: any) {
            console.error("Failed to load users:", error);
            toaster("error", "Failed to load users list.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    // Add / Edit Modal handlers
    const openAddEditModal = (mode: "add" | "edit", userItem?: UserItem) => {
        setModalMode(mode);
        setActiveUser(userItem || null);
        if (mode === "edit" && userItem) {
            setUsernameInput(userItem.username);
            setEmailInput(userItem.email || "");
            setRoleInput(userItem.role);
            setPasswordInput(""); // Not used in edit mode
        } else {
            setUsernameInput("");
            setEmailInput("");
            setRoleInput("user");
            setPasswordInput("");
        }
        setIsAddEditModalOpen(true);
    };

    const handleAddEditSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!usernameInput.trim()) {
            toaster("error", "Username cannot be empty");
            return;
        }

        if (modalMode === "add" && (!passwordInput || passwordInput.length < 6)) {
            toaster("error", "Password must be at least 6 characters long");
            return;
        }

        setIsSubmitting(true);
        try {
            if (modalMode === "add") {
                const res = await apiService.post("/api/v1/users/register", {
                    username: usernameInput,
                    password: passwordInput,
                    email: emailInput.trim() || null,
                    role: roleInput,
                });
                toaster("success", "User registered successfully");
                const newUser = res.data?.user || res.user || res;
                // Fetch users again to ensure we get all database defaults / format
                await fetchUsers();
            } else if (modalMode === "edit" && activeUser) {
                const res = await apiService.put(`/api/v1/users/${activeUser.id}`, {
                    username: usernameInput,
                    email: emailInput.trim() || null,
                    role: roleInput,
                });
                toaster("success", "User updated successfully");
                
                // If the updated user is the currently logged in admin, update localStorage
                if (currentUser && currentUser.id === activeUser.id) {
                    const updatedUser = {
                        ...currentUser,
                        username: usernameInput,
                        email: emailInput.trim() || null,
                        role: roleInput,
                    };
                    localStorage.setItem("user", JSON.stringify(updatedUser));
                }

                setUsers((prev) =>
                    prev.map((u) => (u.id === activeUser.id ? { ...u, username: usernameInput, email: emailInput.trim() || null, role: roleInput } : u))
                );
            }
            setIsAddEditModalOpen(false);
            setUsernameInput("");
            setEmailInput("");
            setRoleInput("user");
            setPasswordInput("");
            setActiveUser(null);
        } catch (error: any) {
            toaster("error", error.response?.data?.message || "Operation failed.");
        } finally {
            setIsSubmitting(false);
        }
    };

    // Change Password Modal handlers
    const openPasswordModal = (userItem: UserItem) => {
        setActiveUser(userItem);
        setPasswordInput("");
        setIsPasswordModalOpen(true);
    };

    const handlePasswordSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!passwordInput || passwordInput.length < 6) {
            toaster("error", "Password must be at least 6 characters long");
            return;
        }

        if (!activeUser) return;

        setIsSubmitting(true);
        try {
            await apiService.put(`/api/v1/users/${activeUser.id}/password`, {
                password: passwordInput,
            });
            toaster("success", `Password changed for ${activeUser.username}`);
            setIsPasswordModalOpen(false);
            setPasswordInput("");
            setActiveUser(null);
        } catch (error: any) {
            toaster("error", error.response?.data?.message || "Failed to change password.");
        } finally {
            setIsSubmitting(false);
        }
    };

    // Delete handler
    const handleDeleteUser = async (userItem: UserItem) => {
        if (currentUser && currentUser.id === userItem.id) {
            toaster("error", "You cannot delete your own account.");
            return;
        }

        if (
            !window.confirm(
                `Are you sure you want to delete user "${userItem.username}"? This action cannot be undone.`
            )
        ) {
            return;
        }

        try {
            await apiService.delete(`/api/v1/users/${userItem.id}`);
            toaster("success", `User "${userItem.username}" deleted successfully.`);
            setUsers((prev) => prev.filter((u) => u.id !== userItem.id));
        } catch (error: any) {
            toaster("error", error.response?.data?.message || "Failed to delete user.");
        }
    };

    return (
        <div className="space-y-6">
            {/* Page Summary */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-card/40 border border-border/80 p-6 rounded-2xl backdrop-blur-md">
                <div>
                    <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                        <Shield className="h-5 w-5 text-indigo-500" />
                        <span>User Management</span>
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1">
                        Register, update details, change passwords, and manage system access permissions.
                    </p>
                </div>
                <button
                    onClick={() => openAddEditModal("add")}
                    className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold cursor-pointer transition-all border border-indigo-500 shadow-sm"
                >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Register User</span>
                </button>
            </div>

            {loading ? (
                <div className="flex justify-center items-center py-20">
                    <div className="flex flex-col items-center gap-3">
                        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
                        <span className="text-sm text-muted-foreground font-medium">
                            Retrieving system accounts...
                        </span>
                    </div>
                </div>
            ) : (
                <div className="bg-card border border-border shadow-md rounded-2xl overflow-hidden flex flex-col">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-accent/10 border-b border-border/60">
                                    <th className="p-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Username</th>
                                    <th className="p-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Email Address</th>
                                    <th className="p-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Role</th>
                                    <th className="p-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Registered At</th>
                                    <th className="p-4 text-xs font-bold text-muted-foreground uppercase tracking-wider text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/60">
                                {users.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="p-8 text-center text-sm text-muted-foreground italic">
                                            No user accounts registered.
                                        </td>
                                    </tr>
                                ) : (
                                    users.map((user) => (
                                        <tr key={user.id} className="hover:bg-accent/5 transition-colors">
                                            <td className="p-4">
                                                <div className="flex items-center gap-2.5">
                                                    <div className="h-8 w-8 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                                                        <User className="h-4 w-4" />
                                                    </div>
                                                    <div>
                                                        <span className="text-sm font-semibold text-foreground">
                                                            {user.username}
                                                        </span>
                                                        {currentUser?.id === user.id && (
                                                            <span className="ml-2 text-[9px] bg-indigo-500/10 text-indigo-600 border border-indigo-500/20 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                                                                You
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-4 text-sm text-muted-foreground">
                                                {user.email || <span className="italic opacity-60">Not set</span>}
                                            </td>
                                            <td className="p-4">
                                                <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                                    user.role === "admin"
                                                        ? "bg-rose-500/10 text-rose-600 border border-rose-500/10"
                                                        : "bg-emerald-500/10 text-emerald-600 border border-emerald-500/10"
                                                }`}>
                                                    <Shield className="h-3 w-3" />
                                                    <span className="uppercase tracking-wider">{user.role}</span>
                                                </span>
                                            </td>
                                            <td className="p-4 text-sm text-muted-foreground">
                                                {user.created_at ? new Date(user.created_at).toLocaleDateString(undefined, {
                                                    year: "numeric",
                                                    month: "short",
                                                    day: "numeric",
                                                }) : "N/A"}
                                            </td>
                                            <td className="p-4 text-right">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <button
                                                        onClick={() => openAddEditModal("edit", user)}
                                                        className="p-1.5 text-muted-foreground hover:text-indigo-600 hover:bg-indigo-500/10 rounded-lg cursor-pointer transition-all"
                                                        title="Edit Details"
                                                    >
                                                        <Edit3 className="h-3.5 w-3.5" />
                                                    </button>
                                                    <button
                                                        onClick={() => openPasswordModal(user)}
                                                        className="p-1.5 text-muted-foreground hover:text-amber-600 hover:bg-amber-500/10 rounded-lg cursor-pointer transition-all"
                                                        title="Change Password"
                                                    >
                                                        <Key className="h-3.5 w-3.5" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteUser(user)}
                                                        disabled={currentUser?.id === user.id}
                                                        className={`p-1.5 rounded-lg transition-all ${
                                                            currentUser?.id === user.id
                                                                ? "text-muted-foreground/30 cursor-not-allowed"
                                                                : "text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                                                        }`}
                                                        title={currentUser?.id === user.id ? "Cannot delete yourself" : "Delete Account"}
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ADD/EDIT USER MODAL */}
            <AnimatePresence>
                {isAddEditModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
                            onClick={() => setIsAddEditModalOpen(false)}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 15 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 15 }}
                            className="bg-card border border-border shadow-2xl rounded-xl w-full max-w-md overflow-hidden relative z-10 font-sans p-6"
                        >
                            <div className="flex justify-between items-center border-b pb-3 mb-4">
                                <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                                    <UserPlus className="h-4 w-4 text-indigo-500" />
                                    <span>
                                        {modalMode === "add" ? "Register New User" : "Edit User Account"}
                                    </span>
                                </h3>
                                <button
                                    onClick={() => setIsAddEditModalOpen(false)}
                                    className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                            <form onSubmit={handleAddEditSubmit} className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                                        <User className="h-3 w-3" /> Username
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="Enter username"
                                        value={usernameInput}
                                        onChange={(e) => setUsernameInput(e.target.value)}
                                        className="w-full bg-background/50 border border-input rounded-lg px-3.5 py-2 text-sm text-foreground outline-none focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/10 transition-all"
                                        required
                                        autoFocus={modalMode === "add"}
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                                        <Mail className="h-3 w-3" /> Email Address
                                    </label>
                                    <input
                                        type="email"
                                        placeholder="e.g., user@example.com"
                                        value={emailInput}
                                        onChange={(e) => setEmailInput(e.target.value)}
                                        className="w-full bg-background/50 border border-input rounded-lg px-3.5 py-2 text-sm text-foreground outline-none focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/10 transition-all"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                                        <Shield className="h-3 w-3" /> Access Role
                                    </label>
                                    <select
                                        value={roleInput}
                                        onChange={(e) => setRoleInput(e.target.value)}
                                        className="w-full bg-background/50 border border-input rounded-lg px-3.5 py-2 text-sm text-foreground outline-none focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/10 transition-all"
                                    >
                                        <option value="user">User (Standard Access)</option>
                                        <option value="admin">Admin (Full Access)</option>
                                    </select>
                                </div>

                                {modalMode === "add" && (
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                                            <Key className="h-3 w-3" /> Initial Password
                                        </label>
                                        <input
                                            type="password"
                                            placeholder="Min. 6 characters"
                                            value={passwordInput}
                                            onChange={(e) => setPasswordInput(e.target.value)}
                                            className="w-full bg-background/50 border border-input rounded-lg px-3.5 py-2 text-sm text-foreground outline-none focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/10 transition-all"
                                            required
                                            minLength={6}
                                        />
                                    </div>
                                )}

                                <div className="flex justify-end gap-2.5 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setIsAddEditModalOpen(false)}
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
                                        <span>{modalMode === "add" ? "Register" : "Save Changes"}</span>
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* CHANGE PASSWORD MODAL */}
            <AnimatePresence>
                {isPasswordModalOpen && activeUser && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
                            onClick={() => setIsPasswordModalOpen(false)}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 15 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 15 }}
                            className="bg-card border border-border shadow-2xl rounded-xl w-full max-w-md overflow-hidden relative z-10 font-sans p-6"
                        >
                            <div className="flex justify-between items-center border-b pb-3 mb-4">
                                <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                                    <Key className="h-4 w-4 text-amber-500" />
                                    <span>Change Password</span>
                                </h3>
                                <button
                                    onClick={() => setIsPasswordModalOpen(false)}
                                    className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                            <form onSubmit={handlePasswordSubmit} className="space-y-4">
                                <div className="p-3.5 bg-accent/20 border border-border/40 rounded-xl space-y-1">
                                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Target Account</p>
                                    <p className="text-sm font-bold text-foreground">{activeUser.username}</p>
                                    <p className="text-[10px] text-muted-foreground capitalize font-medium">{activeUser.role} Account</p>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                                        New Password
                                    </label>
                                    <input
                                        type="password"
                                        placeholder="Min. 6 characters"
                                        value={passwordInput}
                                        onChange={(e) => setPasswordInput(e.target.value)}
                                        className="w-full bg-background/50 border border-input rounded-lg px-3.5 py-2 text-sm text-foreground outline-none focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/10 transition-all"
                                        required
                                        minLength={6}
                                        autoFocus
                                    />
                                </div>

                                <div className="flex justify-end gap-2.5 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setIsPasswordModalOpen(false)}
                                        className="px-4 py-2 border border-border rounded-lg text-xs font-semibold text-muted-foreground hover:bg-accent cursor-pointer transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="flex items-center gap-1 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-semibold cursor-pointer transition-all border border-amber-500 shadow-sm"
                                    >
                                        {isSubmitting && (
                                            <Loader2 className="h-3 w-3 animate-spin" />
                                        )}
                                        <span>Update Password</span>
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

export default ManageUsers;
