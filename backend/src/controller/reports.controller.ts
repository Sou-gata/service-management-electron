import pool from "../config/db.js";
import asyncHandler from "../utils/asyncHandler.js";
import ApiResponse from "../utils/ApiResponse.js";
import ApiErrorResponse from "../utils/ApiErrorResponse.js";
import type { Request, Response } from "express";
import path from "path";
import ejs from "ejs";
import http from "http";
import { getFontsCss } from "../utils/fonts.js";

// Helper: Resolve views path
function getViewsPath(): string {
    if (process.env.VIEWS_PATH) return process.env.VIEWS_PATH;
    return path.join(process.cwd(), "views");
}

// Helper: IPC PDF Generation
async function generatePdfViaIpc(
    htmlContent: string,
    filename: string,
    res: Response
): Promise<boolean> {
    return new Promise((resolve) => {
        if (!process.env.IPC_PDF_PORT) {
            resolve(false);
            return;
        }
        const payload = JSON.stringify({ htmlContent, filename });
        const options = {
            hostname: "127.0.0.1",
            port: parseInt(process.env.IPC_PDF_PORT),
            path: "/generate-pdf",
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Content-Length": Buffer.byteLength(payload),
            },
        };
        const req = http.request(options, (ipcRes) => {
            const chunks: Buffer[] = [];
            ipcRes.on("data", (chunk) => chunks.push(chunk));
            ipcRes.on("end", () => {
                const buf = Buffer.concat(chunks);
                res.setHeader("Content-Type", "application/pdf");
                res.setHeader(
                    "Content-Disposition",
                    `attachment; filename=${filename}`
                );
                res.send(buf);
                resolve(true);
            });
        });
        req.on("error", () => resolve(false));
        req.write(payload);
        req.end();
    });
}

interface ReportPeriod {
    period: string;
    period_key: string;
    intakes_count: number;
    completed_count: number;
    delivered_count: number;
    labor_revenue: number;
    parts_cost: number;
    net_revenue: number;
    solved_count: number;
}

function getWeekRange(date: Date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);
    return { monday, sunday };
}

function formatWeekPeriod(date: Date) {
    const { monday, sunday } = getWeekRange(date);
    const startOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date.getTime() - startOfYear.getTime()) / 86400000;
    const weekNum = Math.ceil((pastDaysOfYear + startOfYear.getDay() + 1) / 7);
    const options: Intl.DateTimeFormatOptions = {
        month: "short",
        day: "2-digit",
    };
    const monStr = monday.toLocaleDateString("en-US", options);
    const sunStr = sunday.toLocaleDateString("en-US", options);
    return {
        label: `Week ${weekNum} (${monStr} - ${sunStr})`,
        key: `${date.getFullYear()}-W${String(weekNum).padStart(2, "0")}`,
        mondayTime: monday.getTime(),
    };
}

// SQLite-compatible: use strftime instead of MySQL DATE()/YEAR()
async function calculateDailyReportData(dateStr: string) {
    const [rows] = (await pool.query(
        `SELECT id, status, customer_name, customer_mobile, device_type, brand_model, cost, new_parts, is_solved, created_at 
         FROM service_requests 
         WHERE strftime('%Y-%m-%d', created_at) = ?`,
        [dateStr]
    )) as [any[], any];

    return rows.map((row) => {
        let partsCost = 0;
        if (row.new_parts) {
            try {
                const parts =
                    typeof row.new_parts === "string"
                        ? JSON.parse(row.new_parts)
                        : row.new_parts;
                if (Array.isArray(parts)) {
                    for (const part of parts) {
                        const partCost = parseFloat(part.cost);
                        if (!isNaN(partCost)) partsCost += partCost;
                    }
                }
            } catch (e) {}
        }
        const laborCost = parseFloat(row.cost) || 0;
        return {
            id: row.id,
            status: row.status,
            customer_name: row.customer_name,
            customer_mobile: row.customer_mobile,
            device_type: row.device_type,
            brand_model: row.brand_model,
            labor_revenue: laborCost,
            parts_cost: partsCost,
            net_revenue: laborCost + partsCost,
            is_solved: row.is_solved,
            created_at: row.created_at,
        };
    });
}

async function calculateReportData(type: string, year: number) {
    // SQLite: use strftime('%Y', ...) instead of MySQL YEAR()
    const [rows] = (await pool.query(
        `SELECT id, status, created_at, cost, new_parts, is_solved 
         FROM service_requests 
         WHERE strftime('%Y', created_at) = ?`,
        [String(year)]
    )) as [any[], any];

    if (type === "weekly") {
        const periods: Record<string, ReportPeriod & { mondayTime: number }> =
            {};
        const currentYear = new Date().getFullYear();
        const currentWeekRange = getWeekRange(new Date());
        const currentMondayTime = currentWeekRange.monday.getTime();

        for (const row of rows) {
            const date = new Date(row.created_at);
            const { label, key, mondayTime } = formatWeekPeriod(date);

            if (year === currentYear && mondayTime > currentMondayTime)
                continue;

            if (!periods[key]) {
                periods[key] = {
                    period: label,
                    period_key: key,
                    mondayTime,
                    intakes_count: 0,
                    completed_count: 0,
                    delivered_count: 0,
                    labor_revenue: 0,
                    parts_cost: 0,
                    net_revenue: 0,
                    solved_count: 0,
                };
            }

            periods[key].intakes_count++;
            if (row.status === "Completed") {
                periods[key].completed_count++;
            } else if (row.status === "Delivered") {
                periods[key].delivered_count++;
                const laborCost = parseFloat(row.cost);
                if (!isNaN(laborCost)) periods[key].labor_revenue += laborCost;
                if (row.new_parts) {
                    try {
                        const parts =
                            typeof row.new_parts === "string"
                                ? JSON.parse(row.new_parts)
                                : row.new_parts;
                        if (Array.isArray(parts)) {
                            for (const part of parts) {
                                const partCost = parseFloat(part.cost);
                                if (!isNaN(partCost))
                                    periods[key].parts_cost += partCost;
                            }
                        }
                    } catch (e) {}
                }
                if (row.is_solved === 1 || row.is_solved === true)
                    periods[key].solved_count++;
            }
        }

        const reportData = Object.values(periods).sort(
            (a, b) => b.mondayTime - a.mondayTime
        );
        reportData.forEach((p) => {
            p.net_revenue = p.labor_revenue + p.parts_cost;
        });
        return reportData;
    } else {
        const months = [
            "January",
            "February",
            "March",
            "April",
            "May",
            "June",
            "July",
            "August",
            "September",
            "October",
            "November",
            "December",
        ];
        const currentYear = new Date().getFullYear();
        const currentMonthIdx = new Date().getMonth();

        let maxMonthIdx = 11;
        if (year === currentYear) maxMonthIdx = currentMonthIdx;
        else if (year > currentYear) maxMonthIdx = -1;

        const periods: Record<string, ReportPeriod> = {};
        for (let i = maxMonthIdx; i >= 0; i--) {
            const key = `${year}-${String(i + 1).padStart(2, "0")}`;
            periods[key] = {
                period: `${months[i]} ${year}`,
                period_key: key,
                intakes_count: 0,
                completed_count: 0,
                delivered_count: 0,
                labor_revenue: 0,
                parts_cost: 0,
                net_revenue: 0,
                solved_count: 0,
            };
        }

        for (const row of rows) {
            const date = new Date(row.created_at);
            const monthIdx = date.getMonth();
            const key = `${year}-${String(monthIdx + 1).padStart(2, "0")}`;
            if (periods[key]) {
                periods[key].intakes_count++;
                if (row.status === "Completed") {
                    periods[key].completed_count++;
                } else if (row.status === "Delivered") {
                    periods[key].delivered_count++;
                    const laborCost = parseFloat(row.cost);
                    if (!isNaN(laborCost))
                        periods[key].labor_revenue += laborCost;
                    if (row.new_parts) {
                        try {
                            const parts =
                                typeof row.new_parts === "string"
                                    ? JSON.parse(row.new_parts)
                                    : row.new_parts;
                            if (Array.isArray(parts)) {
                                for (const part of parts) {
                                    const partCost = parseFloat(part.cost);
                                    if (!isNaN(partCost))
                                        periods[key].parts_cost += partCost;
                                }
                            }
                        } catch (e) {}
                    }
                    if (row.is_solved === 1 || row.is_solved === true)
                        periods[key].solved_count++;
                }
            }
        }

        const reportData = Object.values(periods).sort((a, b) =>
            b.period_key.localeCompare(a.period_key)
        );
        reportData.forEach((p) => {
            p.net_revenue = p.labor_revenue + p.parts_cost;
        });
        return reportData;
    }
}

export const getReportStats = asyncHandler(
    async (req: Request, res: Response) => {
        const type = req.query.type as string;

        if (type === "daily") {
            const dateStr =
                (req.query.date as string) ||
                new Date().toISOString().split("T")[0];
            const data = await calculateDailyReportData(dateStr);
            return new ApiResponse(
                200,
                data,
                "Daily report stats retrieved successfully"
            ).send(res);
        } else {
            const reportType = type === "weekly" ? "weekly" : "monthly";
            const year =
                parseInt(req.query.year as string) || new Date().getFullYear();
            const data = await calculateReportData(reportType, year);
            return new ApiResponse(
                200,
                data,
                "Report stats retrieved successfully"
            ).send(res);
        }
    }
);

export const getAvailableYears = asyncHandler(
    async (req: Request, res: Response) => {
        // SQLite: use strftime('%Y', ...) instead of MySQL YEAR()
        const [rows] = (await pool.query(
            `SELECT DISTINCT strftime('%Y', created_at) as year 
         FROM service_requests 
         ORDER BY year DESC`
        )) as [any[], any];

        let years = rows.map((r) => parseInt(r.year)).filter((y) => !isNaN(y));
        if (years.length === 0) years = [new Date().getFullYear()];

        return new ApiResponse(
            200,
            years,
            "Available report years retrieved successfully"
        ).send(res);
    }
);

export const downloadReportPdf = asyncHandler(
    async (req: Request, res: Response) => {
        const type = req.query.type as string;
        let year = new Date().getFullYear();
        let data: any[] = [];
        let dateStr = "";

        if (type === "daily") {
            dateStr =
                (req.query.date as string) ||
                new Date().toISOString().split("T")[0];
            data = await calculateDailyReportData(dateStr);
        } else {
            const reportType = type === "weekly" ? "weekly" : "monthly";
            year =
                parseInt(req.query.year as string) || new Date().getFullYear();
            data = await calculateReportData(reportType, year);
        }

        let totalIntakes = 0,
            totalCompleted = 0,
            totalDelivered = 0;
        let totalLaborRevenue = 0,
            totalPartsCost = 0,
            totalNetRevenue = 0,
            totalSolved = 0;

        if (type === "daily") {
            totalIntakes = data.length;
            totalCompleted = data.filter(
                (r) => r.status === "Completed"
            ).length;
            totalDelivered = data.filter(
                (r) => r.status === "Delivered"
            ).length;
            totalLaborRevenue = data.reduce(
                (sum, r) => sum + r.labor_revenue,
                0
            );
            totalPartsCost = data.reduce((sum, r) => sum + r.parts_cost, 0);
            totalNetRevenue = data.reduce((sum, r) => sum + r.net_revenue, 0);
            totalSolved = data.filter(
                (r) =>
                    r.status === "Delivered" &&
                    (r.is_solved === 1 || r.is_solved === true)
            ).length;
        } else {
            data.forEach((p) => {
                totalIntakes += p.intakes_count;
                totalCompleted += p.completed_count;
                totalDelivered += p.delivered_count;
                totalLaborRevenue += p.labor_revenue;
                totalPartsCost += p.parts_cost;
                totalNetRevenue += p.net_revenue;
                totalSolved += p.solved_count;
            });
        }

        const overallSolvedRate =
            totalDelivered > 0
                ? Math.round((totalSolved / totalDelivered) * 100)
                : 0;
        const templatePath = path.join(getViewsPath(), "report_pdf.ejs");
        const generatedAt = new Date().toLocaleDateString("en-GB");

        let htmlContent = "";
        try {
            htmlContent = await ejs.renderFile(templatePath, {
                type,
                year,
                dateStr,
                periods: data,
                totals: {
                    totalIntakes,
                    totalCompleted,
                    totalDelivered,
                    totalLaborRevenue,
                    totalPartsCost,
                    totalNetRevenue,
                    overallSolvedRate,
                },
                generatedAt,
                fontsCss: getFontsCss(getViewsPath()),
            });
        } catch (err: any) {
            throw new ApiErrorResponse(
                500,
                null,
                "Failed to render template: " + err.message
            );
        }

        const filename =
            type === "daily"
                ? `daily_report_${dateStr}.pdf`
                : `${type}_report_${year}.pdf`;

        const ipcSuccess = await generatePdfViaIpc(htmlContent, filename, res);
        if (ipcSuccess) return;

        // Fallback: return HTML
        res.setHeader("Content-Type", "text/html");
        res.setHeader(
            "Content-Disposition",
            `inline; filename=${filename.replace(".pdf", ".html")}`
        );
        return res.send(htmlContent);
    }
);
