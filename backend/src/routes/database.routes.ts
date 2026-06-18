import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { backupDatabase, restoreDatabase, resetDatabase } from "../controller/database.controller.js";
import { verifyToken, isAdmin } from "../middleware/auth.middleware.js";

const router = express.Router();

const dbStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const tempPath = path.join(process.cwd(), "temp");
        if (!fs.existsSync(tempPath)) {
            fs.mkdirSync(tempPath, { recursive: true });
        }
        cb(null, tempPath);
    },
    filename: (req, file, cb) => {
        cb(null, `restore_temp_${Date.now()}.db`);
    }
});

const upload = multer({
    storage: dbStorage,
    limits: {
        fileSize: 100 * 1024 * 1024 // 100MB
    }
});

// Admin verification middleware is applied to both routes
router.use(verifyToken as any);
router.use(isAdmin as any);

router.get("/backup", backupDatabase);
router.post("/restore", upload.single("backup"), restoreDatabase);
router.post("/reset", resetDatabase);

export default router;
