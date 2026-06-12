import { Database } from "node-sqlite3-wasm";
import { applyUpdates } from "./updates.js";

export function initializeDatabase(database: Database): void {
    // users
    database.run(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL DEFAULT '',
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

    // Run table alterations, seeding, and update queries
    applyUpdates(database);
}
