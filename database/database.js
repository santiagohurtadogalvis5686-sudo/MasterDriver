const sqlite3 = require("sqlite3").verbose();
const fs = require("fs");
const path = require("path");

const DATABASE_PATH = path.join(
    __dirname,
    "..",
    "masterdriver.db"
);

const SCHEMA_PATH = path.join(
    __dirname,
    "schema.sql"
);

const db = new sqlite3.Database(
    DATABASE_PATH,
    (error) => {
        if (error) {
            console.error(
                "Error conectando con SQLite:",
                error.message
            );
        }
    }
);

// =====================================================
// HELPERS PARA USAR SQLITE CON PROMESAS
// =====================================================

function run(sql, params = []) {
    return new Promise(
        (resolve, reject) => {
            db.run(
                sql,
                params,
                function (error) {
                    if (error) {
                        reject(error);
                        return;
                    }

                    resolve({
                        lastID: this.lastID,
                        changes: this.changes
                    });
                }
            );
        }
    );
}

function get(sql, params = []) {
    return new Promise(
        (resolve, reject) => {
            db.get(
                sql,
                params,
                (error, row) => {
                    if (error) {
                        reject(error);
                        return;
                    }

                    resolve(row);
                }
            );
        }
    );
}

function all(sql, params = []) {
    return new Promise(
        (resolve, reject) => {
            db.all(
                sql,
                params,
                (error, rows) => {
                    if (error) {
                        reject(error);
                        return;
                    }

                    resolve(rows);
                }
            );
        }
    );
}

function exec(sql) {
    return new Promise(
        (resolve, reject) => {
            db.exec(
                sql,
                (error) => {
                    if (error) {
                        reject(error);
                        return;
                    }

                    resolve();
                }
            );
        }
    );
}

async function ensureColumn(tableName, columnName, columnDefinition) {
    const columns = await all(
        `PRAGMA table_info(${tableName})`
    );

    const columnExists = columns.some(
        column => column.name === columnName
    );

    if (!columnExists) {
        await run(
            `ALTER TABLE ${tableName} ADD COLUMN ${columnDefinition}`
        );
    }
}

// =====================================================
// INICIALIZAR BASE DE DATOS
// =====================================================

async function initializeDatabase() {
    try {
        console.log(
            "Inicializando base de datos..."
        );

        await run(
            "PRAGMA foreign_keys = ON"
        );

        const schema = fs.readFileSync(
            SCHEMA_PATH,
            "utf8"
        );

        await exec(schema);

        // Migraciones para bases existentes.
        await ensureColumn(
            "users",
            "password",
            "password TEXT"
        );

        await ensureColumn(
            "users",
            "telefono",
            "telefono TEXT"
        );

        await ensureColumn(
            "users",
            "licencia_frente",
            "licencia_frente TEXT"
        );

        await ensureColumn(
            "users",
            "licencia_reverso",
            "licencia_reverso TEXT"
        );

        await ensureColumn(
            "vehicles",
            "whatsapp",
            "whatsapp TEXT"
        );

        await ensureColumn(
            "reservations",
            "editado_por_cliente",
            "editado_por_cliente INTEGER DEFAULT 0"
        );

        console.log(
            "Tablas creadas/verificadas correctamente."
        );
    } catch (error) {
        console.error(
            "Error inicializando SQLite:",
            error
        );

        throw error;
    }
}

// =====================================================
// CERRAR BASE DE DATOS
// =====================================================

function closeDatabase() {
    return new Promise(
        (resolve, reject) => {
            db.close(
                (error) => {
                    if (error) {
                        reject(error);
                        return;
                    }

                    resolve();
                }
            );
        }
    );
}

module.exports = {
    db,
    run,
    get,
    all,
    exec,
    initializeDatabase,
    closeDatabase
};