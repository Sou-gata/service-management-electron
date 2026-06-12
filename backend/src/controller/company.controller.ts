import pool from "../config/db.js";
import asyncHandler from "../utils/asyncHandler.js";
import ApiResponse from "../utils/ApiResponse.js";
import ApiErrorResponse from "../utils/ApiErrorResponse.js";
import type { Request, Response } from "express";

export const getCompanies = asyncHandler(async (req: Request, res: Response) => {
    const [rows] = await pool.query("SELECT * FROM companies ORDER BY name ASC") as [any[], any];
    return new ApiResponse(200, rows, "Companies retrieved successfully").send(res);
});

export const createCompany = asyncHandler(async (req: Request, res: Response) => {
    const { name, mobile, address, status } = req.body;
    if (!name || !name.trim()) {
        throw new ApiErrorResponse(400, null, "Company name is required");
    }
    const cleanName = name.trim();
    const cleanMobile = mobile ? mobile.trim() : "";
    const cleanAddress = address ? address.trim() : "";
    const cleanStatus = status === "inactive" ? "inactive" : "active";

    const [existing] = await pool.query("SELECT * FROM companies WHERE LOWER(name) = ?", [cleanName.toLowerCase()]) as [any[], any];
    if (existing.length > 0) {
        throw new ApiErrorResponse(400, null, "Company name already exists");
    }

    const [result] = await pool.query(
        "INSERT INTO companies (name, mobile, address, status) VALUES (?, ?, ?, ?)",
        [cleanName, cleanMobile, cleanAddress, cleanStatus]
    ) as [any, any];

    return new ApiResponse(201, {
        id: result.insertId,
        name: cleanName,
        mobile: cleanMobile,
        address: cleanAddress,
        status: cleanStatus
    }, "Company created successfully").send(res);
});

export const updateCompany = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { name, mobile, address, status } = req.body;
    if (!name || !name.trim()) {
        throw new ApiErrorResponse(400, null, "Company name is required");
    }
    const cleanName = name.trim();
    const cleanMobile = mobile ? mobile.trim() : "";
    const cleanAddress = address ? address.trim() : "";
    const cleanStatus = status === "inactive" ? "inactive" : "active";

    const [existing] = await pool.query("SELECT * FROM companies WHERE LOWER(name) = ? AND id != ?", [cleanName.toLowerCase(), id]) as [any[], any];
    if (existing.length > 0) {
        throw new ApiErrorResponse(400, null, "Company name already exists");
    }

    const [result] = await pool.query(
        "UPDATE companies SET name = ?, mobile = ?, address = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        [cleanName, cleanMobile, cleanAddress, cleanStatus, id]
    ) as [any, any];

    if (result.affectedRows === 0) {
        throw new ApiErrorResponse(404, null, "Company not found");
    }

    return new ApiResponse(200, {
        id: Number(id),
        name: cleanName,
        mobile: cleanMobile,
        address: cleanAddress,
        status: cleanStatus
    }, "Company updated successfully").send(res);
});
