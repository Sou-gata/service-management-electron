import pool from "../config/db.js";
import asyncHandler from "../utils/asyncHandler.js";
import ApiResponse from "../utils/ApiResponse.js";
import ApiErrorResponse from "../utils/ApiErrorResponse.js";
import type { Request, Response } from "express";
import type { CustomRequest } from "../middleware/auth.middleware.js";
import path from "path";
import ejs from "ejs";

// ─── Helper: Resolve views path (works in Electron packaged & dev) ───────────
function getViewsPath(): string {
    if (process.env.VIEWS_PATH) {
        return process.env.VIEWS_PATH;
    }
    return path.join(process.cwd(), "views");
}

// ─── Helper: Generate PDF via Electron IPC ───────────────────────────────────
// Returns the raw PDF buffer. Sends a request to the main process which uses
// webContents.printToPDF() — no Puppeteer/Chromium needed.
async function generatePdfViaIpc(
    htmlContent: string,
    filename: string,
    res: Response
): Promise<boolean> {
    // When running inside Electron, we communicate via a special IPC HTTP endpoint
    // that main.js sets up on a loopback-only port.
    // We fall back to returning the HTML directly for download if IPC is unavailable.
    const http = await import("http");

    return new Promise((resolve) => {
        const payload = JSON.stringify({ htmlContent, filename });
        const options = {
            hostname: "127.0.0.1",
            port: parseInt(process.env.IPC_PDF_PORT || "0"),
            path: "/generate-pdf",
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Content-Length": Buffer.byteLength(payload),
            },
        };

        if (!process.env.IPC_PDF_PORT) {
            resolve(false);
            return;
        }

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

export const createServiceRequest = asyncHandler(
    async (req: Request, res: Response) => {
        const customReq = req as CustomRequest;
        const userId = customReq.user?.id;

        const {
            customer_name,
            customer_mobile,
            customer_address,
            device_type,
            brand_model,
            serial_number,
            problem_description,
            items,
            devices,
        } = req.body;

        if (!customer_name || !customer_name.trim()) {
            throw new ApiErrorResponse(400, null, "Customer name is required.");
        }
        if (!customer_mobile || !customer_mobile.trim()) {
            throw new ApiErrorResponse(
                400,
                null,
                "Customer mobile number is required."
            );
        }
        if (!customer_address || !customer_address.trim()) {
            throw new ApiErrorResponse(
                400,
                null,
                "Customer address is required."
            );
        }

        let devicesToInsert: any[] = [];
        if (Array.isArray(devices)) {
            devicesToInsert = devices;
        } else {
            devicesToInsert = [
                {
                    device_type,
                    brand_model,
                    serial_number,
                    problem_description,
                    estimated_delivery_date: req.body.estimated_delivery_date,
                    estimated_cost: req.body.estimated_cost,
                    items,
                    product_image: req.body.product_image,
                    is_warranty: req.body.is_warranty,
                },
            ];
        }

        if (devicesToInsert.length === 0) {
            throw new ApiErrorResponse(
                400,
                null,
                "At least one device specification is required."
            );
        }

        for (let i = 0; i < devicesToInsert.length; i++) {
            const dev = devicesToInsert[i];
            const label =
                devicesToInsert.length > 1 ? ` (Device #${i + 1})` : "";
            if (!dev.device_type || !dev.device_type.trim()) {
                throw new ApiErrorResponse(
                    400,
                    null,
                    `Device type is required${label}.`
                );
            }
            if (!dev.brand_model || !dev.brand_model.trim()) {
                throw new ApiErrorResponse(
                    400,
                    null,
                    `Brand/Model is required${label}.`
                );
            }
        }

        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();

            const insertedIds: number[] = [];

            for (const dev of devicesToInsert) {
                const [srResult] = (await connection.query(
                    `INSERT INTO service_requests 
              (customer_name, customer_mobile, customer_address, device_type, brand_model, serial_number, problem_description, estimated_delivery_date, estimated_cost, created_by, product_image, is_warranty) 
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        customer_name.trim(),
                        customer_mobile.trim(),
                        customer_address.trim(),
                        dev.device_type.trim(),
                        dev.brand_model.trim(),
                        dev.serial_number ? dev.serial_number.trim() : null,
                        dev.problem_description
                            ? dev.problem_description.trim()
                            : null,
                        dev.estimated_delivery_date
                            ? dev.estimated_delivery_date.trim()
                            : null,
                        dev.estimated_cost !== undefined &&
                        dev.estimated_cost !== null &&
                        String(dev.estimated_cost).trim() !== ""
                            ? parseFloat(dev.estimated_cost)
                            : null,
                        userId || null,
                        dev.product_image ? dev.product_image.trim() : null,
                        dev.is_warranty ? 1 : 0,
                    ]
                )) as [any, any];

                const serviceRequestId = srResult.insertId;
                insertedIds.push(Number(serviceRequestId));

                if (Array.isArray(dev.items) && dev.items.length > 0) {
                    for (const item of dev.items) {
                        if (item.item_name && item.item_name.trim() !== "") {
                            await connection.query(
                                `INSERT INTO service_request_items (service_request_id, item_name, item_description, is_warranty) VALUES (?, ?, ?, ?)`,
                                [
                                    serviceRequestId,
                                    item.item_name.trim(),
                                    item.item_description
                                        ? item.item_description.trim()
                                        : null,
                                    item.is_warranty ? 1 : 0,
                                ]
                            );
                        }
                    }
                }
            }

            await connection.commit();

            return new ApiResponse(
                201,
                { id: insertedIds[0], ids: insertedIds },
                devicesToInsert.length > 1
                    ? "Service requests registered successfully"
                    : "Service request registered successfully"
            ).send(res);
        } catch (error: any) {
            await connection.rollback();
            console.error("Error creating service request transaction:", error);
            throw new ApiErrorResponse(
                500,
                null,
                "Failed to register service request: " + error.message
            );
        } finally {
            connection.release();
        }
    }
);

export const getServiceRequests = asyncHandler(
    async (req: Request, res: Response) => {
        const search = (req.query.search as string) || "";
        const status = (req.query.status as string) || "";
        const companyId = (req.query.companyId as string) || "";
        const servicingStatus = (req.query.servicingStatus as string) || "";
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        const sortBy = (req.query.sortBy as string) || "created_at";
        const sortOrder =
            (req.query.sortOrder as string) === "asc" ? "ASC" : "DESC";

        const offset = (page - 1) * limit;

        const allowedSortFields = [
            "id",
            "customer_name",
            "customer_mobile",
            "device_type",
            "brand_model",
            "status",
            "created_at",
        ];
        const verifiedSortBy = allowedSortFields.includes(sortBy)
            ? sortBy
            : "created_at";

        let query = `
        SELECT sr.*, u.username as registered_by_user,
               (SELECT COUNT(*) FROM service_request_items sri WHERE sri.service_request_id = sr.id) as items_count,
               COALESCE(s.dispatch_date, sr.dispatch_date) as dispatch_date,
               COALESCE(s.servicing_company_id, sr.servicing_company_id) as servicing_company_id,
               COALESCE(s.challan_no, sr.challan_no) as challan_no,
               COALESCE(s.courier_details, sr.courier_details) as courier_details,
               COALESCE(s.status, CASE WHEN sr.status = 'Servicing' THEN 'Servicing' ELSE 'Completed' END) as servicing_status
        FROM service_requests sr
        LEFT JOIN users u ON sr.created_by = u.id
        LEFT JOIN servicings s ON s.id = (
            SELECT MAX(id) FROM servicings WHERE service_request_id = sr.id
        )
        WHERE 1=1
    `;
        let countQuery = `
        SELECT COUNT(*) as count 
        FROM service_requests sr 
        LEFT JOIN servicings s ON s.id = (
            SELECT MAX(id) FROM servicings WHERE service_request_id = sr.id
        )
        WHERE 1=1
    `;
        const queryParams: any[] = [];
        const countParams: any[] = [];

        if (search.trim() !== "") {
            const searchLike = `%${search}%`;
            const searchFilter = ` AND (sr.customer_name LIKE ? OR sr.customer_mobile LIKE ? OR sr.brand_model LIKE ? OR sr.serial_number LIKE ?)`;
            query += searchFilter;
            countQuery += searchFilter;
            queryParams.push(searchLike, searchLike, searchLike, searchLike);
            countParams.push(searchLike, searchLike, searchLike, searchLike);
        }

        if (status.trim() !== "") {
            if (status === "active") {
                const statusFilter = ` AND sr.status != 'Delivered' AND sr.status != 'Servicing'`;
                query += statusFilter;
                countQuery += statusFilter;
            } else if (status === "servicing_all") {
                if (servicingStatus === "Servicing") {
                    const statusFilter = ` AND COALESCE(s.status, CASE WHEN sr.status = 'Servicing' THEN 'Servicing' ELSE 'Completed' END) = 'Servicing'`;
                    query += statusFilter;
                    countQuery += statusFilter;
                } else if (servicingStatus === "Completed") {
                    const statusFilter = ` AND COALESCE(s.status, CASE WHEN sr.status = 'Servicing' THEN 'Servicing' ELSE 'Completed' END) = 'Completed'`;
                    query += statusFilter;
                    countQuery += statusFilter;
                } else {
                    const statusFilter = ` AND sr.is_sent_for_servicing = 1`;
                    query += statusFilter;
                    countQuery += statusFilter;
                }
            } else {
                const statusFilter = ` AND sr.status = ?`;
                query += statusFilter;
                countQuery += statusFilter;
                queryParams.push(status);
                countParams.push(status);
            }
        } else {
            const statusFilter = ` AND sr.status != 'Delivered' AND sr.status != 'Servicing'`;
            query += statusFilter;
            countQuery += statusFilter;
        }

        if (companyId.trim() !== "") {
            const companyFilter = ` AND COALESCE(s.servicing_company_id, sr.servicing_company_id) = ?`;
            query += companyFilter;
            countQuery += companyFilter;
            queryParams.push(parseInt(companyId));
            countParams.push(parseInt(companyId));
        }

        query += ` ORDER BY sr.${verifiedSortBy} ${sortOrder} LIMIT ? OFFSET ?`;
        queryParams.push(limit, offset);

        const [rows] = (await pool.query(query, queryParams)) as [any[], any];
        for (const row of rows) {
            if (row.returned_items) {
                try {
                    row.returned_items = JSON.parse(row.returned_items);
                } catch (e) {}
            }
            if (row.new_parts) {
                try {
                    row.new_parts = JSON.parse(row.new_parts);
                } catch (e) {}
            }
        }
        const [countRows] = (await pool.query(countQuery, countParams)) as [
            any[],
            any,
        ];

        const totalCount = countRows[0]?.count || 0;
        const totalPages = Math.ceil(totalCount / limit);

        return new ApiResponse(
            200,
            {
                serviceRequests: rows,
                pagination: {
                    totalCount,
                    totalPages,
                    currentPage: page,
                    limit,
                },
            },
            "Service requests retrieved successfully"
        ).send(res);
    }
);

export const getServiceRequestById = asyncHandler(
    async (req: Request, res: Response) => {
        const id = parseInt(req.params.id as string);
        if (isNaN(id)) {
            throw new ApiErrorResponse(
                400,
                null,
                "Invalid service request ID."
            );
        }

        const [requests] = (await pool.query(
            `SELECT sr.*, u.username as registered_by_user 
            FROM service_requests sr 
            LEFT JOIN users u ON sr.created_by = u.id 
            WHERE sr.id = ?`,
            [id]
        )) as [any[], any];

        if (requests.length === 0) {
            throw new ApiErrorResponse(404, null, "Service request not found.");
        }

        const request = requests[0];

        const [items] = (await pool.query(
            `SELECT * FROM service_request_items WHERE service_request_id = ?`,
            [id]
        )) as [any[], any];

        request.items = items;

        if (request.returned_items) {
            try {
                request.returned_items = JSON.parse(request.returned_items);
            } catch (e) {}
        }
        if (request.new_parts) {
            try {
                request.new_parts = JSON.parse(request.new_parts);
            } catch (e) {}
        }

        return new ApiResponse(
            200,
            request,
            "Service request details retrieved successfully"
        ).send(res);
    }
);

export const updateServiceRequest = asyncHandler(
    async (req: Request, res: Response) => {
        const id = parseInt(req.params.id as string);
        if (isNaN(id)) {
            throw new ApiErrorResponse(
                400,
                null,
                "Invalid service request ID."
            );
        }

        const {
            customer_name,
            customer_mobile,
            customer_address,
            device_type,
            brand_model,
            serial_number,
            problem_description,
            estimated_delivery_date,
            estimated_cost,
            status,
            items,
            product_image,
            is_warranty,
        } = req.body;

        if (!customer_name || !customer_name.trim())
            throw new ApiErrorResponse(400, null, "Customer name is required.");
        if (!customer_mobile || !customer_mobile.trim())
            throw new ApiErrorResponse(
                400,
                null,
                "Customer mobile number is required."
            );
        if (!customer_address || !customer_address.trim())
            throw new ApiErrorResponse(
                400,
                null,
                "Customer address is required."
            );
        if (!device_type || !device_type.trim())
            throw new ApiErrorResponse(400, null, "Device type is required.");
        if (!brand_model || !brand_model.trim())
            throw new ApiErrorResponse(400, null, "Brand/Model is required.");

        const [existing] = (await pool.query(
            `SELECT id FROM service_requests WHERE id = ?`,
            [id]
        )) as [any[], any];
        if (existing.length === 0) {
            throw new ApiErrorResponse(404, null, "Service request not found.");
        }

        const connection = await pool.getConnection();
        await connection.beginTransaction();

        try {
            await connection.query(
                `UPDATE service_requests SET 
                customer_name = ?, customer_mobile = ?, customer_address = ?,
                device_type = ?, brand_model = ?, serial_number = ?,
                problem_description = ?, estimated_delivery_date = ?, estimated_cost = ?, status = ?, product_image = ?, is_warranty = ?,
                delivery_date = CASE WHEN ? = 'Delivered' THEN CURRENT_TIMESTAMP ELSE delivery_date END,
                updated_at = CURRENT_TIMESTAMP
                WHERE id = ?`,
                [
                    customer_name.trim(),
                    customer_mobile.trim(),
                    customer_address.trim(),
                    device_type.trim(),
                    brand_model.trim(),
                    serial_number ? serial_number.trim() : null,
                    problem_description ? problem_description.trim() : null,
                    estimated_delivery_date
                        ? estimated_delivery_date.trim()
                        : null,
                    estimated_cost !== undefined &&
                    estimated_cost !== null &&
                    String(estimated_cost).trim() !== ""
                        ? parseFloat(estimated_cost)
                        : null,
                    status || "Received",
                    product_image ? product_image.trim() : null,
                    is_warranty ? 1 : 0,
                    status || "Received",
                    id,
                ]
            );

            await connection.query(
                `DELETE FROM service_request_items WHERE service_request_id = ?`,
                [id]
            );

            if (Array.isArray(items) && items.length > 0) {
                for (const item of items) {
                    if (item.item_name && item.item_name.trim() !== "") {
                        await connection.query(
                            `INSERT INTO service_request_items (service_request_id, item_name, item_description, is_warranty) VALUES (?, ?, ?, ?)`,
                            [
                                id,
                                item.item_name.trim(),
                                item.item_description
                                    ? item.item_description.trim()
                                    : null,
                                item.is_warranty ? 1 : 0,
                            ]
                        );
                    }
                }
            }

            if (
                status &&
                ["Completed", "Repaired", "Unrepairable", "Delivered"].includes(
                    status.trim()
                )
            ) {
                await connection.query(
                    `UPDATE servicings SET status = 'Completed', updated_at = CURRENT_TIMESTAMP 
                     WHERE service_request_id = ? AND status = 'Servicing'`,
                    [id]
                );
            }

            await connection.commit();
            return new ApiResponse(
                200,
                null,
                "Service request updated successfully"
            ).send(res);
        } catch (error: any) {
            await connection.rollback();
            throw new ApiErrorResponse(
                500,
                null,
                "Failed to update service request: " + error.message
            );
        } finally {
            connection.release();
        }
    }
);

export const updateServiceRequestStatus = asyncHandler(
    async (req: Request, res: Response) => {
        const id = parseInt(req.params.id as string);
        const { status, cost, is_solved, returned_items, new_parts } = req.body;

        if (isNaN(id))
            throw new ApiErrorResponse(
                400,
                null,
                "Invalid service request ID."
            );
        if (!status || !status.trim())
            throw new ApiErrorResponse(400, null, "Status is required.");

        let query = `UPDATE service_requests SET status = ?, updated_at = CURRENT_TIMESTAMP`;
        const params: any[] = [status.trim()];

        if (status.trim() === "Completed") {
            query += `, is_solved = ?`;
            const cleanSolved =
                is_solved !== undefined && is_solved !== null
                    ? is_solved === true ||
                      is_solved === 1 ||
                      is_solved === "true"
                        ? 1
                        : 0
                    : null;
            params.push(cleanSolved);
        } else if (status.trim() === "Delivered") {
            query += `, cost = ?, is_solved = ?, returned_items = ?, new_parts = ?, delivery_date = CURRENT_TIMESTAMP`;
            const cleanCost =
                cost !== undefined &&
                cost !== null &&
                String(cost).trim() !== ""
                    ? parseFloat(String(cost))
                    : null;
            const cleanSolved =
                is_solved !== undefined && is_solved !== null
                    ? is_solved === true ||
                      is_solved === 1 ||
                      is_solved === "true"
                        ? 1
                        : 0
                    : null;
            const cleanReturnedItems =
                returned_items !== undefined && returned_items !== null
                    ? typeof returned_items === "string"
                        ? returned_items
                        : JSON.stringify(returned_items)
                    : null;
            const cleanNewParts =
                new_parts !== undefined && new_parts !== null
                    ? typeof new_parts === "string"
                        ? new_parts
                        : JSON.stringify(new_parts)
                    : null;
            params.push(
                cleanCost,
                cleanSolved,
                cleanReturnedItems,
                cleanNewParts
            );
        }

        query += ` WHERE id = ?`;
        params.push(id);

        const [result] = (await pool.query(query, params)) as [any, any];

        if (result.affectedRows === 0) {
            throw new ApiErrorResponse(404, null, "Service request not found.");
        }

        if (
            ["Completed", "Repaired", "Unrepairable", "Delivered"].includes(
                status.trim()
            )
        ) {
            await pool.query(
                `UPDATE servicings SET status = 'Completed', updated_at = CURRENT_TIMESTAMP 
                 WHERE service_request_id = ? AND status = 'Servicing'`,
                [id]
            );
        }

        return new ApiResponse(200, null, "Status updated successfully").send(
            res
        );
    }
);

export const deleteServiceRequest = asyncHandler(
    async (req: Request, res: Response) => {
        const id = parseInt(req.params.id as string);
        if (isNaN(id))
            throw new ApiErrorResponse(
                400,
                null,
                "Invalid service request ID."
            );

        const [result] = (await pool.query(
            `DELETE FROM service_requests WHERE id = ?`,
            [id]
        )) as [any, any];
        if (result.affectedRows === 0) {
            throw new ApiErrorResponse(404, null, "Service request not found.");
        }

        return new ApiResponse(
            200,
            null,
            "Service request deleted successfully"
        ).send(res);
    }
);

export const getServiceRequestStats = asyncHandler(
    async (req: Request, res: Response) => {
        const range = (req.query.range as string) || "all";
        let whereClause = "";
        let deliveredWhereClause = "WHERE status = 'Delivered'";

        if (range === "today") {
            whereClause = "WHERE created_at >= date('now', 'start of day')";
            deliveredWhereClause =
                "WHERE status = 'Delivered' AND created_at >= date('now', 'start of day')";
        } else if (range === "7days") {
            whereClause = "WHERE created_at >= date('now', '-7 days')";
            deliveredWhereClause =
                "WHERE status = 'Delivered' AND created_at >= date('now', '-7 days')";
        } else if (range === "30days") {
            whereClause = "WHERE created_at >= date('now', '-30 days')";
            deliveredWhereClause =
                "WHERE status = 'Delivered' AND created_at >= date('now', '-30 days')";
        }

        const [rows] = (await pool.query(`
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN status = 'Received' THEN 1 ELSE 0 END) as received,
                SUM(CASE WHEN status = 'Servicing' THEN 1 ELSE 0 END) as servicing,
                SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) as completed,
                SUM(CASE WHEN status = 'Delivered' THEN 1 ELSE 0 END) as delivered
            FROM service_requests
            ${whereClause}
        `)) as [any[], any];

        const stats = rows[0] || {
            total: 0,
            received: 0,
            servicing: 0,
            completed: 0,
            delivered: 0,
        };

        const [deliveredRows] = (await pool.query(`
            SELECT cost, new_parts, is_solved
            FROM service_requests
            ${deliveredWhereClause}
        `)) as [any[], any];

        let totalLabor = 0;
        let totalParts = 0;
        let solvedCount = 0;
        let unsolvedCount = 0;

        for (const row of deliveredRows) {
            const laborCost = parseFloat(row.cost);
            if (!isNaN(laborCost)) totalLabor += laborCost;

            if (row.is_solved === 1 || row.is_solved === true) {
                solvedCount++;
            } else {
                unsolvedCount++;
            }

            if (row.new_parts) {
                try {
                    const parts =
                        typeof row.new_parts === "string"
                            ? JSON.parse(row.new_parts)
                            : row.new_parts;
                    if (Array.isArray(parts)) {
                        for (const part of parts) {
                            const partCost = parseFloat(part.cost);
                            if (!isNaN(partCost)) totalParts += partCost;
                        }
                    }
                } catch (e) {}
            }
        }

        const [deviceTypeRows] = (await pool.query(`
            SELECT device_type, COUNT(*) as count
            FROM service_requests
            ${whereClause}
            GROUP BY device_type
            ORDER BY count DESC
        `)) as [any[], any];

        const deviceTypeStats = deviceTypeRows.map((r: any) => ({
            device_type: r.device_type,
            count: Number(r.count || 0),
        }));

        return new ApiResponse(
            200,
            {
                total: Number(stats.total || 0),
                received: Number(stats.received || 0),
                servicing: Number(stats.servicing || 0),
                completed: Number(stats.completed || 0),
                delivered: Number(stats.delivered || 0),
                totalRevenue: totalLabor + totalParts,
                totalLabor,
                totalParts,
                solvedCount,
                unsolvedCount,
                deviceTypeStats,
            },
            "Service request stats retrieved successfully"
        ).send(res);
    }
);

// ─── PDF Generation via Electron IPC (replaces Puppeteer) ───────────────────
export const downloadServiceRequestPdf = asyncHandler(
    async (req: Request, res: Response) => {
        const id = parseInt(req.params.id as string);
        if (isNaN(id))
            throw new ApiErrorResponse(
                400,
                null,
                "Invalid service request ID."
            );

        const [requests] = (await pool.query(
            `SELECT sr.*, u.username as registered_by_user 
            FROM service_requests sr 
            LEFT JOIN users u ON sr.created_by = u.id 
            WHERE sr.id = ?`,
            [id]
        )) as [any[], any];

        if (requests.length === 0)
            throw new ApiErrorResponse(404, null, "Service request not found.");

        const request = requests[0];
        const [items] = (await pool.query(
            `SELECT * FROM service_request_items WHERE service_request_id = ?`,
            [id]
        )) as [any[], any];
        request.items = items;

        if (request.returned_items) {
            try {
                request.returned_items = JSON.parse(request.returned_items);
            } catch (e) {}
        }
        if (request.new_parts) {
            try {
                request.new_parts = JSON.parse(request.new_parts);
            } catch (e) {}
        }

        const ticketId = String(request.id).padStart(6, "0");
        const statusClass = request.status.replace(/\s+/g, "-");
        const generatedAt = new Date().toLocaleDateString("en-GB");
        const registeredBy = request.registered_by_user || "System";

        const isDelivered = request.status === "Delivered";
        const templateName = isDelivered
            ? "delivery_receipt.ejs"
            : "intake_receipt.ejs";
        const templatePath = path.join(getViewsPath(), templateName);

        let partsTotal = 0;
        if (isDelivered && Array.isArray(request.new_parts)) {
            request.new_parts.forEach((part: any) => {
                const partCost = parseFloat(part.cost);
                if (!isNaN(partCost)) partsTotal += partCost;
            });
        }
        const laborFee =
            request.cost !== null && request.cost !== undefined
                ? parseFloat(String(request.cost))
                : 0;
        const grandTotal = laborFee + partsTotal;

        const filename = isDelivered
            ? `delivery_receipt_SR-${ticketId}.pdf`
            : `service_report_SR-${ticketId}.pdf`;

        let htmlContent = "";
        try {
            htmlContent = await ejs.renderFile(templatePath, {
                request,
                ticketId,
                statusClass,
                generatedAt,
                registeredBy,
                partsTotal,
                laborFee,
                grandTotal,
            });
        } catch (err: any) {
            throw new ApiErrorResponse(
                500,
                null,
                "Failed to render template: " + err.message
            );
        }

        // Try IPC-based PDF generation (Electron)
        const ipcSuccess = await generatePdfViaIpc(htmlContent, filename, res);
        if (ipcSuccess) return;

        // Fallback: return the rendered HTML so the browser can print it
        res.setHeader("Content-Type", "text/html");
        res.setHeader(
            "Content-Disposition",
            `inline; filename=${filename.replace(".pdf", ".html")}`
        );
        return res.send(htmlContent);
    }
);

export const uploadImage = asyncHandler(async (req: Request, res: Response) => {
    const file = (req as any).file;
    if (!file) {
        throw new ApiErrorResponse(400, null, "No image file uploaded.");
    }
    return new ApiResponse(
        200,
        { filename: file.filename },
        "Image uploaded successfully"
    ).send(res);
});

export const sendForServicing = asyncHandler(
    async (req: Request, res: Response) => {
        const id = parseInt(req.params.id as string);
        if (isNaN(id)) {
            throw new ApiErrorResponse(
                400,
                null,
                "Invalid service request ID."
            );
        }

        const {
            dispatch_date,
            servicing_company_id,
            challan_no,
            courier_details,
            items,
        } = req.body;

        if (!dispatch_date) {
            throw new ApiErrorResponse(400, null, "Dispatch date is required.");
        }
        if (!servicing_company_id) {
            throw new ApiErrorResponse(
                400,
                null,
                "Company selection is required."
            );
        }

        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();

            const [existing] = (await connection.query(
                `SELECT id FROM service_requests WHERE id = ?`,
                [id]
            )) as [any[], any];
            if (existing.length === 0) {
                throw new ApiErrorResponse(
                    404,
                    null,
                    "Service request not found."
                );
            }

            await connection.query(
                `INSERT INTO servicings (service_request_id, dispatch_date, servicing_company_id, challan_no, courier_details, status)
             VALUES (?, ?, ?, ?, ?, 'Servicing')`,
                [
                    id,
                    dispatch_date,
                    servicing_company_id,
                    challan_no || null,
                    courier_details || null,
                ]
            );

            await connection.query(
                `UPDATE service_requests SET 
                status = 'Servicing', 
                dispatch_date = ?, 
                servicing_company_id = ?, 
                challan_no = ?, 
                courier_details = ?, 
                is_sent_for_servicing = 1,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?`,
                [
                    dispatch_date,
                    servicing_company_id,
                    challan_no || null,
                    courier_details || null,
                    id,
                ]
            );

            if (Array.isArray(items) && items.length > 0) {
                for (const item of items) {
                    await connection.query(
                        `UPDATE service_request_items SET 
                        sent_for_servicing = ?, 
                        servicing_problem_description = ? 
                    WHERE id = ? AND service_request_id = ?`,
                        [
                            item.sent_for_servicing ? 1 : 0,
                            item.servicing_problem_description || null,
                            item.id,
                            id,
                        ]
                    );
                }
            }

            await connection.commit();
            return new ApiResponse(
                200,
                null,
                "Sent for servicing successfully"
            ).send(res);
        } catch (error: any) {
            await connection.rollback();
            throw new ApiErrorResponse(
                500,
                null,
                "Failed to send for servicing: " + error.message
            );
        } finally {
            connection.release();
        }
    }
);

export const getCustomerByMobile = asyncHandler(
    async (req: Request, res: Response) => {
        const mobile =
            typeof req.params.mobile === "string"
                ? req.params.mobile.trim()
                : "";
        if (!mobile) {
            throw new ApiErrorResponse(400, null, "Mobile number is required.");
        }

        const [rows] = (await pool.query(
            `SELECT customer_name, customer_address 
             FROM service_requests 
             WHERE customer_mobile = ? 
             ORDER BY id DESC 
             LIMIT 1`,
            [mobile]
        )) as [any[], any];

        if (rows.length === 0) {
            throw new ApiErrorResponse(
                404,
                null,
                "No past records found for this mobile number."
            );
        }

        return new ApiResponse(
            200,
            rows[0],
            "Customer details retrieved successfully"
        ).send(res);
    }
);
