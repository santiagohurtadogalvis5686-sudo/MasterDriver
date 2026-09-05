const sqlite3 = require("sqlite3").verbose();
const fs = require("fs");
const path = require("path");

// Rutas absolutas e independientes para las dos bases de datos
const DB_USERS_PATH = path.resolve(__dirname, "..", "database_users.db");
const DB_VEHICLES_PATH = path.resolve(__dirname, "..", "database_vehicles.db");
const SCHEMA_PATH = path.resolve(__dirname, "schema.sql");

// Instancias independientes de conexión SQLite
const dbUsers = new sqlite3.Database(DB_USERS_PATH, (err) => {
    if (err) console.error("Error conectando con DB Users:", err.message);
});

const dbVehicles = new sqlite3.Database(DB_VEHICLES_PATH, (err) => {
    if (err) console.error("Error conectando con DB Vehicles:", err.message);
});

// Helper generador de Promesas para una instancia SQLite
function createQueryHelpers(dbInstance) {
    return {
        run: (sql, params = []) => new Promise((resolve, reject) => {
            dbInstance.run(sql, params, function (err) {
                if (err) return reject(err);
                resolve({ lastID: this.lastID, changes: this.changes });
            });
        }),
        get: (sql, params = []) => new Promise((resolve, reject) => {
            dbInstance.get(sql, params, (err, row) => {
                if (err) return reject(err);
                resolve(row);
            });
        }),
        all: (sql, params = []) => new Promise((resolve, reject) => {
            dbInstance.all(sql, params, (err, rows) => {
                if (err) return reject(err);
                resolve(rows);
            });
        }),
        exec: (sql) => new Promise((resolve, reject) => {
            dbInstance.exec(sql, (err) => {
                if (err) return reject(err);
                resolve();
            });
        })
    };
}

const usersDb = createQueryHelpers(dbUsers);
const vehiclesDb = createQueryHelpers(dbVehicles);

async function initializeDatabase() {
    try {
        console.log("Inicializando las dos bases de datos independientes...");

        await usersDb.run("PRAGMA foreign_keys = ON");
        await vehiclesDb.run("PRAGMA foreign_keys = ON");

        const schema = fs.readFileSync(SCHEMA_PATH, "utf8");
        const schemaStatements = schema.split(";").filter(stmt => stmt.trim().length > 0);

        for (const statement of schemaStatements) {
            const trimmed = statement.trim();
            if (trimmed.includes("users") || trimmed.includes("sessions")) {
                await usersDb.exec(trimmed);
            } else if (trimmed.includes("vehicles") || trimmed.includes("reservations") || trimmed.includes("idx_")) {
                await vehiclesDb.exec(trimmed);
            }
        }

        console.log("Bases de datos 'database_users.db' y 'database_vehicles.db' creadas/verificadas.");
    } catch (error) {
        console.error("Error inicializando las bases de datos:", error);
        throw error;
    }
}

function closeDatabase() {
    return Promise.all([
        new Promise((resolve, reject) => dbUsers.close((err) => err ? reject(err) : resolve())),
        new Promise((resolve, reject) => dbVehicles.close((err) => err ? reject(err) : resolve()))
    ]);
}

module.exports = {
    usersDb,
    vehiclesDb,
    initializeDatabase,
    closeDatabase
};