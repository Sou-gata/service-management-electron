import { Database } from "node-sqlite3-wasm";
import bcrypt from "bcryptjs";

export function applyUpdates(database: Database): void {
    // Seed default device types
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
}
