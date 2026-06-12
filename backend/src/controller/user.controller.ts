import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import pool from "../config/db.js";
import dotenv from "dotenv";
import asyncHandler from "../utils/asyncHandler.js";
import ApiResponse from "../utils/ApiResponse.js";
import ApiErrorResponse from "../utils/ApiErrorResponse.js";
import type { Request, Response } from "express";
import type { CustomRequest } from "../middleware/auth.middleware.js";

dotenv.config();

const JWT_SECRET =
    process.env.JWT_SECRET ||
    "super_secret_key_for_service_management_app_2026";

export const login = asyncHandler(async (req: Request, res: Response) => {
    const { username, password } = req.body;

    if (!username || !password) {
        throw new ApiErrorResponse(400, null, "Username and password are required");
    }

    const [users] = (await pool.query("SELECT * FROM users WHERE username = ?", [username])) as [any[], any];

    if (users.length === 0) {
        throw new ApiErrorResponse(401, null, "Invalid username or password");
    }

    const user = users[0];

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
        throw new ApiErrorResponse(401, null, "Invalid username or password");
    }

    const token = jwt.sign(
        { id: user.id, username: user.username, email: user.email, role: user.role },
        JWT_SECRET,
        { expiresIn: "24h" }
    );

    return new ApiResponse(200, {
        token,
        user: { id: user.id, username: user.username, email: user.email, role: user.role },
    }, "Login successful").send(res);
});

export const register = asyncHandler(async (req: Request, res: Response) => {
    const { username, password, email, role } = req.body;

    if (!username || !password) {
        throw new ApiErrorResponse(400, null, "Username and password are required");
    }

    const [existingUsers] = (await pool.query(
        "SELECT * FROM users WHERE username = ?",
        [username]
    )) as [any[], any];
    
    if (existingUsers.length > 0) {
        throw new ApiErrorResponse(409, null, "Username is already taken");
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const userEmail = email || null;
    const userRole = role || "user";

    const [result] = (await pool.query(
        "INSERT INTO users (username, password, email, role) VALUES (?, ?, ?, ?)",
        [username, hashedPassword, userEmail, userRole]
    )) as [any, any];

    return new ApiResponse(201, {
        user: { id: result.insertId, username, email: userEmail, role: userRole },
    }, "User registered successfully").send(res);
});

export const me = asyncHandler(async (req: Request, res: Response) => {
    const customReq = req as CustomRequest;
    return new ApiResponse(200, { user: customReq.user }, "User profile retrieved").send(res);
});

export const getAllUsers = asyncHandler(async (req: Request, res: Response) => {
    const [users] = (await pool.query(
        "SELECT id, username, email, role, created_at, updated_at FROM users"
    )) as [any[], any];
    return new ApiResponse(200, users, "Users retrieved successfully").send(res);
});

export const updateUser = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { username, email, role } = req.body;

    if (!username) {
        throw new ApiErrorResponse(400, null, "Username is required");
    }

    const [existingUsers] = (await pool.query(
        "SELECT * FROM users WHERE username = ? AND id != ?",
        [username, id]
    )) as [any[], any];

    if (existingUsers.length > 0) {
        throw new ApiErrorResponse(409, null, "Username is already taken");
    }

    await pool.query(
        "UPDATE users SET username = ?, email = ?, role = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        [username, email || null, role || "user", id]
    );

    return new ApiResponse(200, {
        id: Number(id),
        username,
        email: email || null,
        role: role || "user"
    }, "User updated successfully").send(res);
});

export const deleteUser = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const customReq = req as CustomRequest;

    if (customReq.user && customReq.user.id === Number(id)) {
        throw new ApiErrorResponse(400, null, "You cannot delete your own account");
    }

    const [result] = (await pool.query("DELETE FROM users WHERE id = ?", [id])) as [any, any];

    if (result.affectedRows === 0) {
        throw new ApiErrorResponse(404, null, "User not found");
    }

    return new ApiResponse(200, null, "User deleted successfully").send(res);
});

export const changePassword = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { password } = req.body;

    if (!password || password.length < 6) {
        throw new ApiErrorResponse(400, null, "Password must be at least 6 characters long");
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const [result] = (await pool.query(
        "UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        [hashedPassword, id]
    )) as [any, any];

    if (result.affectedRows === 0) {
        throw new ApiErrorResponse(404, null, "User not found");
    }

    return new ApiResponse(200, null, "Password changed successfully").send(res);
});
