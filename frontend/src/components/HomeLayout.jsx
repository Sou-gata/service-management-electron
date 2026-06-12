import React, { useState } from "react";
import { useOutlet, useNavigate, useLocation, Link } from "react-router";
import { AnimatePresence, motion } from "framer-motion";
import {
    LayoutDashboard,
    LogOut,
    ChevronLeft,
    ChevronRight,
    UserCircle,
    Menu,
    X,
    Sliders,
    Activity,
    Sun,
    Moon,
    FolderCog,
    ClipboardCheck,
    FileSpreadsheet,
    Users,
    Database,
    Info,
    Building2,
    Send,
    ChevronDown,
} from "lucide-react";
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "./ui/dialog";
import useTheme from "../utils/theme";
import toaster from "../utils/toaster";

const AnimatedOutlet = () => {
    const outlet = useOutlet();
    const location = useLocation();
    return (
        <AnimatePresence mode="wait">
            <motion.div
                key={location.pathname + location.search}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2, ease: "easeInOut" }}
            >
                {outlet}
            </motion.div>
        </AnimatePresence>
    );
};

const HomeLayout = () => {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isMobileOpen, setIsMobileOpen] = useState(false);

    const navigate = useNavigate();
    const location = useLocation();
    const { toggleTheme, isDark } = useTheme();

    const handleLogout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        toaster("success", "Logged out successfully.");
        navigate("/login");
    };

    const userString = localStorage.getItem("user");
    const user = userString ? JSON.parse(userString) : null;

    const navItems = [
        {
            name: "Dashboard",
            path: "/app",
            icon: <LayoutDashboard className="h-5 w-5" />,
        },
        {
            name: "Service Desk",
            icon: <Sliders className="h-5 w-5" />,
            children: [
                {
                    name: "Active Services",
                    path: "/app/services/active",
                    icon: <Sliders className="h-4 w-4" />,
                },
                {
                    name: "In-Progress",
                    path: "/app/services/servicing",
                    icon: <Send className="h-4 w-4" />,
                },
                {
                    name: "Delivered List",
                    path: "/app/services/delivered",
                    icon: <ClipboardCheck className="h-4 w-4" />,
                },
            ],
        },
        ...(user?.role === "admin"
            ? [
                  {
                      name: "Administration",
                      icon: <FolderCog className="h-5 w-5" />,
                      children: [
                          {
                              name: "Companies",
                              path: "/app/companies",
                              icon: <Building2 className="h-4 w-4" />,
                          },
                          {
                              name: "Categories",
                              path: "/app/manage-categories",
                              icon: <FolderCog className="h-4 w-4" />,
                          },
                          {
                              name: "Users",
                              path: "/app/users",
                              icon: <Users className="h-4 w-4" />,
                          },
                          {
                              name: "Backup & Restore",
                              path: "/app/backup",
                              icon: <Database className="h-4 w-4" />,
                          },
                      ],
                  },
              ]
            : []),
        {
            name: "Report",
            path: "/app/reports",
            icon: <FileSpreadsheet className="h-5 w-5" />,
        },
    ];

    const [expandedMenu, setExpandedMenu] = useState(() => {
        let activeName = null;
        navItems.forEach((item) => {
            if (item.children) {
                const hasActiveChild = item.children.some(
                    (child) => location.pathname === child.path
                );
                if (hasActiveChild) {
                    activeName = item.name;
                }
            }
        });
        return activeName;
    });

    const toggleSubmenu = (menuName) => {
        if (isCollapsed) {
            setIsCollapsed(false);
            setExpandedMenu(menuName);
        } else {
            setExpandedMenu((prev) => (prev === menuName ? null : menuName));
        }
    };

    const getPageTitle = () => {
        for (const item of navItems) {
            if (item.path && location.pathname === item.path) {
                return item.name;
            }
            if (item.children) {
                const activeChild = item.children.find(
                    (child) => location.pathname === child.path
                );
                if (activeChild) {
                    return activeChild.name;
                }
            }
        }
        return "Portal";
    };

    return (
        <div className="min-h-screen bg-background text-foreground flex font-sans overflow-hidden transition-colors duration-300">
            {/* BACKGROUND DECORATIONS */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
                <div className="absolute top-[-40%] left-[-20%] w-[80%] h-[80%] rounded-full bg-indigo-500/5 dark:bg-indigo-900/10 blur-[150px]" />
                <div className="absolute bottom-[-40%] right-[-20%] w-[80%] h-[80%] rounded-full bg-emerald-500/5 dark:bg-emerald-900/5 blur-[150px]" />
            </div>

            {/* MOBILE SIDEBAR OVERLAY */}
            {isMobileOpen && (
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
                    onClick={() => setIsMobileOpen(false)}
                />
            )}

            {/* SIDEBAR COMPONENT (DESKTOP & MOBILE) */}
            <aside
                className={`fixed md:sticky top-0 bottom-0 left-0 z-50 flex flex-col bg-card/75 backdrop-blur-xl border-r border-border transition-all duration-300 ${
                    isCollapsed ? "w-16" : "w-64"
                } ${isMobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"} h-screen`}
            >
                {/* Brand / Logo section */}
                <div
                    className={`h-16 flex items-center border-b border-border relative ${
                        isCollapsed
                            ? "justify-center px-2"
                            : "justify-between px-4"
                    }`}
                >
                    <div className="flex items-center gap-3 overflow-hidden">
                        <span className="h-8 w-8 shrink-0 rounded-lg bg-indigo-600 flex items-center justify-center text-white text-xs font-bold shadow-md shadow-indigo-500/20">
                            SM
                        </span>
                        {!isCollapsed && (
                            <span className="font-bold text-sm bg-linear-to-r from-foreground via-foreground/90 to-muted-foreground bg-clip-text text-transparent truncate animate-in fade-in duration-200">
                                Service portal
                            </span>
                        )}
                    </div>

                    {/* Collapse button (Desktop) - Floats absolutely on the border line */}
                    <button
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        className="hidden md:flex h-6 w-6 rounded-full border border-border bg-background text-muted-foreground hover:text-foreground items-center justify-center cursor-pointer transition-all absolute -right-3 top-1/2 -translate-y-1/2 z-50 shadow-sm hover:shadow-md"
                    >
                        {isCollapsed ? (
                            <ChevronRight className="h-3.5 w-3.5" />
                        ) : (
                            <ChevronLeft className="h-3.5 w-3.5" />
                        )}
                    </button>

                    {/* Close button (Mobile) */}
                    <button
                        onClick={() => setIsMobileOpen(false)}
                        className="md:hidden text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Navigation Items */}
                <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
                    {navItems.map((item) => {
                        if (item.children) {
                            const hasActiveChild = item.children.some(
                                (child) => location.pathname === child.path
                            );
                            const isExpanded = expandedMenu === item.name;

                            return (
                                <div key={item.name} className="space-y-1">
                                    {/* Submenu Header */}
                                    <button
                                        onClick={() => toggleSubmenu(item.name)}
                                        className={`w-full flex items-center rounded-lg text-sm font-medium transition-all group cursor-pointer ${
                                            isCollapsed
                                                ? "justify-center px-0 py-2.5"
                                                : "justify-between px-3 py-2.5"
                                        } ${
                                            hasActiveChild
                                                ? "bg-indigo-600/5 text-indigo-600 dark:text-indigo-400 border border-indigo-500/10"
                                                : "text-muted-foreground hover:text-foreground hover:bg-accent/50 border border-transparent"
                                        }`}
                                        title={isCollapsed ? item.name : ""}
                                    >
                                        <div className="flex items-center gap-3.5">
                                            <div
                                                className={`transition-transform duration-200 shrink-0 ${
                                                    hasActiveChild ? "scale-105" : "group-hover:scale-105"
                                                }`}
                                            >
                                                {item.icon}
                                            </div>
                                            {!isCollapsed && (
                                                <span className="truncate animate-in fade-in duration-200">
                                                    {item.name}
                                                </span>
                                            )}
                                        </div>
                                        {!isCollapsed && (
                                            <ChevronDown
                                                className={`h-4 w-4 shrink-0 transition-transform duration-200 ${
                                                    isExpanded ? "rotate-180" : ""
                                                }`}
                                            />
                                        )}
                                    </button>

                                    {/* Submenu Children Accordion */}
                                    <AnimatePresence initial={false}>
                                        {isExpanded && !isCollapsed && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{
                                                    height: "auto",
                                                    opacity: 1,
                                                    transition: {
                                                        height: { duration: 0.2 },
                                                        opacity: { duration: 0.15 }
                                                    }
                                                }}
                                                exit={{
                                                    height: 0,
                                                    opacity: 0,
                                                    transition: {
                                                        height: { duration: 0.2 },
                                                        opacity: { duration: 0.15 }
                                                    }
                                                }}
                                                className="overflow-hidden pl-4 space-y-1"
                                            >
                                                {item.children.map((child) => {
                                                    const isChildActive =
                                                        location.pathname === child.path;
                                                    return (
                                                        <Link
                                                            key={child.name}
                                                            to={child.path}
                                                            onClick={() => setIsMobileOpen(false)}
                                                            className={`flex items-center gap-3 px-3 py-2 text-xs font-medium rounded-lg transition-all group ${
                                                                isChildActive
                                                                    ? "bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 shadow-inner"
                                                                    : "text-muted-foreground hover:text-foreground hover:bg-accent/30 border border-transparent"
                                                            }`}
                                                        >
                                                            <div
                                                                className={`transition-transform duration-200 shrink-0 ${
                                                                    isChildActive
                                                                        ? "scale-105 text-indigo-600 dark:text-indigo-400"
                                                                        : "group-hover:scale-105"
                                                                }`}
                                                            >
                                                                {child.icon}
                                                            </div>
                                                            <span className="truncate animate-in fade-in duration-200">
                                                                {child.name}
                                                            </span>
                                                        </Link>
                                                    );
                                                })}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            );
                        }

                        // Top-level Item
                        const isActive = location.pathname === item.path;
                        return (
                            <Link
                                key={item.name}
                                to={item.path}
                                onClick={() => setIsMobileOpen(false)}
                                className={`flex items-center rounded-lg text-sm font-medium transition-all group ${
                                    isCollapsed
                                        ? "justify-center px-0 py-2.5"
                                        : "justify-start gap-3.5 px-3 py-2.5"
                                } ${
                                    isActive
                                        ? "bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 shadow-inner"
                                        : "text-muted-foreground hover:text-foreground hover:bg-accent/50 border border-transparent"
                                }`}
                                title={isCollapsed ? item.name : ""}
                            >
                                <div
                                    className={`transition-transform duration-200 shrink-0 ${isActive ? "scale-105" : "group-hover:scale-105"}`}
                                >
                                    {item.icon}
                                </div>
                                {!isCollapsed && (
                                    <span className="truncate animate-in fade-in duration-200">
                                        {item.name}
                                    </span>
                                )}
                            </Link>
                        );
                    })}
                </nav>

                {/* User Card / Footer */}
                <div className="p-3 border-t border-border bg-accent/10">
                    {!isCollapsed ? (
                        <div className="flex items-center justify-between p-2 rounded-lg bg-accent/40 border border-border/60 animate-in fade-in duration-200">
                            <div className="flex items-center gap-3">
                                <UserCircle className="h-8 w-8 text-muted-foreground shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-semibold text-foreground truncate">
                                        {user?.username || "Admin User"}
                                    </p>
                                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider truncate">
                                        {user?.role || "Administrator"}
                                    </p>
                                </div>
                            </div>
                            <Dialog>
                                <DialogTrigger asChild>
                                    <button
                                        className="p-1 rounded-md text-muted-foreground hover:text-indigo-500 hover:bg-indigo-500/10 transition-all cursor-pointer focus:outline-hidden"
                                        title="About Service Portal"
                                    >
                                        <Info className="h-5 w-5" />
                                    </button>
                                </DialogTrigger>
                                <DialogContent
                                    showCloseButton={false}
                                    className="sm:max-w-120 p-0 overflow-hidden gap-0 border border-border bg-card/95 backdrop-blur-xl shadow-2xl rounded-2xl"
                                >
                                    {/* Header Banner */}
                                    <div className="relative p-6 text-center bg-linear-to-br from-indigo-600/10 via-purple-600/5 to-transparent border-b border-border/40">
                                        <div className="absolute top-4 right-4 text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
                                            v1.0.0
                                        </div>
                                        <div className="mx-auto h-14 w-14 rounded-2xl bg-linear-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xl font-black shadow-lg shadow-indigo-500/20 mb-3">
                                            SM
                                        </div>
                                        <h3 className="text-xl font-bold tracking-tight text-foreground">
                                            Service Portal
                                        </h3>
                                        <div className="mt-2.5 space-y-0.5">
                                            <p className="text-sm font-bold text-indigo-500 tracking-wide">
                                                RADHA IT SOLUTION & SERVICES
                                            </p>
                                            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
                                                GANGARAMPUR &bull; BARABAZAR
                                                &bull; DAKSHIN DINAJPUR
                                            </p>
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-2 max-w-xs mx-auto">
                                            An enterprise-grade service
                                            management desktop solution built
                                            for productivity.
                                        </p>
                                    </div>

                                    {/* Content Area */}
                                    <div className="px-6 py-3 space-y-5">
                                        {/* Key Features */}
                                        <div className="space-y-2.5">
                                            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                                Core Capabilities
                                            </h4>
                                            <div className="grid grid-cols-2 gap-2 text-xs">
                                                <div className="flex items-center gap-2 p-2 rounded-lg bg-accent/40 border border-border/30 hover:border-indigo-500/30 transition-colors">
                                                    <Sliders className="h-3.5 w-3.5 text-indigo-500" />
                                                    <span className="font-medium">
                                                        Active Registry
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2 p-2 rounded-lg bg-accent/40 border border-border/30 hover:border-indigo-500/30 transition-colors">
                                                    <ClipboardCheck className="h-3.5 w-3.5 text-emerald-500" />
                                                    <span className="font-medium">
                                                        Delivered Registry
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2 p-2 rounded-lg bg-accent/40 border border-border/30 hover:border-indigo-500/30 transition-colors">
                                                    <FileSpreadsheet className="h-3.5 w-3.5 text-amber-500" />
                                                    <span className="font-medium">
                                                        Smart Reporting
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2 p-2 rounded-lg bg-accent/40 border border-border/30 hover:border-indigo-500/30 transition-colors">
                                                    <Database className="h-3.5 w-3.5 text-indigo-500" />
                                                    <span className="font-medium">
                                                        Backups & Restore
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Developer & Version Info */}
                                        <div className="pt-4 border-t border-border/40 grid grid-cols-2 gap-3">
                                            <div className="p-2.5 rounded-xl bg-accent/30 border border-border/30 flex items-center gap-2.5 hover:bg-accent/45 transition-colors">
                                                <div className="h-8 w-8 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center shrink-0">
                                                    <svg
                                                        className="h-4 w-4"
                                                        viewBox="0 0 24 24"
                                                        fill="none"
                                                        stroke="currentColor"
                                                        strokeWidth="2.5"
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                    >
                                                        <path d="m18 16 4-4-4-4" />
                                                        <path d="m6 8-4 4 4 4" />
                                                        <path d="m14.5 4-5 16" />
                                                    </svg>
                                                </div>
                                                <div className="flex flex-col min-w-0">
                                                    <span className="text-[9px] uppercase font-bold tracking-wider text-muted-foreground leading-tight">
                                                        Developer
                                                    </span>
                                                    <span className="text-xs font-bold text-foreground truncate mt-0.5">
                                                        Sougata Talukdar
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="p-2.5 rounded-xl bg-accent/30 border border-border/30 flex items-center gap-2.5 hover:bg-accent/45 transition-colors">
                                                <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                                                    <svg
                                                        className="h-4 w-4"
                                                        viewBox="0 0 24 24"
                                                        fill="none"
                                                        stroke="currentColor"
                                                        strokeWidth="2.5"
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                    >
                                                        <path d="m12 14 4-4" />
                                                        <path d="M3.34 19a10 10 0 1 1 17.32 0" />
                                                    </svg>
                                                </div>
                                                <div className="flex flex-col min-w-0">
                                                    <span className="text-[9px] uppercase font-bold tracking-wider text-muted-foreground leading-tight">
                                                        Version
                                                    </span>
                                                    <span className="text-xs font-bold text-indigo-500 truncate mt-0.5">
                                                        v1.0.0
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex flex-col gap-2 pt-3.5 border-t border-border/40 text-xs">
                                            <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                                                Connect / Contact
                                            </span>
                                            <div className="flex flex-wrap gap-2">
                                                <a
                                                    href="https://github.com/sou-gata"
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent/40 border border-border/30 hover:border-foreground/45 hover:bg-accent/70 transition-all text-muted-foreground hover:text-foreground font-semibold text-[11px]"
                                                >
                                                    <svg
                                                        className="h-3.5 w-3.5"
                                                        viewBox="0 0 24 24"
                                                        fill="none"
                                                        stroke="currentColor"
                                                        strokeWidth="2"
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                    >
                                                        <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
                                                        <path d="M9 18c-4.51 2-5-2-7-2" />
                                                    </svg>
                                                    GitHub
                                                </a>
                                                <a
                                                    href="https://facebook.com/sougata76"
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent/40 border border-border/30 hover:border-blue-500/40 hover:bg-blue-500/5 transition-all text-muted-foreground hover:text-blue-500 font-semibold text-[11px]"
                                                >
                                                    <svg
                                                        className="h-3.5 w-3.5"
                                                        viewBox="0 0 24 24"
                                                        fill="none"
                                                        stroke="currentColor"
                                                        strokeWidth="2"
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                    >
                                                        <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
                                                    </svg>
                                                    Facebook
                                                </a>
                                                <a
                                                    href="mailto:sougatatalukdar@outlook.com"
                                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent/40 border border-border/30 hover:border-red-500/40 hover:bg-red-500/5 transition-all text-muted-foreground hover:text-red-500 font-semibold text-[11px]"
                                                >
                                                    <svg
                                                        className="h-3.5 w-3.5"
                                                        viewBox="0 0 24 24"
                                                        fill="none"
                                                        stroke="currentColor"
                                                        strokeWidth="2"
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                    >
                                                        <rect
                                                            width="20"
                                                            height="16"
                                                            x="2"
                                                            y="4"
                                                            rx="2"
                                                        />
                                                        <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                                                    </svg>
                                                    Email
                                                </a>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Footer */}
                                    <div className="px-6 py-4 bg-accent/20 border-t border-border/40 flex items-center justify-between text-xs text-muted-foreground">
                                        <div className="flex items-center gap-1.5">
                                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 relative flex">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                                            </span>
                                            <span>
                                                Secure Local Environment
                                            </span>
                                        </div>
                                        <div className="font-medium">
                                            &copy; {new Date().getFullYear()}
                                        </div>
                                    </div>
                                </DialogContent>
                            </Dialog>
                        </div>
                    ) : (
                        <div
                            className="flex justify-center py-2"
                            title={user?.username || "Admin"}
                        >
                            <UserCircle className="h-7 w-7 text-muted-foreground" />
                        </div>
                    )}
                </div>
            </aside>

            {/* MAIN LAYOUT WRAPPER */}
            <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden z-10 relative">
                {/* HEADER */}
                <header className="h-16 shrink-0 bg-background/60 backdrop-blur-md border-b border-border px-4 md:px-6 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        {/* Hamburger menu for Mobile */}
                        <button
                            onClick={() => setIsMobileOpen(true)}
                            className="md:hidden p-1.5 rounded-lg bg-card border border-border text-muted-foreground hover:text-foreground cursor-pointer"
                        >
                            <Menu className="h-5 w-5" />
                        </button>
                        <h1 className="text-base md:text-lg font-bold text-foreground tracking-tight">
                            {getPageTitle()}
                        </h1>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Theme Toggle Button */}
                        <button
                            onClick={toggleTheme}
                            className="p-2 rounded-lg border border-border bg-card/60 hover:bg-accent text-muted-foreground hover:text-foreground transition-all cursor-pointer shadow-sm"
                            title={
                                isDark
                                    ? "Switch to Light Mode"
                                    : "Switch to Dark Mode"
                            }
                        >
                            {isDark ? (
                                <Sun className="h-4 w-4 text-yellow-600" />
                            ) : (
                                <Moon className="h-4 w-4 text-blue-600" />
                            )}
                        </button>

                        {/* Log Out Button */}
                        <button
                            onClick={handleLogout}
                            className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-destructive hover:bg-destructive/10 hover:border-destructive/20 border border-border bg-card/60 rounded-lg transition-all cursor-pointer shadow-sm"
                        >
                            <LogOut className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">Log out</span>
                        </button>
                    </div>
                </header>

                <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-accent/5">
                    <AnimatedOutlet />
                </main>
            </div>
        </div>
    );
};

export default HomeLayout;
