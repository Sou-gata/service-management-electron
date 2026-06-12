import express from "express";
import type { Request, Response } from "express";
import cors from "cors";
import userRoutes from "./routes/user.routes.js";
import serviceRequestRoutes from "./routes/serviceRequest.routes.js";
import configRoutes from "./routes/config.routes.js";
import reportsRoutes from "./routes/reports.routes.js";
import databaseRoutes from "./routes/database.routes.js";
import companyRoutes from "./routes/company.routes.js";
import globalErrorHandler from "./utils/globarErrorHandler.js";
import path from "path";
import fs from "fs";

const app = express();

app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Serve Static Uploads
const uploadsPath =
    process.env.UPLOADS_PATH || path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsPath)) {
    fs.mkdirSync(uploadsPath, { recursive: true });
}
app.use("/uploads", express.static(uploadsPath));

// API Routes
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/service-requests", serviceRequestRoutes);
app.use("/api/v1/config", configRoutes);
app.use("/api/v1/reports", reportsRoutes);
app.use("/api/v1/database", databaseRoutes);
app.use("/api/v1/companies", companyRoutes);

// Health check
app.get("/api/health", (req: Request, res: Response) => {
    res.json({
        status: "OK",
        message: "Service Management API is running",
        timestamp: new Date(),
    });
});

app.use(globalErrorHandler);

export default app;
