import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { motion, AnimatePresence } from "framer-motion";
import {
    User,
    Lock,
    Eye,
    EyeOff,
    Loader2,
    KeyRound,
    Sun,
    Moon,
} from "lucide-react";
import apiService from "../utils/apiService";
import toaster from "../utils/toaster";
import useTheme from "../utils/theme";
import { Button } from "../components/ui/button";

const Login: React.FC = () => {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [rememberMe, setRememberMe] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const navigate = useNavigate();
    const { toggleTheme, isDark } = useTheme();

    // Load username if remember me was checked previously
    useEffect(() => {
        const savedUsername = localStorage.getItem("remembered_username");
        if (savedUsername) {
            setUsername(savedUsername);
            setRememberMe(true);
        }
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!username || !password) {
            setErrorMsg("Please fill in all fields.");
            toaster("error", "Username and password are required.");
            return;
        }

        setIsLoading(true);
        setErrorMsg(null);

        try {
            const response = await apiService.post("/api/v1/users/login", {
                username,
                password,
            });

            toaster("success", "Welcome back! Login successful.");

            const token = response.data?.token || response.token;
            const userData = response.data?.user || response.user;

            localStorage.setItem("token", token);
            localStorage.setItem("user", JSON.stringify(userData));

            // Handle remember me
            if (rememberMe) {
                localStorage.setItem("remembered_username", username);
            } else {
                localStorage.removeItem("remembered_username");
            }

            // Navigate to homepage/dashboard
            setTimeout(() => {
                navigate("/app");
            }, 800);
        } catch (error: any) {
            const message =
                error.response?.data?.message ||
                "Invalid username or password.";
            setErrorMsg(message);
            toaster("error", message);
            setIsLoading(false);
        }
    };

    return (
        <div className="relative min-h-screen flex items-center justify-center bg-background text-foreground overflow-hidden font-sans transition-colors duration-300">
            {/* Background Animated Gradients */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-[40%] -left-[20%] w-[80%] h-[80%] rounded-full bg-indigo-500/10 dark:bg-indigo-900/20 blur-[150px] animate-pulse duration-[8000ms]" />
                <div className="absolute -bottom-[40%] -right-[20%] w-[80%] h-[80%] rounded-full bg-emerald-500/5 dark:bg-emerald-900/10 blur-[150px] animate-pulse duration-[10000ms]" />
                <div className="absolute top-[20%] right-[10%] w-[50%] h-[50%] rounded-full bg-violet-500/10 dark:bg-violet-900/15 blur-[120px] animate-pulse duration-[12000ms]" />
            </div>

            {/* Grid Overlay for Modern Technical Aesthetic */}
            <div
                className="absolute inset-0 opacity-5 dark:opacity-5 pointer-events-none"
                style={{
                    backgroundImage: `radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)`,
                    backgroundSize: "24px 24px",
                }}
            />

            {/* Float Theme Toggle Button */}
            <div className="absolute top-6 right-6 z-20">
                <button
                    type="button"
                    onClick={toggleTheme}
                    className="p-2.5 rounded-lg border border-border bg-card/60 hover:bg-accent text-muted-foreground hover:text-foreground transition-all cursor-pointer shadow-sm backdrop-blur-md"
                    title={
                        isDark ? "Switch to Light Mode" : "Switch to Dark Mode"
                    }
                >
                    {isDark ? (
                        <Sun className="h-5 w-5" />
                    ) : (
                        <Moon className="h-5 w-5" />
                    )}
                </button>
            </div>

            {/* Card Wrapper */}
            <motion.div
                initial={{ opacity: 0, y: 30, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="relative z-10 w-full max-w-md p-1 px-6 sm:px-0"
            >
                <div className="bg-card/45 backdrop-blur-xl border border-border rounded-xl shadow-2xl p-8 sm:p-10 relative overflow-hidden group">
                    {/* Card Border Glow Accent */}
                    <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent opacity-70" />

                    {/* Logo / Title Section */}
                    <div className="flex flex-col items-center mb-8 text-center">
                        <div className="h-12 w-12 rounded-lg bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 mb-4 ring-1 ring-white/10">
                            <KeyRound className="h-6 w-6 text-white" />
                        </div>
                        <h2 className="text-2xl font-bold tracking-tight text-foreground mb-1">
                            Welcome back
                        </h2>
                        <p className="text-sm text-muted-foreground">
                            Enter your credentials to access your portal
                        </p>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Error Message */}
                        <AnimatePresence mode="wait">
                            {errorMsg && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: "auto" }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="bg-destructive/10 border border-destructive/20 rounded-md p-3 text-xs text-destructive flex items-start gap-2.5"
                                >
                                    <span className="font-semibold uppercase tracking-wider bg-destructive/20 px-1.5 py-0.5 rounded text-[9px] mt-0.5 shrink-0">
                                        Error
                                    </span>
                                    <span>{errorMsg}</span>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Username Input */}
                        <div className="space-y-1.5">
                            <label
                                htmlFor="username"
                                className="text-xs font-semibold text-muted-foreground tracking-wide uppercase"
                            >
                                Username
                            </label>
                            <div className="relative group/input">
                                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted-foreground group-focus-within/input:text-indigo-500 transition-colors">
                                    <User className="h-4 w-4" />
                                </div>
                                <input
                                    id="username"
                                    type="text"
                                    required
                                    disabled={isLoading}
                                    value={username}
                                    onChange={(e) =>
                                        setUsername(e.target.value)
                                    }
                                    placeholder="Enter your username"
                                    className="w-full bg-background/50 border border-input rounded-lg py-3 pl-10 pr-4 text-sm text-foreground placeholder-muted-foreground outline-none focus:border-indigo-500/60 focus:ring-4 focus:ring-indigo-500/10 hover:border-border transition-all"
                                />
                            </div>
                        </div>

                        {/* Password Input */}
                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                                <label
                                    htmlFor="password"
                                    className="text-xs font-semibold text-muted-foreground tracking-wide uppercase"
                                >
                                    Password
                                </label>
                                <a
                                    href="#forgot"
                                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors"
                                >
                                    Forgot?
                                </a>
                            </div>
                            <div className="relative group/input">
                                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted-foreground group-focus-within/input:text-indigo-500 transition-colors">
                                    <Lock className="h-4 w-4" />
                                </div>
                                <input
                                    id="password"
                                    type={showPassword ? "text" : "password"}
                                    required
                                    disabled={isLoading}
                                    value={password}
                                    onChange={(e) =>
                                        setPassword(e.target.value)
                                    }
                                    placeholder="••••••••"
                                    className="w-full bg-background/50 border border-input rounded-lg py-3 pl-10 pr-10 text-sm text-foreground placeholder-muted-foreground outline-none focus:border-indigo-500/60 focus:ring-4 focus:ring-indigo-500/10 hover:border-border transition-all"
                                />
                                <button
                                    type="button"
                                    onClick={() =>
                                        setShowPassword(!showPassword)
                                    }
                                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    {showPassword ? (
                                        <EyeOff className="h-4 w-4" />
                                    ) : (
                                        <Eye className="h-4 w-4" />
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Remember Me Toggle */}
                        <div className="flex items-center justify-between pt-1">
                            <label className="flex items-center gap-2.5 cursor-pointer group select-none">
                                <div className="relative flex items-center justify-center">
                                    <input
                                        type="checkbox"
                                        checked={rememberMe}
                                        onChange={(e) =>
                                            setRememberMe(e.target.checked)
                                        }
                                        className="sr-only"
                                    />
                                    <div
                                        className={`w-4 h-4 rounded border transition-all flex items-center justify-center ${
                                            rememberMe
                                                ? "bg-indigo-600 border-indigo-500"
                                                : "border-input bg-background/50 group-hover:border-border"
                                        }`}
                                    >
                                        {rememberMe && (
                                            <svg
                                                className="w-2.5 h-2.5 text-white fill-current"
                                                viewBox="0 0 20 20"
                                            >
                                                <path d="M0 11l2-2 5 5L18 3l2 2L7 18z" />
                                            </svg>
                                        )}
                                    </div>
                                </div>
                                <span className="text-xs font-semibold text-muted-foreground group-hover:text-foreground transition-colors">
                                    Remember me
                                </span>
                            </label>
                        </div>

                        {/* Submit Button */}
                        <Button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold py-6 rounded-lg shadow-lg shadow-indigo-500/20 active:translate-y-px disabled:pointer-events-none disabled:opacity-50 transition-all duration-200 mt-2 flex items-center justify-center gap-2 border-0"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin text-white" />
                                    <span>Signing in...</span>
                                </>
                            ) : (
                                <span>Sign in</span>
                            )}
                        </Button>
                    </form>
                </div>

                {/* Footer */}
                <div className="mt-8 text-center text-xs text-muted-foreground">
                    <p>
                        © {new Date().getFullYear()} Service Management. All
                        rights reserved.
                    </p>
                </div>
            </motion.div>
        </div>
    );
};

export default Login;
