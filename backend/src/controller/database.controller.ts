import pool, { closeDb, getDbPath } from "../config/db.js";
import asyncHandler from "../utils/asyncHandler.js";
import ApiResponse from "../utils/ApiResponse.js";
import ApiErrorResponse from "../utils/ApiErrorResponse.js";
import type { Request, Response } from "express";
import fs from "fs";
import path from "path";
import { Database } from "node-sqlite3-wasm";

/**
 * Download a backup copy of the SQLite database
 */
export const backupDatabase = asyncHandler(
    async (req: Request, res: Response) => {
        const dbPath = getDbPath();
        if (!fs.existsSync(dbPath)) {
            throw new ApiErrorResponse(404, null, "Database file not found");
        }

        const dateStr = new Date()
            .toISOString()
            .slice(0, 19)
            .replace(/[:T]/g, "-");
        const downloadName = `service_management_backup_${dateStr}.db`;

        res.download(dbPath, downloadName, (err) => {
            if (err) {
                console.error("[Backup] Download error:", err);
            }
        });
    }
);

/**
 * Restore database from an uploaded backup file
 */
export const restoreDatabase = asyncHandler(
    async (req: Request, res: Response) => {
        const file = (req as any).file;
        if (!file) {
            throw new ApiErrorResponse(400, null, "No backup file uploaded");
        }

        const tempFilePath = file.path;
        const dbPath = getDbPath();
        const backupDbPath = `${dbPath}.bak`;

        try {
            console.log(`[Restore] Starting restore from: ${tempFilePath}`);

            // 0. Validate the backup file before doing any changes
            let backupDbInstance: Database | null = null;
            try {
                backupDbInstance = new Database(tempFilePath);
                
                // Get active database schema (tables)
                const [activeTables] = await pool.query(
                    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
                );

                if (!activeTables || activeTables.length === 0) {
                    throw new Error("Active database has no tables to compare against.");
                }

                for (const tableRow of activeTables) {
                    const tableName = tableRow.name;
                    
                    // Check if table exists in backup
                    const backupTableCheck = backupDbInstance.get(
                        "SELECT name FROM sqlite_master WHERE type='table' AND name = ?",
                        [tableName]
                    ) as { name: string } | undefined;

                    if (!backupTableCheck) {
                        throw new Error(`Table '${tableName}' is missing from the backup file.`);
                    }

                    // Get columns of the table in active database
                    const [activeColumns] = await pool.query(`PRAGMA table_info(${tableName})`);
                    const activeColNames = new Set((activeColumns as { name: string }[]).map(c => c.name));

                    // Get columns of the table in backup database
                    const backupColumns = backupDbInstance.all(`PRAGMA table_info(${tableName})`) as { name: string }[];
                    const backupColNames = new Set(backupColumns.map(c => c.name));

                    // Check that all active columns exist in the backup table
                    for (const colName of activeColNames) {
                        if (!backupColNames.has(colName)) {
                            throw new Error(
                                `Column '${colName}' in table '${tableName}' is missing from the backup file.`
                            );
                        }
                    }
                }
            } catch (validationError: any) {
                throw new Error(`Invalid backup file: ${validationError.message}`);
            } finally {
                if (backupDbInstance) {
                    try {
                        backupDbInstance.close();
                    } catch (_) {}
                }
            }

            // 1. Create a safety backup of the active database file if it exists
            if (fs.existsSync(dbPath)) {
                console.log(
                    `[Restore] Creating safety backup of active database at ${backupDbPath}`
                );
                fs.copyFileSync(dbPath, backupDbPath);
            }

            // 2. Close active connection so database file is not locked
            console.log("[Restore] Closing database connection...");
            closeDb();

            // 3. Delete WAL and SHM files to prevent recovery conflicts/stale transactions
            const walPath = `${dbPath}-wal`;
            const shmPath = `${dbPath}-shm`;

            if (fs.existsSync(walPath)) {
                console.log(`[Restore] Removing WAL file at ${walPath}`);
                try {
                    fs.unlinkSync(walPath);
                } catch (e: any) {
                    console.error(
                        `[Restore] Failed to delete WAL file: ${e.message}`
                    );
                }
            }
            if (fs.existsSync(shmPath)) {
                console.log(`[Restore] Removing SHM file at ${shmPath}`);
                try {
                    fs.unlinkSync(shmPath);
                } catch (e: any) {
                    console.error(
                        `[Restore] Failed to delete SHM file: ${e.message}`
                    );
                }
            }

            // 4. Overwrite active database file with the uploaded backup
            console.log(`[Restore] Restoring database file to ${dbPath}`);
            fs.copyFileSync(tempFilePath, dbPath);

            // 5. Cleanup backup & temp files on success
            if (fs.existsSync(backupDbPath)) {
                fs.unlinkSync(backupDbPath);
            }
            fs.unlinkSync(tempFilePath);

            console.log("[Restore] Database restored successfully");
            return new ApiResponse(
                200,
                null,
                "Database restored successfully"
            ).send(res);
        } catch (error: any) {
            console.error(
                "[Restore] Restore failed, rolling back to previous database file:",
                error
            );

            // Rollback: copy backupDbPath back to dbPath
            if (fs.existsSync(backupDbPath)) {
                try {
                    fs.copyFileSync(backupDbPath, dbPath);
                    fs.unlinkSync(backupDbPath);
                    console.log("[Restore] Rollback completed successfully");
                } catch (rollbackError: any) {
                    console.error(
                        "[Restore] Critical: Rollback failed!",
                        rollbackError.message
                    );
                }
            }

            // Cleanup uploaded temp file
            if (fs.existsSync(tempFilePath)) {
                try {
                    fs.unlinkSync(tempFilePath);
                } catch (_) {}
            }

            const status = error.message.startsWith("Invalid backup file") ? 400 : 500;
            const errMsg = error.message.startsWith("Invalid backup file")
                ? error.message
                : `Database restore failed: ${error.message}`;

            throw new ApiErrorResponse(
                status,
                null,
                errMsg
            );
        }
    }
);
