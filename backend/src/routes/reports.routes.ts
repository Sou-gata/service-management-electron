import express from "express";
import {
    getReportStats,
    getAvailableYears,
    downloadReportPdf
} from "../controller/reports.controller.js";
import { verifyToken } from "../middleware/auth.middleware.js";

const router = express.Router();

router.use(verifyToken as any);

router.get("/stats", getReportStats);
router.get("/years", getAvailableYears);
router.get("/pdf", downloadReportPdf);

export default router;
