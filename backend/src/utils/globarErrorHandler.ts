import type { Request, Response, NextFunction } from "express";
import ApiErrorResponse from "./ApiErrorResponse.js";

const globalErrorHandler = (
    err: any,
    req: Request,
    res: Response,
    next: NextFunction
) => {
    const statusCode = err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    const errorResponse = new ApiErrorResponse(
        statusCode,
        err.data || null,
        message,
        err.sessionExpired || false
    );
    console.log(errorResponse);

    return errorResponse.send(res);
};

export default globalErrorHandler;
