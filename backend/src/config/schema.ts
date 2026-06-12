import { Database } from "node-sqlite3-wasm";
import bcrypt from "bcryptjs";

export function initializeDatabase(database: Database): void {
    // users
    database.run(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            email TEXT UNIQUE,
            role TEXT DEFAULT 'user',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // service_requests
    database.run(`
        CREATE TABLE IF NOT EXISTS service_requests (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            customer_name TEXT NOT NULL,
            customer_mobile TEXT NOT NULL,
            customer_address TEXT NOT NULL,
            device_type TEXT NOT NULL DEFAULT 'Laptop',
            brand_model TEXT NOT NULL,
            serial_number TEXT,
            problem_description TEXT,
            estimated_delivery_date TEXT,
            estimated_cost REAL,
            status TEXT DEFAULT 'Received',
            cost REAL,
            is_solved INTEGER,
            returned_items TEXT,
            new_parts TEXT,
            created_by INTEGER,
            product_image TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
        )
    `);

    try {
        database.run(
            "ALTER TABLE service_requests ADD COLUMN product_image TEXT"
        );
        database.run(
            "ALTER TABLE service_requests ADD COLUMN estimated_delivery_date TEXT"
        );
        database.run(
            "ALTER TABLE service_requests ADD COLUMN estimated_cost REAL"
        );
        database.run(
            "ALTER TABLE service_requests ADD COLUMN dispatch_date TEXT"
        );
        database.run(
            "ALTER TABLE service_requests ADD COLUMN servicing_company_id INTEGER"
        );
        database.run("ALTER TABLE service_requests ADD COLUMN challan_no TEXT");
        database.run(
            "ALTER TABLE service_requests ADD COLUMN courier_details TEXT"
        );
        database.run(
            "ALTER TABLE service_requests ADD COLUMN is_sent_for_servicing INTEGER DEFAULT 0"
        );
        database.run(
            "ALTER TABLE service_requests ADD COLUMN delivery_date TEXT"
        );
        database.run(
            "ALTER TABLE service_requests ADD COLUMN is_warranty INTEGER DEFAULT 0"
        );
    } catch (error) {}

    // service_request_items
    database.run(`
        CREATE TABLE IF NOT EXISTS service_request_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            service_request_id INTEGER NOT NULL,
            item_name TEXT NOT NULL,
            item_description TEXT,
            sent_for_servicing INTEGER DEFAULT 0,
            servicing_problem_description TEXT,
            is_warranty INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (service_request_id) REFERENCES service_requests(id) ON DELETE CASCADE
        )
    `);

    try {
        database.run(
            "ALTER TABLE service_request_items ADD COLUMN sent_for_servicing INTEGER DEFAULT 0"
        );
    } catch (error) {}

    try {
        database.run(
            "ALTER TABLE service_request_items ADD COLUMN servicing_problem_description TEXT"
        );
    } catch (error) {}

    try {
        database.run(
            "ALTER TABLE service_request_items ADD COLUMN is_warranty INTEGER DEFAULT 0"
        );
    } catch (error) {}

    // device_types
    database.run(`
        CREATE TABLE IF NOT EXISTS device_types (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // accessories
    database.run(`
        CREATE TABLE IF NOT EXISTS accessories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // companies
    database.run(`
        CREATE TABLE IF NOT EXISTS companies (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE NOT NULL,
            mobile TEXT,
            address TEXT,
            status TEXT DEFAULT 'active',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    try {
        database.run(
            "ALTER TABLE companies ADD COLUMN status TEXT DEFAULT 'active'"
        );
    } catch (error) {}

    // servicings
    database.run(`
        CREATE TABLE IF NOT EXISTS servicings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            service_request_id INTEGER NOT NULL,
            dispatch_date TEXT NOT NULL,
            servicing_company_id INTEGER NOT NULL,
            challan_no TEXT,
            courier_details TEXT,
            status TEXT DEFAULT 'Servicing',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (service_request_id) REFERENCES service_requests(id) ON DELETE CASCADE,
            FOREIGN KEY (servicing_company_id) REFERENCES companies(id) ON DELETE CASCADE
        )
    `);

    // ── Seed default device types ───────────────────────────────────────────
    const dtCount =
        (database.get("SELECT COUNT(*) as count FROM device_types") as any)
            ?.count ?? 0;
    if (dtCount === 0) {
        const defaultTypes = [
            "Laptop",
            "Desktop",
            "All-in-One",
            "MacBook",
            "iMac",
            "Tablet",
            "Other",
        ];
        for (const type of defaultTypes) {
            database.run(
                "INSERT OR IGNORE INTO device_types (name) VALUES (?)",
                [type]
            );
        }
    }

    const accCount =
        (database.get("SELECT COUNT(*) as count FROM accessories") as any)
            ?.count ?? 0;
    if (accCount === 0) {
        const defaultAccessories = [
            "Charger",
            "Laptop Bag",
            "Mouse",
            "Power Cable",
            "Battery",
            "HDMI Cable",
            "Keyboard",
        ];
        for (const acc of defaultAccessories) {
            database.run(
                "INSERT OR IGNORE INTO accessories (name) VALUES (?)",
                [acc]
            );
        }
    }

    const userCount =
        (database.get("SELECT COUNT(*) as count FROM users") as any)?.count ??
        0;
    if (userCount === 0) {
        const salt = bcrypt.genSaltSync(10);
        const hashedPassword = bcrypt.hashSync("12345678", salt);
        database.run(
            "INSERT INTO users (username, password, email, role) VALUES (?, ?, ?, ?)",
            ["admin", hashedPassword, "admin@example.com", "admin"]
        );
    }

    // Cleanup/Update existing servicings records that are completed/delivered/repaired
    try {
        database.run(`
            UPDATE servicings 
            SET status = 'Completed', updated_at = CURRENT_TIMESTAMP 
            WHERE status = 'Servicing' AND service_request_id IN (
                SELECT id FROM service_requests WHERE status IN ('Completed', 'Delivered', 'Repaired', 'Unrepairable')
            )
        `);
    } catch (error) {
        console.error(
            "Failed to run database cleanup for completed servicings:",
            error
        );
    }
}
