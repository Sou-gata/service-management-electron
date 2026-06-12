import { Database } from "node-sqlite3-wasm";
import bcrypt from "bcryptjs";

export function applyUpdates(database: Database): void {
    // Alterations in separate try-catch blocks
    try {
        database.run("ALTER TABLE service_requests ADD COLUMN product_image TEXT");
    } catch (error) {}

    try {
        database.run("ALTER TABLE service_requests ADD COLUMN estimated_delivery_date TEXT");
    } catch (error) {}

    try {
        database.run("ALTER TABLE service_requests ADD COLUMN estimated_cost REAL");
    } catch (error) {}

    try {
        database.run("ALTER TABLE service_requests ADD COLUMN dispatch_date TEXT");
    } catch (error) {}

    try {
        database.run("ALTER TABLE service_requests ADD COLUMN servicing_company_id INTEGER");
    } catch (error) {}

    try {
        database.run("ALTER TABLE service_requests ADD COLUMN challan_no TEXT");
    } catch (error) {}

    try {
        database.run("ALTER TABLE service_requests ADD COLUMN courier_details TEXT");
    } catch (error) {}

    try {
        database.run("ALTER TABLE service_requests ADD COLUMN is_sent_for_servicing INTEGER DEFAULT 0");
    } catch (error) {}

    try {
        database.run("ALTER TABLE service_requests ADD COLUMN delivery_date TEXT");
    } catch (error) {}

    try {
        database.run("ALTER TABLE service_requests ADD COLUMN is_warranty INTEGER DEFAULT 0");
    } catch (error) {}

    try {
        database.run("ALTER TABLE users ADD COLUMN name TEXT NOT NULL DEFAULT ''");
    } catch (error) {}

    try {
        database.run("UPDATE users SET name = username WHERE name IS NULL OR name = ''");
    } catch (error) {}

    try {
        database.run("ALTER TABLE service_request_items ADD COLUMN sent_for_servicing INTEGER DEFAULT 0");
    } catch (error) {}

    try {
        database.run("ALTER TABLE service_request_items ADD COLUMN servicing_problem_description TEXT");
    } catch (error) {}

    try {
        database.run("ALTER TABLE service_request_items ADD COLUMN is_warranty INTEGER DEFAULT 0");
    } catch (error) {}

    try {
        database.run("ALTER TABLE companies ADD COLUMN status TEXT DEFAULT 'active'");
    } catch (error) {}

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
            "INSERT INTO users (username, name, password, email, role) VALUES (?, ?, ?, ?, ?)",
            [
                "admin",
                "Administrator",
                hashedPassword,
                "admin@example.com",
                "admin",
            ]
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
