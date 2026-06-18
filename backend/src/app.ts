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

// Serve Static Frontend SPA if compiled/present
const pathsToCheck = [
    path.join(__dirname, "..", "frontend"),
    path.join(process.cwd(), "frontend"),
    path.join(process.cwd(), "dist", "frontend"),
];
let targetFrontend = "";
for (const p of pathsToCheck) {
    if (fs.existsSync(p) && fs.existsSync(path.join(p, "index.html"))) {
        targetFrontend = p;
        break;
    }
}

if (targetFrontend) {
    console.log(`[Server] Serving frontend static assets from: ${targetFrontend}`);
    app.use(express.static(targetFrontend));
    app.get("*", (req: Request, res: Response, next) => {
        if (req.path.startsWith("/api/")) {
            return next();
        }
        res.sendFile(path.join(targetFrontend, "index.html"));
    });
}

app.use(globalErrorHandler);

export default app;
