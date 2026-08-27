const bcrypt = require("bcryptjs");

const {
    run,
    get,
    initializeDatabase,
    closeDatabase
} = require("./database/database");

// =====================================================
// VEHÍCULOS DEL SEED
// =====================================================

const vehicles = [

    {
        titulo: "Honda CB 125F",
        tipo: "moto",
        marca: "Honda",
        modelo: "CB 125F",
        precio: 18000,
        imagen:
            "https://images.unsplash.com/photo-1558981806-ec527fa84c39",
        descripcion:
            "Moto económica ideal para práctica y desplazamientos urbanos."
    },

    {
        titulo: "Honda XR 150L",
        tipo: "moto",
        marca: "Honda",
        modelo: "XR 150L",
        precio: 22000,
        imagen:
            "https://images.unsplash.com/photo-1558980394-0c9a9c3a3e6c",
        descripcion:
            "Motocicleta versátil para práctica y recorridos urbanos."
    },

    {
        titulo: "Bajaj Pulsar NS 160",
        tipo: "moto",
        marca: "Bajaj",
        modelo: "Pulsar NS 160",
        precio: 24000,
        imagen:
            "https://images.unsplash.com/photo-1568772585407-9361f9bf3a87",
        descripcion:
            "Moto deportiva para conductores con experiencia."
    },

    {
        titulo: "Suzuki Gixxer 150",
        tipo: "moto",
        marca: "Suzuki",
        modelo: "Gixxer 150",
        precio: 23000,
        imagen:
            "https://images.unsplash.com/photo-1558980664-10ea4c9c0f4f",
        descripcion:
            "Moto urbana cómoda y eficiente."
    },

    {
        titulo: "Yamaha FZ 150",
        tipo: "moto",
        marca: "Yamaha",
        modelo: "FZ 150",
        precio: 25000,
        imagen:
            "https://images.unsplash.com/photo-1558980663-0f6f4d9c5c5a",
        descripcion:
            "Moto urbana para práctica de conducción."
    },

    {
        titulo: "Bajaj Dominar 250",
        tipo: "moto",
        marca: "Bajaj",
        modelo: "Dominar 250",
        precio: 30000,
        imagen:
            "https://images.unsplash.com/photo-1568772585502-8d5f3b6f7c29",
        descripcion:
            "Motocicleta de mayor cilindrada para conductores experimentados."
    },

    {
        titulo: "Yamaha XTZ 125",
        tipo: "moto",
        marca: "Yamaha",
        modelo: "XTZ 125",
        precio: 22000,
        imagen:
            "https://images.unsplash.com/photo-1541625602330-2277a4c46182",
        descripcion:
            "Moto multipropósito."
    },

    {
        titulo: "AKT NKD 125",
        tipo: "moto",
        marca: "AKT",
        modelo: "NKD 125",
        precio: 16000,
        imagen:
            "https://images.unsplash.com/photo-1502744688674-c619d1586c9e",
        descripcion:
            "Moto sencilla y económica para prácticas."
    },

    {
        titulo: "TVS Raider 125",
        tipo: "moto",
        marca: "TVS",
        modelo: "Raider 125",
        precio: 20000,
        imagen:
            "https://images.unsplash.com/photo-1558981852-426c6c22a060",
        descripcion:
            "Moto moderna para desplazamientos urbanos."
    },

    {
        titulo: "Suzuki GN 125",
        tipo: "moto",
        marca: "Suzuki",
        modelo: "GN 125",
        precio: 17000,
        imagen:
            "https://images.unsplash.com/photo-1558981285-6f0c94958bb6",
        descripcion:
            "Moto clásica y fácil de conducir."
    },

    {
        titulo: "Renault Sandero",
        tipo: "carro",
        marca: "Renault",
        modelo: "Sandero",
        precio: 35000,
        imagen:
            "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2",
        descripcion:
            "Vehículo compacto para prácticas de conducción."
    },

    {
        titulo: "Chevrolet Spark GT",
        tipo: "carro",
        marca: "Chevrolet",
        modelo: "Spark GT",
        precio: 30000,
        imagen:
            "https://images.unsplash.com/photo-1502877338535-766e1452684a",
        descripcion:
            "Vehículo compacto ideal para aprender."
    },

    {
        titulo: "Renault Logan",
        tipo: "carro",
        marca: "Renault",
        modelo: "Logan",
        precio: 38000,
        imagen:
            "https://images.unsplash.com/photo-1494976388531-d1058494cdd8",
        descripcion:
            "Sedán espacioso para prácticas."
    },

    {
        titulo: "Kia Picanto",
        tipo: "carro",
        marca: "Kia",
        modelo: "Picanto",
        precio: 32000,
        imagen:
            "https://images.unsplash.com/photo-1550355291-bbee04a92027",
        descripcion:
            "Carro pequeño y fácil de maniobrar."
    },

    {
        titulo: "Hyundai Grand i10",
        tipo: "carro",
        marca: "Hyundai",
        modelo: "Grand i10",
        precio: 33000,
        imagen:
            "https://images.unsplash.com/photo-1504215680853-026ed2a45def",
        descripcion:
            "Compacto para práctica urbana."
    },

    {
        titulo: "Mazda 2",
        tipo: "carro",
        marca: "Mazda",
        modelo: "Mazda 2",
        precio: 40000,
        imagen:
            "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7",
        descripcion:
            "Vehículo moderno y cómodo."
    },

    {
        titulo: "Toyota Yaris",
        tipo: "carro",
        marca: "Toyota",
        modelo: "Yaris",
        precio: 42000,
        imagen:
            "https://images.unsplash.com/photo-1542362567-b07e54358753",
        descripcion:
            "Vehículo confiable para práctica."
    },

    {
        titulo: "Volkswagen Gol",
        tipo: "carro",
        marca: "Volkswagen",
        modelo: "Gol",
        precio: 34000,
        imagen:
            "https://images.unsplash.com/photo-1542282088-fe8426682b8f",
        descripcion:
            "Carro compacto para prácticas."
    },

    {
        titulo: "Nissan March",
        tipo: "carro",
        marca: "Nissan",
        modelo: "March",
        precio: 33000,
        imagen:
            "https://images.unsplash.com/photo-1511919884226-fd3cad34687c",
        descripcion:
            "Compacto para conducción urbana."
    },

    {
        titulo: "Chevrolet Onix",
        tipo: "carro",
        marca: "Chevrolet",
        modelo: "Onix",
        precio: 40000,
        imagen:
            "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf",
        descripcion:
            "Vehículo moderno para práctica."
    },

    {
        titulo: "Renault Duster",
        tipo: "carro",
        marca: "Renault",
        modelo: "Duster",
        precio: 45000,
        imagen:
            "https://images.unsplash.com/photo-1519641471654-76ce0107ad1b",
        descripcion:
            "SUV para conductores con experiencia."
    }
];

// =====================================================
// FUNCIÓN PRINCIPAL
// =====================================================

async function seedDatabase() {

    try {

        console.log("");
        console.log("================================");
        console.log("   MASTERDRIVER DATABASE SEED");
        console.log("================================");
        console.log("");

        // =================================================
        // 1. CREAR TABLAS
        // =================================================

        console.log(
            "1. Inicializando base de datos..."
        );

        await initializeDatabase();

        console.log(
            "   ✓ Base de datos inicializada."
        );

        // =================================================
        // 2. LIMPIAR DATOS ANTERIORES
        // =================================================

        console.log(
            "2. Limpiando datos anteriores..."
        );

        // Primero las tablas que tienen
        // foreign keys dependientes.

        await run(
            "DELETE FROM reservations"
        );

        await run(
            "DELETE FROM sessions"
        );

        await run(
            "DELETE FROM vehicles"
        );

        await run(
            "DELETE FROM users"
        );

        console.log(
            "   ✓ Datos anteriores eliminados."
        );

        // =================================================
        // 3. CREAR USUARIO ADMINISTRADOR
        // =================================================

        console.log(
            "3. Creando usuario administrador..."
        );

        const passwordHash =
            await bcrypt.hash(
                "123456",
                10
            );

        const adminResult =
            await run(
                `
                INSERT INTO users
                (
                    nombre,
                    correo,
                    password_hash,
                    rol
                )

                VALUES (?, ?, ?, ?)
                `,
                [
                    "Administrador",
                    "admin@masterdriver.com",
                    passwordHash,
                    "admin"
                ]
            );

        const adminId =
            adminResult.lastID;

        console.log(
            `   ✓ Administrador creado. ID: ${adminId}`
        );

        // =================================================
        // 4. DATOS COMUNES
        // =================================================

        const disponibilidad = {

            hora_inicio: "08:00",

            hora_fin: "18:00",

            dias: [
                "lunes",
                "martes",
                "miercoles",
                "jueves",
                "viernes",
                "sabado"
            ],

            fecha_inicio:
                "2026-08-18",

            fecha_fin:
                "2026-12-31"
        };

        const documentos = {

            soat: true,

            tecnomecanica: true,

            tarjeta_propiedad: true
        };

        const condiciones = [

            "Licencia vigente obligatoria",

            "No mascotas",

            "No fumar",

            "Devolver con tanque lleno"
        ];

        // =================================================
        // 5. INSERTAR LOS 20 VEHÍCULOS
        // =================================================

        console.log(
            "4. Insertando vehículos..."
        );

        let contador = 0;

        for (
            const vehicle of vehicles
        ) {

            const fotografias = [
                vehicle.imagen
            ];

            await run(
                `
                INSERT INTO vehicles
                (
                    user_id,
                    titulo,
                    tipo,
                    marca,
                    modelo,
                    precio,
                    descripcion,
                    fotografias,
                    disponibilidad,
                    documentos,
                    condiciones_uso
                )

                VALUES
                (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `,

                [
                    adminId,

                    vehicle.titulo,

                    vehicle.tipo,

                    vehicle.marca,

                    vehicle.modelo,

                    vehicle.precio,

                    vehicle.descripcion,

                    JSON.stringify(
                        fotografias
                    ),

                    JSON.stringify(
                        disponibilidad
                    ),

                    JSON.stringify(
                        documentos
                    ),

                    JSON.stringify(
                        condiciones
                    )
                ]
            );

            contador++;

            console.log(
                `   ✓ ${contador}/20 - ${vehicle.titulo}`
            );
        }

        // =================================================
        // 6. COMPROBAR RESULTADOS
        // =================================================

        console.log("");
        console.log(
            "5. Comprobando registros..."
        );

        const userCount =
            await get(
                `
                SELECT COUNT(*) AS total
                FROM users
                `
            );

        const vehicleCount =
            await get(
                `
                SELECT COUNT(*) AS total
                FROM vehicles
                `
            );

        const reservationCount =
            await get(
                `
                SELECT COUNT(*) AS total
                FROM reservations
                `
            );

        const sessionCount =
            await get(
                `
                SELECT COUNT(*) AS total
                FROM sessions
                `
            );

        console.log("");
        console.log(
            `   Usuarios: ${userCount.total}`
        );

        console.log(
            `   Vehículos: ${vehicleCount.total}`
        );

        console.log(
            `   Reservas: ${reservationCount.total}`
        );

        console.log(
            `   Sesiones: ${sessionCount.total}`
        );

        // =================================================
        // 7. FINALIZAR
        // =================================================

        console.log("");
        console.log(
            "================================"
        );

        console.log(
            "   SEED COMPLETADO CORRECTAMENTE"
        );

        console.log(
            "================================"
        );

        console.log("");

        console.log(
            "Usuario administrador:"
        );

        console.log(
            "Correo: admin@masterdriver.com"
        );

        console.log(
            "Contraseña: 123456"
        );

        console.log("");

    } catch (error) {

        console.error("");
        console.error(
            "================================"
        );

        console.error(
            "   ERROR EJECUTANDO SEED"
        );

        console.error(
            "================================"
        );

        console.error("");

        console.error(
            error
        );

        process.exitCode = 1;

    } finally {

        try {

            await closeDatabase();

            console.log(
                "Conexión SQLite cerrada."
            );

        } catch (error) {

            console.error(
                "Error cerrando SQLite:",
                error
            );
        }
    }
}

// =====================================================
// EJECUTAR
// =====================================================

seedDatabase();