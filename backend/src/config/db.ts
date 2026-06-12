import { Database } from "node-sqlite3-wasm";
import path from "path";
import fs from "fs";
import { initializeDatabase } from "./schema.js";

function resolveDbPath(): string {
    if (process.env.DB_PATH) {
        return process.env.DB_PATH;
    }
    return path.join(process.cwd(), "service_management.db");
}

let db: Database | null = null;

function getDb(): Database {
    if (!db) {
        const dbPath = resolveDbPath();

        const dir = path.dirname(dbPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        console.log(`[DB] Opening SQLite database at: ${dbPath}`);
        db = new Database(dbPath);

        db.run("PRAGMA journal_mode = WAL");
        db.run("PRAGMA synchronous = NORMAL");
        db.run("PRAGMA foreign_keys = ON");
    }
    return db;
}

export async function testConnection(): Promise<boolean> {
    try {
        initializeDatabase(getDb());
        return true;
    } catch (error: any) {
        console.error("[DB] Initialization failed:", error.message);
        return false;
    }
}

class DbPool {
    async query(sql: string, params: any[] = []): Promise<[any, any]> {
        const database = getDb();
        const upperSql = sql.trim().toUpperCase();

        if (
            upperSql.startsWith("SELECT") ||
            upperSql.startsWith("PRAGMA") ||
            upperSql.startsWith("SHOW")
        ) {
            const rows = database.all(sql, params) as any[];
            return [rows, null];
        } else {
            database.run(sql, params);
            const lastId =
                (database.get("SELECT last_insert_rowid() as id") as any)?.id ??
                0;
            const changes =
                (database.get("SELECT changes() as c") as any)?.c ?? 0;
            const info = {
                insertId: lastId,
                affectedRows: changes,
                changedRows: changes,
            };
            return [info, null];
        }
    }

    async getConnection(): Promise<DbConnection> {
        return new DbConnection();
    }
}

class DbConnection {
    private active = false;

    async query(sql: string, params: any[] = []): Promise<[any, any]> {
        return pool.query(sql, params);
    }

    async beginTransaction(): Promise<void> {
        getDb().run("BEGIN");
        this.active = true;
    }

    async commit(): Promise<void> {
        getDb().run("COMMIT");
        this.active = false;
    }

    async rollback(): Promise<void> {
        try {
            getDb().run("ROLLBACK");
        } catch (_) {}
        this.active = false;
    }

    release(): void {
        if (this.active) {
            try {
                getDb().run("ROLLBACK");
            } catch (_) {}
            this.active = false;
        }
    }
}

export function closeDb(): void {
    if (db) {
        db.close();
        db = null;
        console.log("[DB] Database closed.");
    }
}

export function getDbPath(): string {
    return resolveDbPath();
}

const pool = new DbPool();
export default pool;
