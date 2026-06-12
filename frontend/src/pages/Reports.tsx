import React, { useState, useEffect } from "react";
import {
    Calendar as CalendarIcon,
    TrendingUp,
    Loader2,
    Printer,
    FileText,
    Activity,
} from "lucide-react";
import apiService from "../utils/apiService";
import toaster from "../utils/toaster";
import { motion, AnimatePresence } from "framer-motion";
import baseURL from "../utils/baseURL";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

// Shadcn UI Imports
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";

interface ReportPeriod {
    id: number;
    period: string;
    period_key: string;
    intakes_count: number;
    completed_count: number;
    delivered_count: number;
    labor_revenue: number;
    parts_cost: number;
    net_revenue: number;
    solved_count: number;
    // Daily report specific fields
    customer_name?: string;
    customer_mobile?: string;
    device_type?: string;
    brand_model?: string;
    status?: string;
    is_solved?: boolean | number;
}

const Reports: React.FC = () => {
    const [reportType, setReportType] = useState<
        "monthly" | "weekly" | "daily"
    >("monthly");
    const [selectedYear, setSelectedYear] = useState<number>(
        new Date().getFullYear()
    );
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [availableYears, setAvailableYears] = useState<number[]>([
        new Date().getFullYear(),
    ]);
    const [reportData, setReportData] = useState<ReportPeriod[]>([]);
    const [loading, setLoading] = useState(true);
    const [printingReport, setPrintingReport] = useState(false);

    useEffect(() => {
        const fetchYears = async () => {
            try {
                const response = await apiService.get("/api/v1/reports/years");
                const resData = response.data || response;
                if (Array.isArray(resData)) {
                    setAvailableYears(resData);
                    if (resData.length > 0 && !resData.includes(selectedYear)) {
                        setSelectedYear(resData[0]);
                    }
                }
            } catch (error) {
                console.error("Failed to load available report years:", error);
            }
        };
        fetchYears();
    }, []);

    const fetchReportData = async () => {
        setLoading(true);
        try {
            const params: any = { type: reportType };
            if (reportType === "daily") {
                params.date = format(selectedDate, "yyyy-MM-dd");
            } else {
                params.year = selectedYear;
            }

            const response = await apiService.get("/api/v1/reports/stats", {
                params,
            });
            const resData = response.data || response;
            setReportData(resData || []);
        } catch (error) {
            console.error("Failed to load report data:", error);
            toaster("error", "Error loading report analytics.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReportData();
    }, [reportType, selectedYear, selectedDate]);

    // Totals calculations
    const totals = reportData.reduce(
        (acc, curr) => {
            acc.totalIntakes += curr.intakes_count || 0;
            acc.totalCompleted += curr.completed_count || 0;
            acc.totalDelivered += curr.delivered_count || 0;
            acc.totalLaborRevenue += curr.labor_revenue || 0;
            acc.totalPartsCost += curr.parts_cost || 0;
            acc.totalNetRevenue += curr.net_revenue || 0;
            acc.totalSolved += curr.solved_count || 0;
            return acc;
        },
        {
            totalIntakes: 0,
            totalCompleted: 0,
            totalDelivered: 0,
            totalLaborRevenue: 0,
            totalPartsCost: 0,
            totalNetRevenue: 0,
            totalSolved: 0,
        }
    );

    const overallSolvedRate =
        totals.totalDelivered > 0
            ? Math.round((totals.totalSolved / totals.totalDelivered) * 100)
            : 0;

    const printReport = async () => {
        setPrintingReport(true);
        try {
            const token = localStorage.getItem("token");
            const dateStr = format(selectedDate, "yyyy-MM-dd");
            const urlParams =
                reportType === "daily"
                    ? `type=daily&date=${dateStr}`
                    : `type=${reportType}&year=${selectedYear}`;

            const response = await fetch(
                `${baseURL}/api/v1/reports/pdf?${urlParams}`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            if (!response.ok) {
                throw new Error("Failed to download PDF report from server");
            }

            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const printWindow = window.open(url, "_blank");
            if (printWindow) {
                printWindow.focus();
                toaster("success", "PDF report opened in new print window!");
            } else {
                toaster("error", "Popup blocker prevented opening the print window.");
            }
        } catch (error) {
            console.error("Failed to download report PDF:", error);
            toaster("error", "Failed to generate PDF report.");
        } finally {
            setPrintingReport(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header section with Filter controls */}
            <section className="bg-card/45 backdrop-blur-md border border-border rounded-xl p-5 sm:p-6 relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-linear-to-r from-transparent via-indigo-500/40 to-transparent" />
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-xl font-extrabold text-foreground">
                            Service Performance Reports
                        </h2>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            Analyze registered service requests, labor revenues,
                            and parts replacements.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        {/* Period Type Selection Tab List */}
                        <div className="flex bg-muted/65 p-0.5 rounded-lg border border-border/60">
                            <button
                                onClick={() => setReportType("monthly")}
                                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${
                                    reportType === "monthly"
                                        ? "bg-background text-foreground shadow-sm"
                                        : "text-muted-foreground hover:text-foreground"
                                }`}
                            >
                                Monthly
                            </button>
                            <button
                                onClick={() => setReportType("weekly")}
                                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${
                                    reportType === "weekly"
                                        ? "bg-background text-foreground shadow-sm"
                                        : "text-muted-foreground hover:text-foreground"
                                }`}
                            >
                                Weekly
                            </button>
                            <button
                                onClick={() => setReportType("daily")}
                                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${
                                    reportType === "daily"
                                        ? "bg-background text-foreground shadow-sm"
                                        : "text-muted-foreground hover:text-foreground"
                                }`}
                            >
                                Day-wise
                            </button>
                        </div>

                        {/* Year Selector (Shadcn select) - Only show when NOT daily */}
                        {reportType !== "daily" && (
                            <Select
                                value={String(selectedYear)}
                                onValueChange={(val) =>
                                    setSelectedYear(parseInt(val))
                                }
                            >
                                <SelectTrigger className="w-30 h-8 rounded-lg text-xs font-bold bg-background text-foreground border border-border cursor-pointer">
                                    <SelectValue placeholder="Year" />
                                </SelectTrigger>
                                <SelectContent>
                                    {availableYears.map((yr) => (
                                        <SelectItem key={yr} value={String(yr)}>
                                            Year: {yr}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}

                        {/* Date Picker (Shadcn Popover + Calendar) - Only show when daily */}
                        {reportType === "daily" && (
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        className={cn(
                                            "w-45 h-8 justify-start text-left text-xs font-semibold rounded-lg border border-border cursor-pointer bg-background hover:bg-accent/40 text-foreground",
                                            !selectedDate &&
                                                "text-muted-foreground"
                                        )}
                                    >
                                        <CalendarIcon className="mr-1.5 h-3.5 w-3.5 text-muted-foreground" />
                                        {selectedDate ? (
                                            format(selectedDate, "PPP")
                                        ) : (
                                            <span>Pick a date</span>
                                        )}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent
                                    className="w-auto p-0 border border-border bg-card shadow-lg rounded-xl"
                                    align="end"
                                >
                                    <Calendar
                                        mode="single"
                                        selected={selectedDate}
                                        onSelect={(date) =>
                                            date && setSelectedDate(date)
                                        }
                                        disabled={(date) => date > new Date()}
                                    />
                                </PopoverContent>
                            </Popover>
                        )}

                        {/* Print Report Button */}
                        <button
                            onClick={printReport}
                            disabled={
                                loading ||
                                reportData.length === 0 ||
                                printingReport
                            }
                            className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg transition-all cursor-pointer disabled:opacity-50 border border-indigo-500 shadow-md shadow-indigo-500/10"
                        >
                            {printingReport ? (
                                <>
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    <span>Generating...</span>
                                </>
                            ) : (
                                <>
                                    <Printer className="h-3.5 w-3.5" />
                                    <span>Print Report</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </section>

            {/* Financial & Operational Summary Cards */}
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
                            Total Billed Revenue
                        </span>
                        {loading ? (
                            <div className="h-8 w-24 bg-muted/65 animate-pulse rounded my-1" />
                        ) : (
                            <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                                ₹
                                {totals.totalNetRevenue.toLocaleString(
                                    "en-IN",
                                    { minimumFractionDigits: 2 }
                                )}
                            </p>
                        )}
                        <span className="text-[10px] text-muted-foreground block leading-tight">
                            Labor: ₹
                            {totals.totalLaborRevenue.toLocaleString("en-IN")} •
                            Parts: ₹
                            {totals.totalPartsCost.toLocaleString("en-IN")}
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
                            Total Intake Count
                        </span>
                        {loading ? (
                            <div className="h-8 w-24 bg-muted/65 animate-pulse rounded my-1" />
                        ) : (
                            <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400">
                                {totals.totalIntakes} Units
                            </p>
                        )}
                        <span className="text-[10px] text-muted-foreground block leading-tight">
                            Completed: {totals.totalCompleted} • Delivered:{" "}
                            {totals.totalDelivered}
                        </span>
                    </div>
                    <div className="h-12 w-12 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-500/20 shadow-inner shrink-0">
                        <CalendarIcon className="h-6 w-6" />
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
                            Case Resolution Rate
                        </span>
                        {loading ? (
                            <div className="h-8 w-24 bg-muted/65 animate-pulse rounded my-1" />
                        ) : (
                            <p className="text-2xl font-black text-purple-600 dark:text-purple-400">
                                {overallSolvedRate}%
                            </p>
                        )}
                        <span className="text-[10px] text-muted-foreground block leading-tight">
                            Overall success rate of repair diagnostics
                        </span>
                    </div>
                    <div className="h-12 w-12 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center border border-purple-500/20 shadow-inner shrink-0">
                        <Activity className="h-6 w-6" />
                    </div>
                </motion.div>
            </section>

            {/* Performance Report Table */}
            <AnimatePresence mode="wait">
                <motion.section
                    key={reportType}
                    initial={{
                        opacity: 0,
                        x:
                            reportType === "daily"
                                ? 20
                                : reportType === "monthly"
                                  ? -20
                                  : 0,
                        y: reportType === "weekly" ? 8 : 0,
                    }}
                    animate={{ opacity: 1, x: 0, y: 0 }}
                    exit={{
                        opacity: 0,
                        x:
                            reportType === "daily"
                                ? -20
                                : reportType === "monthly"
                                  ? 20
                                  : 0,
                        y: 0,
                    }}
                    transition={{ duration: 0.22, ease: "easeInOut" }}
                    className="bg-card/45 border border-border rounded-xl p-5 sm:p-6 backdrop-blur-sm shadow-sm"
                >
                    <div className="flex justify-between items-center mb-4">
                        <div>
                            <h3 className="font-bold text-base text-foreground">
                                Performance Log Table
                            </h3>
                            <p className="text-[11px] text-muted-foreground">
                                {reportType === "daily"
                                    ? `Showing all repair tickets registered on ${format(selectedDate, "PP")}.`
                                    : `Aggregated overview of service and financial statistics by ${reportType}.`}
                            </p>
                        </div>
                    </div>

                    {loading ? (
                        <div className="space-y-3">
                            <div className="h-10 bg-muted/30 animate-pulse rounded-lg border border-border/40" />
                            {[1, 2, 3, 4, 5].map((i) => (
                                <div
                                    key={i}
                                    className="h-12 bg-muted/20 animate-pulse rounded-lg border border-border/30"
                                />
                            ))}
                        </div>
                    ) : reportData.length > 0 ? (
                        <div className="overflow-x-auto border border-border/70 rounded-lg bg-background/35">
                            <table className="min-w-full text-xs text-left">
                                {reportType === "daily" ? (
                                    <>
                                        {/* Daily Table Headers */}
                                        <thead className="bg-muted/40 font-bold text-muted-foreground uppercase tracking-wider text-[10px]">
                                            <tr>
                                                <th className="px-4 py-3 border-r border-border/60">
                                                    Ticket ID
                                                </th>
                                                <th className="px-4 py-3 border-r border-border/60">
                                                    Customer
                                                </th>
                                                <th className="px-4 py-3 border-r border-border/60">
                                                    Device Specification
                                                </th>
                                                <th className="px-4 py-3 border-r border-border/60 text-center">
                                                    Status
                                                </th>
                                                <th className="px-4 py-3 border-r border-border/60 text-right">
                                                    Labor Charge
                                                </th>
                                                <th className="px-4 py-3 border-r border-border/60 text-right">
                                                    Parts Cost
                                                </th>
                                                <th className="px-4 py-3 text-right">
                                                    Grand Total
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border/60">
                                            {reportData.map((row) => (
                                                <tr
                                                    key={row.id}
                                                    className="hover:bg-accent/20 transition-colors"
                                                >
                                                    <td className="px-4 py-3.5 border-r border-border/60 font-mono font-bold text-foreground">
                                                        #SR-
                                                        {String(
                                                            row.id
                                                        ).padStart(6, "0")}
                                                    </td>
                                                    <td className="px-4 py-3.5 border-r border-border/60">
                                                        <div className="font-semibold text-foreground">
                                                            {row.customer_name}
                                                        </div>
                                                        <div className="text-[10px] text-muted-foreground">
                                                            {
                                                                row.customer_mobile
                                                            }
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3.5 border-r border-border/60">
                                                        <div className="font-semibold text-foreground">
                                                            {row.brand_model}
                                                        </div>
                                                        <span className="text-[9px] font-medium text-muted-foreground bg-muted border px-1.5 py-0.2 rounded-full uppercase">
                                                            {row.device_type}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3.5 border-r border-border/60 text-center">
                                                        <span
                                                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                                                row.status ===
                                                                "Received"
                                                                    ? "bg-blue-500/10 text-blue-500 border border-blue-500/20"
                                                                    : row.status ===
                                                                        "Diagnosing"
                                                                      ? "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                                                                      : row.status ===
                                                                          "In Progress"
                                                                        ? "bg-purple-500/10 text-purple-500 border border-purple-500/20"
                                                                        : row.status ===
                                                                            "Completed"
                                                                          ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                                                                          : "bg-zinc-500/10 text-zinc-500 border border-zinc-500/20"
                                                            }`}
                                                        >
                                                            {row.status}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3.5 border-r border-border/60 text-right font-medium">
                                                        ₹
                                                        {(
                                                            row.labor_revenue ||
                                                            0
                                                        ).toLocaleString(
                                                            "en-IN",
                                                            {
                                                                minimumFractionDigits: 2,
                                                            }
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3.5 border-r border-border/60 text-right font-medium">
                                                        ₹
                                                        {(
                                                            row.parts_cost || 0
                                                        ).toLocaleString(
                                                            "en-IN",
                                                            {
                                                                minimumFractionDigits: 2,
                                                            }
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3.5 text-right font-bold text-foreground">
                                                        ₹
                                                        {(
                                                            row.net_revenue || 0
                                                        ).toLocaleString(
                                                            "en-IN",
                                                            {
                                                                minimumFractionDigits: 2,
                                                            }
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}

                                            {/* Daily Totals Summary Row */}
                                            <tr className="bg-muted/30 font-bold border-t border-border border-double">
                                                <td
                                                    colSpan={4}
                                                    className="px-4 py-4 border-r border-border/60 text-foreground font-black text-sm uppercase"
                                                >
                                                    Total
                                                </td>
                                                <td className="px-4 py-4 border-r border-border/60 text-right text-foreground font-extrabold">
                                                    ₹
                                                    {totals.totalLaborRevenue.toLocaleString(
                                                        "en-IN",
                                                        {
                                                            minimumFractionDigits: 2,
                                                        }
                                                    )}
                                                </td>
                                                <td className="px-4 py-4 border-r border-border/60 text-right text-foreground font-extrabold">
                                                    ₹
                                                    {totals.totalPartsCost.toLocaleString(
                                                        "en-IN",
                                                        {
                                                            minimumFractionDigits: 2,
                                                        }
                                                    )}
                                                </td>
                                                <td className="px-4 py-4 text-right text-indigo-600 dark:text-indigo-400 font-black text-sm">
                                                    ₹
                                                    {totals.totalNetRevenue.toLocaleString(
                                                        "en-IN",
                                                        {
                                                            minimumFractionDigits: 2,
                                                        }
                                                    )}
                                                </td>
                                            </tr>
                                        </tbody>
                                    </>
                                ) : (
                                    <>
                                        {/* Monthly/Weekly Table Headers */}
                                        <thead className="bg-muted/40 font-bold text-muted-foreground uppercase tracking-wider text-[10px]">
                                            <tr>
                                                <th className="px-4 py-3 border-r border-border/60 w-1/4">
                                                    Period
                                                </th>
                                                <th className="px-4 py-3 border-r border-border/60 text-center">
                                                    Intakes
                                                </th>
                                                <th className="px-4 py-3 border-r border-border/60 text-center">
                                                    Completed
                                                </th>
                                                <th className="px-4 py-3 border-r border-border/60 text-center">
                                                    Delivered
                                                </th>
                                                <th className="px-4 py-3 border-r border-border/60 text-center">
                                                    Solved Rate
                                                </th>
                                                <th className="px-4 py-3 border-r border-border/60 text-right">
                                                    Labor Revenue
                                                </th>
                                                <th className="px-4 py-3 border-r border-border/60 text-right">
                                                    Parts Cost
                                                </th>
                                                <th className="px-4 py-3 text-right">
                                                    Grand Total
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border/60">
                                            {reportData.map((row) => {
                                                const solvedRate =
                                                    row.delivered_count > 0
                                                        ? Math.round(
                                                              (row.solved_count /
                                                                  row.delivered_count) *
                                                                  100
                                                          )
                                                        : 0;
                                                return (
                                                    <tr
                                                        key={row.period_key}
                                                        className="hover:bg-accent/20 transition-colors"
                                                    >
                                                        <td className="px-4 py-3.5 border-r border-border/60 font-semibold text-foreground">
                                                            {row.period}
                                                        </td>
                                                        <td className="px-4 py-3.5 border-r border-border/60 text-center font-medium">
                                                            {row.intakes_count}
                                                        </td>
                                                        <td className="px-4 py-3.5 border-r border-border/60 text-center">
                                                            {
                                                                row.completed_count
                                                            }
                                                        </td>
                                                        <td className="px-4 py-3.5 border-r border-border/60 text-center">
                                                            {
                                                                row.delivered_count
                                                            }
                                                        </td>
                                                        <td className="px-4 py-3.5 border-r border-border/60 text-center font-bold">
                                                            {row.delivered_count >
                                                            0 ? (
                                                                <span
                                                                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                                                        solvedRate >=
                                                                        75
                                                                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                                                            : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                                                                    }`}
                                                                >
                                                                    {solvedRate}
                                                                    %
                                                                </span>
                                                            ) : (
                                                                <span className="text-muted-foreground/50">
                                                                    -
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-3.5 border-r border-border/60 text-right font-medium">
                                                            ₹
                                                            {row.labor_revenue.toLocaleString(
                                                                "en-IN",
                                                                {
                                                                    minimumFractionDigits: 2,
                                                                }
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-3.5 border-r border-border/60 text-right font-medium">
                                                            ₹
                                                            {row.parts_cost.toLocaleString(
                                                                "en-IN",
                                                                {
                                                                    minimumFractionDigits: 2,
                                                                }
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-3.5 text-right font-bold text-foreground">
                                                            ₹
                                                            {row.net_revenue.toLocaleString(
                                                                "en-IN",
                                                                {
                                                                    minimumFractionDigits: 2,
                                                                }
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            })}

                                            {/* Monthly/Weekly Totals Summary Row */}
                                            <tr className="bg-muted/30 font-bold border-t border-border border-double">
                                                <td className="px-4 py-4 border-r border-border/60 text-foreground font-black text-sm uppercase">
                                                    Total
                                                </td>
                                                <td className="px-4 py-4 border-r border-border/60 text-center text-foreground font-extrabold text-sm">
                                                    {totals.totalIntakes}
                                                </td>
                                                <td className="px-4 py-4 border-r border-border/60 text-center">
                                                    {totals.totalCompleted}
                                                </td>
                                                <td className="px-4 py-4 border-r border-border/60 text-center">
                                                    {totals.totalDelivered}
                                                </td>
                                                <td className="px-4 py-4 border-r border-border/60 text-center">
                                                    <span
                                                        className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                                                            overallSolvedRate >=
                                                            75
                                                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/10"
                                                                : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/10"
                                                        }`}
                                                    >
                                                        {overallSolvedRate}%
                                                    </span>
                                                </td>
                                                <td className="px-4 py-4 border-r border-border/60 text-right text-foreground">
                                                    ₹
                                                    {totals.totalLaborRevenue.toLocaleString(
                                                        "en-IN",
                                                        {
                                                            minimumFractionDigits: 2,
                                                        }
                                                    )}
                                                </td>
                                                <td className="px-4 py-4 border-r border-border/60 text-right text-foreground">
                                                    ₹
                                                    {totals.totalPartsCost.toLocaleString(
                                                        "en-IN",
                                                        {
                                                            minimumFractionDigits: 2,
                                                        }
                                                    )}
                                                </td>
                                                <td className="px-4 py-4 text-right text-indigo-600 dark:text-indigo-400 font-black text-sm">
                                                    ₹
                                                    {totals.totalNetRevenue.toLocaleString(
                                                        "en-IN",
                                                        {
                                                            minimumFractionDigits: 2,
                                                        }
                                                    )}
                                                </td>
                                            </tr>
                                        </tbody>
                                    </>
                                )}
                            </table>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center border border-dashed border-border rounded-lg p-10 bg-background/25">
                            <FileText className="h-10 w-10 text-muted-foreground/60 mb-2" />
                            <p className="text-xs text-muted-foreground italic text-center">
                                No repair service request data logged on this
                                date yet.
                            </p>
                        </div>
                    )}
                </motion.section>
            </AnimatePresence>
        </div>
    );
};

export default Reports;
