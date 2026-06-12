import type { Response } from "express";

class ApiResponse {
    message: string;
    data: any;
    statusCode: number;
    success: boolean;

    constructor(statusCode: number, data: any, message: string = "Success") {
        this.message = message;
        this.data = data;
        this.statusCode = statusCode;
        this.success = true;
    }

    send(res: Response) {
        return res.status(this.statusCode).json({
            success: this.success,
            message: this.message,
            data: this.data,
        });
    }
}

export default ApiResponse;
