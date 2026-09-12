const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const usersDbPath = path.resolve(__dirname, "../database_users.db");
const vehiclesDbPath = path.resolve(__dirname, "../masterdriver.db");

function connectDb(dbPath) {
    return new sqlite3.Database(dbPath);
}

const usersDbRaw = connectDb(usersDbPath);
const vehiclesDbRaw = connectDb(vehiclesDbPath);

// Helper para convertir callbacks de sqlite3 a Promises
function promisifyDb(db) {
    return {
        run: (sql, params = []) => {
            return new Promise((resolve, reject) => {
                db.run(sql, params, function (err) {
                    if (err) reject(err);
                    else resolve(this);
                });
            });
        },
        get: (sql, params = []) => {
            return new Promise((resolve, reject) => {
                db.get(sql, params, (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                });
            });
        },
        all: (sql, params = []) => {
            return new Promise((resolve, reject) => {
                db.all(sql, params, (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                });
            });
        },
        exec: (sql) => {
            return new Promise((resolve, reject) => {
                db.exec(sql, (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });
        }
    };
}

const usersDb = promisifyDb(usersDbRaw);
const vehiclesDb = promisifyDb(vehiclesDbRaw);

async function initializeDatabase() {
    try {
        // Tablas para usuarios
        await usersDb.exec(`
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nombre TEXT NOT NULL,
                correo TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                telefono TEXT DEFAULT '',
                licencia_frente TEXT DEFAULT NULL,
                licencia_reverso TEXT DEFAULT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS wallets (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER UNIQUE NOT NULL,
                saldo REAL DEFAULT 0.0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS wallet_transactions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                tipo TEXT NOT NULL,
                monto REAL NOT NULL,
                saldo_resultante REAL NOT NULL,
                descripcion TEXT DEFAULT '',
                reservation_id INTEGER DEFAULT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );
        `);

        // Tablas para vehículos y reservas
        await vehiclesDb.exec(`
            CREATE TABLE IF NOT EXISTS vehicles (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                titulo TEXT NOT NULL,
                tipo TEXT NOT NULL,
                marca TEXT NOT NULL,
                modelo TEXT NOT NULL,
                precio REAL NOT NULL,
                whatsapp TEXT NOT NULL,
                descripcion TEXT DEFAULT '',
                fotografias TEXT DEFAULT '[]',
                documentos TEXT DEFAULT '{}',
                condiciones_uso TEXT DEFAULT '[]',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS reservations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                vehicle_id INTEGER NOT NULL,
                fecha_inicio TEXT NOT NULL,
                fecha_fin TEXT NOT NULL,
                total_pago REAL NOT NULL,
                estado TEXT DEFAULT 'pendiente',
                comision_cobrada INTEGER DEFAULT 0,
                editado_por_cliente INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE
            );
        `);

        // Migración 1: Agregar columna created_at a vehicles si la tabla existente no la posee
        try {
            await vehiclesDb.run("ALTER TABLE vehicles ADD COLUMN created_at DATETIME");
            console.log("Migración exitosa: columna 'created_at' añadida a 'vehicles'.");
        } catch (mError) {
            if (!mError.message.includes("duplicate column name")) {
                console.warn("Nota de migración 'created_at' en vehicles:", mError.message);
            }
        }

        // Migración 2: Agregar columna created_at a reservations
        try {
            await vehiclesDb.run("ALTER TABLE reservations ADD COLUMN created_at DATETIME");
            console.log("Migración exitosa: columna 'created_at' añadida a 'reservations'.");
        } catch (mError) {
            if (!mError.message.includes("duplicate column name")) {
                console.warn("Nota de migración 'created_at' en reservations:", mError.message);
            }
        }

        // Migración 3: Agregar columna updated_at a reservations
        try {
            await vehiclesDb.run("ALTER TABLE reservations ADD COLUMN updated_at DATETIME");
            console.log("Migración exitosa: columna 'updated_at' añadida a 'reservations'.");
        } catch (mError) {
            if (!mError.message.includes("duplicate column name")) {
                console.warn("Nota de migración 'updated_at' en reservations:", mError.message);
            }
        }

        // Migración 4: Agregar columna comision_cobrada a reservations
        try {
            await vehiclesDb.run("ALTER TABLE reservations ADD COLUMN comision_cobrada INTEGER DEFAULT 0");
            console.log("Migración exitosa: columna 'comision_cobrada' añadida a 'reservations'.");
        } catch (mError) {
            if (!mError.message.includes("duplicate column name")) {
                console.warn("Nota de migración 'comision_cobrada' en reservations:", mError.message);
            }
        }

        // Migración 5: Agregar columna editado_por_cliente a reservations
        try {
            await vehiclesDb.run("ALTER TABLE reservations ADD COLUMN editado_por_cliente INTEGER DEFAULT 0");
            console.log("Migración exitosa: columna 'editado_por_cliente' añadida a 'reservations'.");
        } catch (mError) {
            if (!mError.message.includes("duplicate column name")) {
                console.warn("Nota de migración 'editado_por_cliente' en reservations:", mError.message);
            }
        }

        // Asignar CURRENT_TIMESTAMP y 0 a los registros que tengan valores NULL
        await vehiclesDb.run("UPDATE vehicles SET created_at = CURRENT_TIMESTAMP WHERE created_at IS NULL");
        await vehiclesDb.run("UPDATE reservations SET created_at = CURRENT_TIMESTAMP WHERE created_at IS NULL");
        await vehiclesDb.run("UPDATE reservations SET updated_at = CURRENT_TIMESTAMP WHERE updated_at IS NULL");
        await vehiclesDb.run("UPDATE reservations SET comision_cobrada = 0 WHERE comision_cobrada IS NULL");
        await vehiclesDb.run("UPDATE reservations SET editado_por_cliente = 0 WHERE editado_por_cliente IS NULL");

    } catch (error) {
        console.error("Error al inicializar las bases de datos:", error);
        throw error;
    }
}

// Función helper para cerrar las conexiones limpiamente desde el seed
function closeDatabase() {
    return new Promise((resolve) => {
        let closed = 0;
        const checkClosed = () => {
            closed++;
            if (closed === 2) resolve();
        };
        usersDbRaw.close(checkClosed);
        vehiclesDbRaw.close(checkClosed);
    });
}

module.exports = {
    usersDb,
    vehiclesDb,
    initializeDatabase,
    closeDatabase
};