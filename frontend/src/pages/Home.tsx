import React, { useState, useEffect } from "react";
import { Link } from "react-router";
import {
    Plus,
    ArrowRight,
    Laptop,
    CheckCircle,
    Package,
    Clock,
    Wrench,
    FileText,
    TrendingUp,
    Cpu,
    Coins,
} from "lucide-react";
import {
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    PieChart,
    Pie,
    Cell,
} from "recharts";
import apiService from "../utils/apiService";
import toaster from "../utils/toaster";
import { motion, AnimatePresence } from "framer-motion";

interface DeviceTypeStat {
    device_type: string;
    count: number;
}

interface DashboardStats {
    total: number;
    received: number;
    servicing: number;
    completed: number;
    delivered: number;
    totalRevenue?: number;
    totalLabor?: number;
    totalParts?: number;
    solvedCount?: number;
    unsolvedCount?: number;
    deviceTypeStats?: DeviceTypeStat[];
}

interface RecentRequest {
    id: number;
    customer_name: string;
    customer_mobile: string;
    device_type: string;
    brand_model: string;
    status: string;
    created_at: string;
}

const COLORS: string[] = [
    "#6366f1",
    "#10b981",
    "#8b5cf6",
    "#3b82f6",
    "#f59e0b",
    "#71717a",
];

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-card/95 border border-border p-3 rounded-lg shadow-xl backdrop-blur-md">
                <p className="text-xs font-bold text-foreground mb-1">
                    {label || payload[0].name}
                </p>
                <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                    Count: {payload[0].value}
                </p>
            </div>
        );
    }
    return null;
};

const Home: React.FC = () => {
    const [range, setRange] = useState<string>("all");
    const [stats, setStats] = useState<DashboardStats>({
        total: 0,
        received: 0,
        servicing: 0,
        completed: 0,
        delivered: 0,
        totalRevenue: 0,
        totalLabor: 0,
        totalParts: 0,
        solvedCount: 0,
        unsolvedCount: 0,
        deviceTypeStats: [],
    });
    const [recentRequests, setRecentRequests] = useState<RecentRequest[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDashboardData = async () => {
            setLoading(true);
            try {
                // Fetch stats with range
                const statsResponse = await apiService.get(
                    "/api/v1/service-requests/stats",
                    {
                        params: { range },
                    }
                );
                setStats(statsResponse.data || statsResponse);

                // Fetch recent requests (limit 5)
                const requestsResponse = await apiService.get(
                    "/api/v1/service-requests",
                    {
                        params: {
                            page: 1,
                            limit: 5,
                            sortBy: "created_at",
                            sortOrder: "desc",
                        },
                    }
                );
                const resData = requestsResponse.data || requestsResponse;
                setRecentRequests(resData.serviceRequests || []);
            } catch (error: any) {
                console.error("Failed to load dashboard data:", error);
                toaster("error", "Error loading dashboard metrics.");
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, [range]);

    const getStatusStyle = (status: string) => {
        switch (status) {
            case "Received":
                return "bg-blue-500/10 text-blue-500 border border-blue-500/20";
            case "Servicing":
                return "bg-cyan-500/10 text-cyan-500 border border-cyan-500/20";
            case "Completed":
                return "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20";
            case "Delivered":
                return "bg-zinc-500/10 text-zinc-500 border border-zinc-500/20";
            default:
                return "bg-gray-500/10 text-gray-500 border border-gray-500/20";
        }
    };

    const statCards = [
        {
            title: "Total Intakes",
            value: stats.total,
            description: "Overall registered entries",
            icon: <Laptop className="h-5 w-5 text-indigo-500" />,
            gradient:
                "from-indigo-500/5 to-violet-500/5 border-indigo-500/10 dark:from-indigo-500/10 dark:to-violet-500/10",
            textColor: "text-indigo-600 dark:text-indigo-400",
        },
        {
            title: "New Intake",
            value: stats.received,
            description: "Awaiting inspection",
            icon: <Clock className="h-5 w-5 text-blue-500" />,
            gradient:
                "from-blue-500/5 to-cyan-500/5 border-blue-500/10 dark:from-blue-500/10 dark:to-cyan-500/10",
            textColor: "text-blue-600 dark:text-blue-400",
        },
        {
            title: "In Servicing",
            value: stats.servicing,
            description: "Active/external service",
            icon: <Wrench className="h-5 w-5 text-cyan-500" />,
            gradient:
                "from-cyan-500/5 to-sky-500/5 border-cyan-500/10 dark:from-cyan-500/10 dark:to-sky-500/10",
            textColor: "text-cyan-600 dark:text-cyan-400",
        },
        {
            title: "Completed",
            value: stats.completed,
            description: "Ready for client pickup",
            icon: <CheckCircle className="h-5 w-5 text-emerald-500" />,
            gradient:
                "from-emerald-500/5 to-teal-500/5 border-emerald-500/10 dark:from-emerald-500/10 dark:to-teal-500/10",
            textColor: "text-emerald-600 dark:text-emerald-400",
        },
        {
            title: "Delivered",
            value: stats.delivered,
            description: "Closed cases",
            icon: <Package className="h-5 w-5 text-zinc-500" />,
            gradient:
                "from-zinc-500/5 to-neutral-500/5 border-zinc-500/10 dark:from-zinc-500/10 dark:to-neutral-500/10",
            textColor: "text-zinc-600 dark:text-zinc-400",
        },
    ];

    return (
        <div className="space-y-6">
            {/* Dashboard Header & Range Selector */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-border/40">
                <div>
                    <h1 className="text-xl font-bold tracking-tight text-foreground">
                        Service Center Dashboard
                    </h1>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                        Overview of service requests, financial metrics, and
                        performance.
                    </p>
                </div>
                <div className="flex items-center gap-1 p-1 bg-card/60 border border-border rounded-xl backdrop-blur-md self-start md:self-auto shadow-sm">
                    {[
                        { id: "all", label: "All Time" },
                        { id: "today", label: "Today" },
                        { id: "7days", label: "Last 7 Days" },
                        { id: "30days", label: "Last 30 Days" },
                    ].map((item) => (
                        <button
                            key={item.id}
                            onClick={() => setRange(item.id)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                range === item.id
                                    ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/10"
                                    : "text-muted-foreground hover:text-foreground hover:bg-accent/40"
                            }`}
                        >
                            {item.label}
                        </button>
                    ))}
                </div>
            </div>

            <AnimatePresence mode="wait">
                <motion.div
                    key={range}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2, ease: "easeInOut" }}
                    className="space-y-6"
                >
                    {/* Financial Summary */}
                    <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3 }}
                            className="bg-card/40 border border-border/80 rounded-xl p-5 flex items-center justify-between backdrop-blur-sm shadow-sm relative overflow-hidden"
                        >
                            <div className="absolute top-0 left-0 bottom-0 w-1 bg-emerald-500" />
                            <div className="space-y-1 pl-2">
                                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                                    Total Service Charge Revenue
                                </span>
                                {loading ? (
                                    <div className="h-8 w-24 bg-muted/65 animate-pulse rounded my-1" />
                                ) : (
                                    <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                                        ₹
                                        {(
                                            stats.totalRevenue || 0
                                        ).toLocaleString("en-IN", {
                                            minimumFractionDigits: 2,
                                        })}
                                    </p>
                                )}
                                <span className="text-[10px] text-muted-foreground block leading-tight">
                                    Total billed labor fees and parts cost
                                </span>
                            </div>
                            <div className="h-12 w-12 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20 shadow-inner shrink-0">
                                <TrendingUp className="h-6 w-6" />
                            </div>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3, delay: 0.1 }}
                            className="bg-card/40 border border-border/80 rounded-xl p-5 flex items-center justify-between backdrop-blur-sm shadow-sm relative overflow-hidden"
                        >
                            <div className="absolute top-0 left-0 bottom-0 w-1 bg-indigo-500" />
                            <div className="space-y-1 pl-2">
                                <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                                    Labor Fees Collected
                                </span>
                                {loading ? (
                                    <div className="h-8 w-24 bg-muted/65 animate-pulse rounded my-1" />
                                ) : (
                                    <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400">
                                        ₹
                                        {(stats.totalLabor || 0).toLocaleString(
                                            "en-IN",
                                            { minimumFractionDigits: 2 }
                                        )}
                                    </p>
                                )}
                                <span className="text-[10px] text-muted-foreground block leading-tight">
                                    Total charges collected for repair labor
                                </span>
                            </div>
                            <div className="h-12 w-12 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-500/20 shadow-inner shrink-0">
                                <Coins className="h-6 w-6" />
                            </div>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3, delay: 0.2 }}
                            className="bg-card/40 border border-border/80 rounded-xl p-5 flex items-center justify-between backdrop-blur-sm shadow-sm relative overflow-hidden"
                        >
                            <div className="absolute top-0 left-0 bottom-0 w-1 bg-purple-500" />
                            <div className="space-y-1 pl-2">
                                <span className="text-xs font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider">
                                    Replacement Parts Value
                                </span>
                                {loading ? (
                                    <div className="h-8 w-24 bg-muted/65 animate-pulse rounded my-1" />
                                ) : (
                                    <p className="text-2xl font-black text-purple-600 dark:text-purple-400">
                                        ₹
                                        {(stats.totalParts || 0).toLocaleString(
                                            "en-IN",
                                            { minimumFractionDigits: 2 }
                                        )}
                                    </p>
                                )}
                                <span className="text-[10px] text-muted-foreground block leading-tight">
                                    Total cost of hardware parts replaced
                                </span>
                            </div>
                            <div className="h-12 w-12 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center border border-purple-500/20 shadow-inner shrink-0">
                                <Cpu className="h-6 w-6" />
                            </div>
                        </motion.div>
                    </section>

                    {/* Analytics grid widgets */}
                    <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                        {statCards.map((card, index) => (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{
                                    duration: 0.3,
                                    delay: index * 0.05,
                                }}
                                className={`bg-card/40 border rounded-xl p-4 flex flex-col justify-between backdrop-blur-sm ${card.gradient}`}
                            >
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                                        {card.title}
                                    </span>
                                    {card.icon}
                                </div>
                                <div>
                                    {loading ? (
                                        <div className="h-8 w-12 bg-muted/65 animate-pulse rounded my-1" />
                                    ) : (
                                        <p
                                            className={`text-2xl font-black ${card.textColor}`}
                                        >
                                            {card.value}
                                        </p>
                                    )}
                                    <span className="text-[10px] text-muted-foreground/85 block leading-tight mt-1">
                                        {card.description}
                                    </span>
                                </div>
                            </motion.div>
                        ))}
                    </section>

                    {/* Visual Charts Section */}
                    <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Device Type breakdown */}
                        <div className="bg-card/45 border border-border rounded-xl p-5 backdrop-blur-sm shadow-sm flex flex-col justify-between min-h-75">
                            <div>
                                <h3 className="font-bold text-sm text-foreground">
                                    Device Category Breakdown
                                </h3>
                                <p className="text-[11px] text-muted-foreground mb-4">
                                    Distribution of registered devices by type
                                </p>
                            </div>
                            <div className="h-64 w-full">
                                {loading ? (
                                    <div className="h-full w-full bg-muted/30 animate-pulse rounded-lg flex items-center justify-center text-xs text-muted-foreground">
                                        Loading chart data...
                                    </div>
                                ) : stats.deviceTypeStats &&
                                  stats.deviceTypeStats.length > 0 ? (
                                    <ResponsiveContainer
                                        width="100%"
                                        height="100%"
                                    >
                                        <BarChart
                                            data={stats.deviceTypeStats}
                                            margin={{
                                                top: 10,
                                                right: 10,
                                                left: -20,
                                                bottom: 0,
                                            }}
                                        >
                                            <XAxis
                                                dataKey="device_type"
                                                stroke="#888888"
                                                fontSize={10}
                                                tickLine={false}
                                                axisLine={false}
                                            />
                                            <YAxis
                                                stroke="#888888"
                                                fontSize={10}
                                                tickLine={false}
                                                axisLine={false}
                                                allowDecimals={false}
                                            />
                                            <Tooltip
                                                content={<CustomTooltip />}
                                            />
                                            <Bar
                                                dataKey="count"
                                                radius={[4, 4, 0, 0]}
                                            >
                                                {stats.deviceTypeStats.map(
                                                    (_, index) => (
                                                        <Cell
                                                            key={`cell-${index}`}
                                                            fill={
                                                                COLORS[
                                                                    index %
                                                                        COLORS.length
                                                                ]
                                                            }
                                                        />
                                                    )
                                                )}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="h-full w-full flex items-center justify-center text-xs text-muted-foreground italic">
                                        No device category data available
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Case Resolution Performance */}
                        <div className="bg-card/45 border border-border rounded-xl p-5 backdrop-blur-sm shadow-sm flex flex-col justify-between min-h-75">
                            <div>
                                <h3 className="font-bold text-sm text-foreground">
                                    Case Resolution Performance
                                </h3>
                                <p className="text-[11px] text-muted-foreground mb-4">
                                    Success rate of delivered service requests
                                </p>
                            </div>
                            <div className="h-64 w-full flex flex-col sm:flex-row items-center justify-center gap-6">
                                {loading ? (
                                    <div className="h-full w-full bg-muted/30 animate-pulse rounded-lg flex items-center justify-center text-xs text-muted-foreground">
                                        Loading resolution stats...
                                    </div>
                                ) : stats.delivered && stats.delivered > 0 ? (
                                    <>
                                        <div className="h-44 w-44 relative shrink-0">
                                            <ResponsiveContainer
                                                width="100%"
                                                height="100%"
                                            >
                                                <PieChart>
                                                    <Pie
                                                        data={[
                                                            {
                                                                name: "Solved",
                                                                value:
                                                                    stats.solvedCount ||
                                                                    0,
                                                            },
                                                            {
                                                                name: "Unsolved",
                                                                value:
                                                                    stats.unsolvedCount ||
                                                                    0,
                                                            },
                                                        ]}
                                                        cx="50%"
                                                        cy="50%"
                                                        innerRadius={55}
                                                        outerRadius={70}
                                                        paddingAngle={4}
                                                        dataKey="value"
                                                    >
                                                        <Cell fill="#10b981" />
                                                        <Cell fill="#f43f5e" />
                                                    </Pie>
                                                    <Tooltip
                                                        content={
                                                            <CustomTooltip />
                                                        }
                                                    />
                                                </PieChart>
                                            </ResponsiveContainer>
                                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                                <span className="text-xl font-black text-foreground">
                                                    {Math.round(
                                                        ((stats.solvedCount ||
                                                            0) /
                                                            (stats.delivered ||
                                                                1)) *
                                                            100
                                                    )}
                                                    %
                                                </span>
                                                <span className="text-[8px] text-muted-foreground font-bold uppercase tracking-wider">
                                                    Solved Rate
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex flex-col gap-2.5 text-xs text-muted-foreground">
                                            <div className="flex items-center gap-2">
                                                <div className="h-3 w-3 rounded-full bg-emerald-500" />
                                                <span className="font-semibold text-foreground">
                                                    Solved Cases:{" "}
                                                    {stats.solvedCount || 0}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className="h-3 w-3 rounded-full bg-rose-500" />
                                                <span className="font-semibold text-foreground">
                                                    Unsolved Cases:{" "}
                                                    {stats.unsolvedCount || 0}
                                                </span>
                                            </div>
                                            <div className="border-t border-border/60 pt-2 text-[10px]">
                                                Total Delivered:{" "}
                                                {stats.delivered || 0}
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <div className="h-full w-full flex items-center justify-center text-xs text-muted-foreground italic">
                                        No delivered case history to calculate
                                        resolution rate
                                    </div>
                                )}
                            </div>
                        </div>
                    </section>
                </motion.div>
            </AnimatePresence>

            {/* Main Content Grid */}
            <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Recent Intakes List (2/3 width) */}
                <div className="lg:col-span-2 bg-card/45 border border-border rounded-xl p-5 sm:p-6 backdrop-blur-sm shadow-sm flex flex-col justify-between min-h-95">
                    <div>
                        <div className="flex justify-between items-center mb-4">
                            <div>
                                <h3 className="font-bold text-base text-foreground">
                                    Recent Intake Registrations
                                </h3>
                                <p className="text-[11px] text-muted-foreground">
                                    The latest devices logged into the repair
                                    registry
                                </p>
                            </div>
                            <Link
                                to="/app/services/active"
                                className="flex items-center gap-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 transition-colors"
                            >
                                <span>View All</span>
                                <ArrowRight className="h-3.5 w-3.5" />
                            </Link>
                        </div>

                        {loading ? (
                            <div className="space-y-3">
                                {[1, 2, 3].map((i) => (
                                    <div
                                        key={i}
                                        className="h-14 bg-muted/50 animate-pulse rounded-lg border border-border/40"
                                    />
                                ))}
                            </div>
                        ) : recentRequests.length > 0 ? (
                            <div className="space-y-3">
                                {recentRequests.map((req) => (
                                    <div
                                        key={req.id}
                                        className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-lg border border-border/50 bg-background/35 hover:bg-accent/30 transition-colors gap-2"
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className="h-9 w-9 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-500/10">
                                                <Laptop className="h-4.5 w-4.5" />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h4 className="text-xs font-bold text-foreground">
                                                        {req.brand_model}
                                                    </h4>
                                                    <span className="text-[9px] font-medium text-muted-foreground bg-muted border px-1.5 py-0.2 rounded-full uppercase">
                                                        {req.device_type}
                                                    </span>
                                                </div>
                                                <p className="text-[11px] text-muted-foreground mt-0.5">
                                                    Customer:{" "}
                                                    <strong className="text-foreground/80">
                                                        {req.customer_name}
                                                    </strong>{" "}
                                                    • Phone:{" "}
                                                    <strong className="text-foreground/80">
                                                        {req.customer_mobile}
                                                    </strong>
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 border-t sm:border-t-0 pt-2 sm:pt-0">
                                            <span
                                                className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${getStatusStyle(req.status)}`}
                                            >
                                                {req.status}
                                            </span>
                                            <span className="text-[9px] text-muted-foreground">
                                                {new Date(
                                                    req.created_at
                                                ).toLocaleDateString()}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center border border-dashed rounded-lg p-8 bg-background/25">
                                <Laptop className="h-10 w-10 text-muted-foreground/60 mb-2" />
                                <p className="text-xs text-muted-foreground italic text-center">
                                    No active repair intakes registered.
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Quick Operations Guide (1/3 width) */}
                <div className="bg-card/45 border border-border rounded-xl p-5 sm:p-6 backdrop-blur-sm shadow-sm space-y-4">
                    <div>
                        <h3 className="font-bold text-base text-foreground">
                            Intake Guide & Checklist
                        </h3>
                        <p className="text-[11px] text-muted-foreground">
                            Standard operational guidelines for administrators
                        </p>
                    </div>

                    <div className="space-y-3.5 pt-2 text-xs">
                        <div className="flex gap-2.5 items-start">
                            <span className="h-5 w-5 rounded-full bg-indigo-500/10 text-indigo-600 flex items-center justify-center text-[10px] font-bold shrink-0 border border-indigo-500/20">
                                1
                            </span>
                            <div>
                                <h4 className="font-semibold text-foreground">
                                    Authenticate Client Info
                                </h4>
                                <p className="text-[11px] text-muted-foreground mt-0.5">
                                    Always register client's full name, working
                                    mobile number, and contact address for
                                    service delivery tracking.
                                </p>
                            </div>
                        </div>

                        <div className="flex gap-2.5 items-start">
                            <span className="h-5 w-5 rounded-full bg-indigo-500/10 text-indigo-600 flex items-center justify-center text-[10px] font-bold shrink-0 border border-indigo-500/20">
                                2
                            </span>
                            <div>
                                <h4 className="font-semibold text-foreground">
                                    Verify Accessories Checklist
                                </h4>
                                <p className="text-[11px] text-muted-foreground mt-0.5">
                                    Confirm charger, laptop bag, power cables,
                                    or any other items received. Register their
                                    individual serial numbers to avoid customer
                                    disputes.
                                </p>
                            </div>
                        </div>

                        <div className="flex gap-2.5 items-start">
                            <span className="h-5 w-5 rounded-full bg-indigo-500/10 text-indigo-600 flex items-center justify-center text-[10px] font-bold shrink-0 border border-indigo-500/20">
                                3
                            </span>
                            <div>
                                <h4 className="font-semibold text-foreground">
                                    Print & Handover Receipt
                                </h4>
                                <p className="text-[11px] text-muted-foreground mt-0.5">
                                    Complete registration and print a physical
                                    handover slip. Collect signatures from the
                                    customer and receiver.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="border-t border-border/80 pt-4 flex flex-col gap-2">
                        <Link
                            to="/app/services/active?new=true"
                            className="flex justify-between items-center p-3 rounded-lg border border-indigo-500/20 bg-indigo-600/5 hover:bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 font-semibold transition-all group cursor-pointer text-xs"
                        >
                            <span>Launch Device Intake Dialog</span>
                            <Plus className="h-4 w-4 transition-transform group-hover:scale-110" />
                        </Link>
                        <Link
                            to="/app/services/active"
                            className="flex justify-between items-center p-3 rounded-lg border border-border bg-background hover:bg-accent/40 text-foreground font-semibold transition-all group cursor-pointer text-xs"
                        >
                            <span>Explore Entire Device Registry</span>
                            <FileText className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                        </Link>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default Home;
