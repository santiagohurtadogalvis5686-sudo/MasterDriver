const {
    initializeDatabase,
    closeDatabase
} = require("./database/database");

async function seedDatabase() {
    try {
        console.log("");
        console.log("================================");
        console.log("   MASTERDRIVER DATABASE INIT");
        console.log("================================");
        console.log("");

        console.log("1. Inicializando estructuras de la base de datos...");
        await initializeDatabase();
        console.log("   ✓ Base de datos verificada e inicializada sin datos precargados.");

        console.log("");
        console.log("================================");
        console.log("   PROCESO COMPLETADO EXITOSAMENTE");
        console.log("================================");
        console.log("");

    } catch (error) {
        console.error("");
        console.error("================================");
        console.error("   ERROR INICIALIZANDO LA BASE DE DATOS");
        console.error("================================");
        console.error("");
        console.error(error);
        process.exitCode = 1;

    } finally {
        try {
            await closeDatabase();
            console.log("Conexión SQLite cerrada.");
        } catch (error) {
            console.error("Error cerrando SQLite:", error);
        }
    }
}

// EJECUTAR
seedDatabase();