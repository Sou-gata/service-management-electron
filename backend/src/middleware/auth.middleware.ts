import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import type { Request, Response, NextFunction } from "express";
import ApiErrorResponse from "../utils/ApiErrorResponse.js";

dotenv.config();

export interface CustomRequest extends Request {
    user?: {
        id: number;
        username: string;
        email: string | null;
        role: string;
    };
}

export function verifyToken(
    req: CustomRequest,
    res: Response,
    next: NextFunction
) {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
        return new ApiErrorResponse(401, null, "Access token is required").send(
            res
        );
    }

    try {
        const secret =
            process.env.JWT_SECRET ||
            "super_secret_key_for_service_management_app_2026";
        const decoded = jwt.verify(token, secret) as any;

        req.user = {
            id: decoded.id,
            username: decoded.username,
            email: decoded.email,
            role: decoded.role,
        };

        next();
    } catch (error: any) {
        console.error("JWT Verification failed:", error.message);
        return new ApiErrorResponse(
            403,
            null,
            "Invalid or expired access token",
            true
        ).send(res);
    }
}

export function isAdmin(req: CustomRequest, res: Response, next: NextFunction) {
    if (req.user && req.user.role === "admin") {
        next();
    } else {
        return new ApiErrorResponse(
            403,
            null,
            "Access denied. Administrator privileges required."
        ).send(res);
    }
}
