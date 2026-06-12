import pool from "../config/db.js";
import asyncHandler from "../utils/asyncHandler.js";
import ApiResponse from "../utils/ApiResponse.js";
import ApiErrorResponse from "../utils/ApiErrorResponse.js";
import type { Request, Response } from "express";

// === Device Types Controller ===

export const getDeviceTypes = asyncHandler(async (req: Request, res: Response) => {
    const [rows] = await pool.query("SELECT * FROM device_types ORDER BY name ASC") as [any[], any];
    return new ApiResponse(200, rows, "Device types retrieved successfully").send(res);
});

export const createDeviceType = asyncHandler(async (req: Request, res: Response) => {
    const { name } = req.body;
    if (!name || !name.trim()) {
        throw new ApiErrorResponse(400, null, "Name is required");
    }
    const cleanName = name.trim();

    const [existing] = await pool.query("SELECT * FROM device_types WHERE LOWER(name) = ?", [cleanName.toLowerCase()]) as [any[], any];
    if (existing.length > 0) {
        throw new ApiErrorResponse(400, null, "Device type already exists");
    }

    const [result] = await pool.query("INSERT INTO device_types (name) VALUES (?)", [cleanName]) as [any, any];
    return new ApiResponse(201, { id: result.insertId, name: cleanName }, "Device type created successfully").send(res);
});

export const updateDeviceType = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { name } = req.body;
    if (!name || !name.trim()) {
        throw new ApiErrorResponse(400, null, "Name is required");
    }
    const cleanName = name.trim();

    const [existing] = await pool.query("SELECT * FROM device_types WHERE LOWER(name) = ? AND id != ?", [cleanName.toLowerCase(), id]) as [any[], any];
    if (existing.length > 0) {
        throw new ApiErrorResponse(400, null, "Device type already exists");
    }

    const [result] = await pool.query("UPDATE device_types SET name = ? WHERE id = ?", [cleanName, id]) as [any, any];
    if (result.affectedRows === 0) {
        throw new ApiErrorResponse(404, null, "Device type not found");
    }

    return new ApiResponse(200, { id: Number(id), name: cleanName }, "Device type updated successfully").send(res);
});

export const deleteDeviceType = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const [result] = await pool.query("DELETE FROM device_types WHERE id = ?", [id]) as [any, any];
    if (result.affectedRows === 0) {
        throw new ApiErrorResponse(404, null, "Device type not found");
    }
    return new ApiResponse(200, null, "Device type deleted successfully").send(res);
});


// === Accessories Controller ===

export const getAccessories = asyncHandler(async (req: Request, res: Response) => {
    const [rows] = await pool.query("SELECT * FROM accessories ORDER BY name ASC") as [any[], any];
    return new ApiResponse(200, rows, "Accessories retrieved successfully").send(res);
});

export const createAccessory = asyncHandler(async (req: Request, res: Response) => {
    const { name } = req.body;
    if (!name || !name.trim()) {
        throw new ApiErrorResponse(400, null, "Name is required");
    }
    const cleanName = name.trim();

    const [existing] = await pool.query("SELECT * FROM accessories WHERE LOWER(name) = ?", [cleanName.toLowerCase()]) as [any[], any];
    if (existing.length > 0) {
        throw new ApiErrorResponse(400, null, "Accessory already exists");
    }

    const [result] = await pool.query("INSERT INTO accessories (name) VALUES (?)", [cleanName]) as [any, any];
    return new ApiResponse(201, { id: result.insertId, name: cleanName }, "Accessory created successfully").send(res);
});

export const updateAccessory = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { name } = req.body;
    if (!name || !name.trim()) {
        throw new ApiErrorResponse(400, null, "Name is required");
    }
    const cleanName = name.trim();

    const [existing] = await pool.query("SELECT * FROM accessories WHERE LOWER(name) = ? AND id != ?", [cleanName.toLowerCase(), id]) as [any[], any];
    if (existing.length > 0) {
        throw new ApiErrorResponse(400, null, "Accessory already exists");
    }

    const [result] = await pool.query("UPDATE accessories SET name = ? WHERE id = ?", [cleanName, id]) as [any, any];
    if (result.affectedRows === 0) {
        throw new ApiErrorResponse(404, null, "Accessory not found");
    }

    return new ApiResponse(200, { id: Number(id), name: cleanName }, "Accessory updated successfully").send(res);
});

export const deleteAccessory = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const [result] = await pool.query("DELETE FROM accessories WHERE id = ?", [id]) as [any, any];
    if (result.affectedRows === 0) {
        throw new ApiErrorResponse(404, null, "Accessory not found");
    }
    return new ApiResponse(200, null, "Accessory deleted successfully").send(res);
});
