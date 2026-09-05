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

        console.log("1. Inicializando estructuras de las dos bases de datos independientes...");
        await initializeDatabase();
        console.log("   ✓ Bases de datos independientes verificadas e inicializadas.");

        console.log("");
        console.log("================================");
        console.log("   PROCESO COMPLETADO EXITOSAMENTE");
        console.log("================================");
        console.log("");

    } catch (error) {
        console.error("");
        console.error("================================");
        console.error("   ERROR INICIALIZANDO LAS BASES DE DATOS");
        console.error("================================");
        console.error("");
        console.error(error);
        process.exitCode = 1;

    } finally {
        try {
            await closeDatabase();
            console.log("Conexiones a ambas bases de datos cerradas correctamente.");
        } catch (error) {
            console.error("Error cerrando SQLite:", error);
        }
    }
}

seedDatabase();