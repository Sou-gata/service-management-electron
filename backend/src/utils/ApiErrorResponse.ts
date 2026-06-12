import type { Response } from "express";
import ApiResponse from "./ApiResponse.js";

/**
 * Structured error response container.
 */
class ApiErrorResponse extends ApiResponse {
    sessionExpired: boolean;

    constructor(
        statusCode: number,
        data: any = {},
        message: string = "Something went wrong",
        sessionExpired: boolean = false
    ) {
        super(statusCode, data, message);
        this.success = false;
        this.sessionExpired = sessionExpired;
    }
    
    override send(res: Response) {
        return res.status(this.statusCode).json({
            success: this.success,
            message: this.message,
            data: this.data,
            ...(this.sessionExpired !== undefined && { 
                sessionExpired: this.sessionExpired,
                seassonExpired: this.sessionExpired
            }),
        });
    }
}

export default ApiErrorResponse;
