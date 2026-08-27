const express = require("express");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const cors = require("cors");
const multer = require("multer");
const fs = require("fs");
const path = require("path");

// =====================================================
// DATABASE
// =====================================================

const {
    db,
    run,
    get,
    all,
    initializeDatabase
} = require("./database/database");

// =====================================================
// EXPRESS
// =====================================================

const app = express();

const PORT = 3000;

// =====================================================
// HELPER PARA EXPIRACIÓN AUTOMÁTICA DE RESERVAS (10 MINUTOS)
// =====================================================

async function limpiarReservasExpiradas() {
    try {
        // Expirar reservas cuyo fecha_creacion tenga 10 minutos (600 segundos) o más
        await run(
            `
            UPDATE reservations
            SET estado = 'expirada'
            WHERE estado IN ('pendiente', 'confirmada')
            AND (strftime('%s', 'now') - strftime('%s', fecha_creacion)) >= 600
            `
        );
    } catch (error) {
        console.error("Error al limpiar reservas expiradas:", error);
    }
}

// =====================================================
// MIDDLEWARES
// =====================================================

app.use(cors());

app.use(
    express.json()
);

app.use(
    express.urlencoded({
        extended: true
    })
);

// Servir archivos del frontend
app.use(
    express.static(__dirname)
);

// Middleware para verificar expiración en peticiones entrantes
app.use(async (req, res, next) => {
    if (req.path.startsWith("/api/reservations") || req.path.startsWith("/api/vehicles") || req.path.startsWith("/api/owner")) {
        await limpiarReservasExpiradas();
    }
    next();
});

// =====================================================
// CARPETAS DE ARCHIVOS
// =====================================================

const uploadsDirectory =
    path.join(
        __dirname,
        "uploads"
    );

const vehiclesDirectory =
    path.join(
        uploadsDirectory,
        "vehicles"
    );

const documentsDirectory =
    path.join(
        uploadsDirectory,
        "documents"
    );

// Crear carpetas si no existen

if (
    !fs.existsSync(
        uploadsDirectory
    )
) {
    fs.mkdirSync(
        uploadsDirectory,
        {
            recursive: true
        }
    );
}

if (
    !fs.existsSync(
        vehiclesDirectory
    )
) {
    fs.mkdirSync(
        vehiclesDirectory,
        {
            recursive: true
        }
    );
}

if (
    !fs.existsSync(
        documentsDirectory
    )
) {
    fs.mkdirSync(
        documentsDirectory,
        {
            recursive: true
        }
    );
}

// =====================================================
// SERVIR ARCHIVOS UPLOADS
// =====================================================

app.use(
    "/uploads",
    express.static(
        uploadsDirectory
    )
);

// =====================================================
// CONFIGURACIÓN MULTER - IMÁGENES
// =====================================================

const imageStorage =
    multer.diskStorage({

        destination:
            function (
                req,
                file,
                callback
            ) {

                callback(
                    null,
                    vehiclesDirectory
                );
            },

        filename:
            function (
                req,
                file,
                callback
            ) {

                const extension =
                    path.extname(
                        file.originalname
                    );

                const filename =
                    Date.now() +
                    "-" +
                    crypto
                        .randomBytes(6)
                        .toString("hex") +
                    extension;

                callback(
                    null,
                    filename
                );
            }
    });

const uploadImages =
    multer({

        storage:
            imageStorage,

        limits: {

            fileSize:
                5 * 1024 * 1024
        },

        fileFilter:
            function (
                req,
                file,
                callback
            ) {

                const allowedTypes = [
                    "image/jpeg",
                    "image/png",
                    "image/webp"
                ];

                if (
                    allowedTypes.includes(
                        file.mimetype
                    )
                ) {

                    callback(
                        null,
                        true
                    );

                } else {

                    callback(
                        new Error(
                            "Solo se permiten imágenes JPG, PNG o WEBP."
                        )
                    );
                }
            }
    });

// =====================================================
// CONFIGURACIÓN MULTER - DOCUMENTOS
// =====================================================

const documentStorage =
    multer.diskStorage({

        destination:
            function (
                req,
                file,
                callback
            ) {

                callback(
                    null,
                    documentsDirectory
                );
            },

        filename:
            function (
                req,
                file,
                callback
            ) {

                const extension =
                    path.extname(
                        file.originalname
                    );

                const filename =
                    Date.now() +
                    "-" +
                    crypto
                        .randomBytes(6)
                        .toString("hex") +
                    extension;

                callback(
                    null,
                    filename
                );
            }
    });

const uploadDocuments =
    multer({

        storage:
            documentStorage,

        limits: {

            fileSize:
                10 * 1024 * 1024
        }
    });

// =====================================================
// AUTENTICACIÓN
// =====================================================

function autenticar(
    req,
    res,
    next
) {

    const authorization =
        req.headers.authorization;

    if (!authorization) {

        return res.status(401).json({

            ok: false,

            mensaje:
                "No se proporcionó un token."
        });
    }

    const token =
        authorization.replace(
            "Bearer ",
            ""
        );

    if (!token) {

        return res.status(401).json({

            ok: false,

            mensaje:
                "Token inválido."
        });
    }

    get(
        `
        SELECT

            sessions.id AS session_id,

            sessions.token,

            sessions.fecha_inicio,

            sessions.estado,

            users.id AS user_id,

            users.nombre,

            users.correo,

            users.telefono,

            users.rol

        FROM sessions

        INNER JOIN users
            ON users.id =
               sessions.user_id

        WHERE sessions.token = ?

        AND sessions.estado =
            'activa'
        `,
        [token]
    )
        .then(
            user => {

                if (!user) {

                    return res.status(401).json({

                        ok: false,

                        mensaje:
                            "Sesión inválida o expirada."
                    });
                }

                req.user = user;

                next();
            }
        )
        .catch(
            error => {

                console.error(
                    "Error autenticando:",
                    error
                );

                res.status(500).json({

                    ok: false,

                    mensaje:
                        "Error verificando la sesión."
                });
            }
        );
}

// =====================================================
// RUTA PRINCIPAL
// =====================================================

app.get(
    "/api",
    (req, res) => {

        res.json({

            ok: true,

            mensaje:
                "API de MasterDriver funcionando.",

            version:
                "1.0.0"
        });
    }
);

// =====================================================
// REGISTRO
// =====================================================

app.post(
    "/api/auth/register",
    async (req, res) => {

        try {

            const {
                nombre,
                correo,
                password
            } = req.body;

            if (
                !nombre ||
                !correo ||
                !password
            ) {

                return res.status(400).json({

                    ok: false,

                    mensaje:
                        "Nombre, correo y contraseña son obligatorios."
                });
            }

            if (
                password.length < 6
            ) {

                return res.status(400).json({

                    ok: false,

                    mensaje:
                        "La contraseña debe tener mínimo 6 caracteres."
                });
            }

            const passwordHash =
                await bcrypt.hash(
                    password,
                    10
                );

            const result =
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
                        nombre.trim(),
                        correo
                            .trim()
                            .toLowerCase(),
                        passwordHash,
                        "usuario"
                    ]
                );

            res.status(201).json({

                ok: true,

                mensaje:
                    "Usuario registrado correctamente.",

                userId:
                    result.lastID
            });

        } catch (error) {

            console.error(
                "Error registrando usuario:",
                error
            );

            if (
                error.message.includes(
                    "UNIQUE constraint failed"
                )
            ) {

                return res.status(409).json({

                    ok: false,

                    mensaje:
                        "El correo ya está registrado."
                });
            }

            res.status(500).json({

                ok: false,

                mensaje:
                    "Error interno registrando el usuario."
            });
        }
    }
);

// =====================================================
// LOGIN
// =====================================================

app.post(
    "/api/auth/login",
    async (req, res) => {

        try {

            const {
                correo,
                password
            } = req.body;

            if (
                !correo ||
                !password
            ) {

                return res.status(400).json({

                    ok: false,

                    mensaje:
                        "Correo y contraseña son obligatorios."
                });
            }

            const user =
                await get(
                    `
                    SELECT *

                    FROM users

                    WHERE correo = ?
                    `,
                    [
                        correo
                            .trim()
                            .toLowerCase()
                    ]
                );

            if (!user) {

                return res.status(401).json({

                    ok: false,

                    mensaje:
                        "Correo o contraseña incorrectos."
                });
            }

            const passwordCorrecta =
                await bcrypt.compare(
                    password,
                    user.password_hash
                );

            if (!passwordCorrecta) {

                return res.status(401).json({

                    ok: false,

                    mensaje:
                        "Correo o contraseña incorrectos."
                });
            }

            // Generar token
            const token =
                crypto
                    .randomBytes(32)
                    .toString("hex");

            await run(
                `
                INSERT INTO sessions
                (
                    user_id,
                    token,
                    estado
                )

                VALUES (?, ?, ?)
                `,
                [
                    user.id,
                    token,
                    "activa"
                ]
            );

            res.json({

                ok: true,

                mensaje:
                    "Inicio de sesión exitoso.",

                token,

                usuario: {

                    id:
                        user.id,

                    nombre:
                        user.nombre,

                    correo:
                        user.correo,

                    rol:
                        user.rol
                }
            });

        } catch (error) {

            console.error(
                "Error iniciando sesión:",
                error
            );

            res.status(500).json({

                ok: false,

                mensaje:
                    "Error interno iniciando sesión."
            });
        }
    }
);

// =====================================================
// USUARIO ACTUAL
// =====================================================

app.get(
    "/api/auth/me",
    autenticar,
    (req, res) => {

        res.json({

            ok: true,

            usuario: {

                id:
                    req.user.user_id,

                nombre:
                    req.user.nombre,

                correo:
                    req.user.correo,

                telefono:
                    req.user.telefono,

                rol:
                    req.user.rol
            }
        });
    }
);

// =====================================================
// LOGOUT
// =====================================================

app.post(
    "/api/auth/logout",
    autenticar,
    async (req, res) => {

        try {

            const token =
                req.headers.authorization
                    .replace(
                        "Bearer ",
                        ""
                    );

            await run(
                `
                UPDATE sessions

                SET estado =
                    'cerrada'

                WHERE token = ?
                `,
                [token]
            );

            res.json({

                ok: true,

                mensaje:
                    "Sesión cerrada correctamente."
            });

        } catch (error) {

            console.error(
                "Error cerrando sesión:",
                error
            );

            res.status(500).json({

                ok: false,

                mensaje:
                    "No se pudo cerrar la sesión."
            });
        }
    }
);

// =====================================================
// PERFIL DE USUARIO
// =====================================================

app.get(
    "/api/profile",
    autenticar,
    async (req, res) => {

        try {

            const user =
                await get(
                    `
                    SELECT id, nombre, correo, telefono, rol
                    FROM users
                    WHERE id = ?
                    `,
                    [req.user.user_id]
                );

            if (!user) {
                return res.status(404).json({
                    ok: false,
                    mensaje: "Usuario no encontrado."
                });
            }

            res.json({
                ok: true,
                user
            });

        } catch (error) {

            console.error("Error obteniendo perfil:", error);
            res.status(500).json({
                ok: false,
                mensaje: "Error obteniendo la información del perfil."
            });
        }
    }
);

app.put(
    "/api/profile",
    autenticar,
    async (req, res) => {

        try {

            const { nombre, correo, telefono } = req.body;

            if (!nombre || !correo) {
                return res.status(400).json({
                    ok: false,
                    mensaje: "Nombre y correo son obligatorios."
                });
            }

            await run(
                `
                UPDATE users
                SET nombre = ?, correo = ?, telefono = ?
                WHERE id = ?
                `,
                [
                    nombre.trim(),
                    correo.trim().toLowerCase(),
                    telefono ? telefono.trim() : null,
                    req.user.user_id
                ]
            );

            res.json({
                ok: true,
                mensaje: "Perfil actualizado correctamente."
            });

        } catch (error) {

            console.error("Error actualizando perfil:", error);

            if (error.message.includes("UNIQUE constraint failed")) {
                return res.status(409).json({
                    ok: false,
                    mensaje: "El correo ya está en uso por otro usuario."
                });
            }

            res.status(500).json({
                ok: false,
                mensaje: "Error actualizando la información del perfil."
            });
        }
    }
);

// =====================================================
// OBTENER TODOS LOS VEHÍCULOS (CATÁLOGO)
// =====================================================

app.get(
    "/api/vehicles",
    async (req, res) => {

        try {

            await limpiarReservasExpiradas();

            const excludeUser = req.query.exclude_user || null;

            let sql = `
                SELECT
                    vehicles.*,
                    users.nombre AS propietario
                FROM vehicles
                INNER JOIN users
                    ON users.id = vehicles.user_id
            `;

            const params = [];

            if (excludeUser) {
                sql += ` WHERE vehicles.user_id != ?`;
                params.push(excludeUser);
            }

            sql += ` ORDER BY vehicles.fecha_creacion DESC`;

            const vehicles = await all(sql, params);

            const resultado =
                vehicles.map(
                    vehicle => {

                        return {

                            ...vehicle,

                            fotografias:
                                JSON.parse(
                                    vehicle.fotografias ||
                                    "[]"
                                ),

                            disponibilidad:
                                JSON.parse(
                                    vehicle.disponibilidad ||
                                    "{}"
                                ),

                            documentos:
                                JSON.parse(
                                    vehicle.documentos ||
                                    "{}"
                                ),

                            condiciones_uso:
                                JSON.parse(
                                    vehicle.condiciones_uso ||
                                    "[]"
                                )
                        };
                    }
                );

            res.json({

                ok: true,

                total:
                    resultado.length,

                vehicles:
                    resultado
            });

        } catch (error) {

            console.error(
                "Error obteniendo vehículos:",
                error
            );

            res.status(500).json({

                ok: false,

                mensaje:
                    "Error obteniendo los vehículos."
            });
        }
    }
);

// =====================================================
// OBTENER MIS PUBLICACIONES
// =====================================================

app.get(
    "/api/my-vehicles",
    autenticar,
    async (req, res) => {

        try {

            const vehicles = await all(
                `
                SELECT
                    vehicles.*,
                    users.nombre AS propietario
                FROM vehicles
                INNER JOIN users
                    ON users.id = vehicles.user_id
                WHERE vehicles.user_id = ?
                ORDER BY vehicles.fecha_creacion DESC
                `,
                [req.user.user_id]
            );

            const resultado = vehicles.map(vehicle => ({
                ...vehicle,
                fotografias: JSON.parse(vehicle.fotografias || "[]"),
                disponibilidad: JSON.parse(vehicle.disponibilidad || "{}"),
                documentos: JSON.parse(vehicle.documentos || "{}"),
                condiciones_uso: JSON.parse(vehicle.condiciones_uso || "[]")
            }));

            res.json({
                ok: true,
                total: resultado.length,
                vehicles: resultado
            });

        } catch (error) {

            console.error("Error obteniendo mis publicaciones:", error);
            res.status(500).json({
                ok: false,
                mensaje: "Error obteniendo tus publicaciones."
            });
        }
    }
);

// =====================================================
// OBTENER UN VEHÍCULO
// =====================================================

app.get(
    "/api/vehicles/:id",
    async (req, res) => {

        try {

            const vehicle =
                await get(
                    `
                    SELECT

                        vehicles.*,

                        users.nombre AS propietario

                    FROM vehicles

                    INNER JOIN users
                        ON users.id =
                           vehicles.user_id

                    WHERE vehicles.id = ?
                    `,
                    [
                        req.params.id
                    ]
                );

            if (!vehicle) {

                return res.status(404).json({

                    ok: false,

                    mensaje:
                        "Vehículo no encontrado."
                });
            }

            vehicle.fotografias =
                JSON.parse(
                    vehicle.fotografias ||
                    "[]"
                );

            vehicle.disponibilidad =
                JSON.parse(
                    vehicle.disponibilidad ||
                    "{}"
                );

            vehicle.documentos =
                JSON.parse(
                    vehicle.documentos ||
                    "{}"
                );

            vehicle.condiciones_uso =
                JSON.parse(
                    vehicle.condiciones_uso ||
                    "[]"
                );

            res.json({

                ok: true,

                vehicle
            });

        } catch (error) {

            console.error(
                "Error obteniendo vehículo:",
                error
            );

            res.status(500).json({

                ok: false,

                mensaje:
                    "Error obteniendo el vehículo."
            });
        }
    }
);

// =====================================================
// CREAR VEHÍCULO / PUBLICACIÓN
// =====================================================

app.post(
    "/api/vehicles",

    autenticar,

    uploadImages.fields([

        {
            name: "fotografias",
            maxCount: 10
        },

        {
            name: "documentos_archivos",
            maxCount: 10
        }

    ]),

    async (req, res) => {

        try {

            const {
                titulo,
                tipo,
                marca,
                modelo,
                precio,
                whatsapp,
                descripcion,

                disponibilidad_hora_inicio,
                disponibilidad_hora_fin,

                dias_disponibles,

                fecha_inicio,
                fecha_fin,

                documentos,

                condiciones_uso
            } = req.body;

            // ==========================================
            // VALIDACIONES
            // ==========================================

            if (
                !titulo ||
                !tipo ||
                !marca ||
                !modelo ||
                !precio ||
                !whatsapp
            ) {

                return res.status(400).json({

                    ok: false,

                    mensaje:
                        "Título, tipo, marca, modelo, precio y número de WhatsApp son obligatorios."
                });
            }

            if (
                Number(precio) <= 0
            ) {

                return res.status(400).json({

                    ok: false,

                    mensaje:
                        "El precio debe ser mayor que cero."
                });
            }

            // ==========================================
            // FOTOGRAFÍAS
            // ==========================================

            const fotografias = [];

            if (
                req.files &&
                req.files.fotografias
            ) {

                req.files.fotografias
                    .forEach(
                        file => {

                            fotografias.push(
                                `/uploads/vehicles/${file.filename}`
                            );
                        }
                    );
            }

            // ==========================================
            // DOCUMENTOS
            // ==========================================

            let documentosData = {};

            if (
                documentos
            ) {

                try {

                    documentosData =
                        JSON.parse(
                            documentos
                        );

                } catch (error) {

                    documentosData = {};
                }
            }

            documentosData.archivos =
                [];

            if (
                req.files &&
                req.files.documentos_archivos
            ) {

                req.files.documentos_archivos
                    .forEach(
                        file => {

                            documentosData
                                .archivos
                                .push({

                                    nombre:
                                        file.originalname,

                                    ruta:
                                        `/uploads/documents/${file.filename}`
                                });
                        }
                    );
            }

            // ==========================================
            // DISPONIBILIDAD
            // ==========================================

            let dias = [];

            if (
                dias_disponibles
            ) {

                try {

                    dias =
                        JSON.parse(
                            dias_disponibles
                        );

                } catch (error) {

                    dias =
                        dias_disponibles
                            .split(",")
                            .map(
                                dia =>
                                    dia.trim()
                            )
                            .filter(
                                Boolean
                            );
                }
            }

            const disponibilidad = {

                hora_inicio:
                    disponibilidad_hora_inicio ||
                    "",

                hora_fin:
                    disponibilidad_hora_fin ||
                    "",

                dias,

                fecha_inicio:
                    fecha_inicio ||
                    "",

                fecha_fin:
                    fecha_fin ||
                    ""
            };

            // ==========================================
            // CONDICIONES
            // ==========================================

            let condiciones =
                [];

            if (
                condiciones_uso
            ) {

                try {

                    condiciones =
                        JSON.parse(
                            condiciones_uso
                        );

                } catch (error) {

                    condiciones =
                        condiciones_uso
                            .split("\n")
                            .map(
                                condicion =>
                                    condicion.trim()
                            )
                            .filter(
                                Boolean
                            );
                }
            }

            // ==========================================
            // INSERTAR VEHÍCULO
            // ==========================================

            const result =
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

                        whatsapp,

                        descripcion,

                        fotografias,

                        disponibilidad,

                        documentos,

                        condiciones_uso
                    )

                    VALUES
                    (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    `,
                    [

                        req.user.user_id,

                        titulo.trim(),

                        tipo,

                        marca.trim(),

                        modelo.trim(),

                        Number(precio),

                        whatsapp.trim(),

                        descripcion ||
                            "",

                        JSON.stringify(
                            fotografias
                        ),

                        JSON.stringify(
                            disponibilidad
                        ),

                        JSON.stringify(
                            documentosData
                        ),

                        JSON.stringify(
                            condiciones
                        )
                    ]
                );

            res.status(201).json({

                ok: true,

                mensaje:
                    "Vehículo publicado correctamente.",

                vehicleId:
                    result.lastID
            });

        } catch (error) {

            console.error(
                "Error creando vehículo:",
                error
            );

            res.status(500).json({

                ok: false,

                mensaje:
                    "No se pudo crear la publicación."
            });
        }
    }
);

// =====================================================
// EDITAR MI VEHÍCULO
// =====================================================

app.put(
    "/api/vehicles/:id",
    autenticar,
    async (req, res) => {

        try {

            const { titulo, marca, modelo, precio, whatsapp, descripcion } = req.body;
            const vehicleId = req.params.id;

            const vehicle = await get(
                `SELECT * FROM vehicles WHERE id = ? AND user_id = ?`,
                [vehicleId, req.user.user_id]
            );

            if (!vehicle) {
                return res.status(403).json({
                    ok: false,
                    mensaje: "No estás autorizado para editar este vehículo o no existe."
                });
            }

            await run(
                `
                UPDATE vehicles
                SET titulo = ?, marca = ?, modelo = ?, precio = ?, whatsapp = ?, descripcion = ?
                WHERE id = ? AND user_id = ?
                `,
                [
                    titulo.trim(),
                    marca.trim(),
                    modelo.trim(),
                    Number(precio),
                    whatsapp.trim(),
                    descripcion || "",
                    vehicleId,
                    req.user.user_id
                ]
            );

            res.json({
                ok: true,
                mensaje: "Publicación actualizada correctamente."
            });

        } catch (error) {

            console.error("Error editando vehículo:", error);
            res.status(500).json({
                ok: false,
                mensaje: "No se pudo actualizar la publicación."
            });
        }
    }
);

// =====================================================
// ELIMINAR MI VEHÍCULO
// =====================================================

app.delete(
    "/api/vehicles/:id",
    autenticar,
    async (req, res) => {

        try {

            const vehicleId = req.params.id;

            const result = await run(
                `DELETE FROM vehicles WHERE id = ? AND user_id = ?`,
                [vehicleId, req.user.user_id]
            );

            if (result.changes === 0) {
                return res.status(403).json({
                    ok: false,
                    mensaje: "No tienes permiso para eliminar esta publicación o no existe."
                });
            }

            res.json({
                ok: true,
                mensaje: "Publicación eliminada correctamente."
            });

        } catch (error) {

            console.error("Error eliminando vehículo:", error);
            res.status(500).json({
                ok: false,
                mensaje: "Error eliminando la publicación."
            });
        }
    }
);

// =====================================================
// RESERVAS DE CLIENTE
// =====================================================

app.post(
    "/api/reservations",
    autenticar,
    async (req, res) => {

        try {

            await limpiarReservasExpiradas();

            const {
                vehicle_id,
                fecha_inicio,
                fecha_fin,
                total_pago
            } = req.body;

            if (
                !vehicle_id ||
                !fecha_inicio ||
                !fecha_fin
            ) {

                return res.status(400).json({

                    ok: false,

                    mensaje:
                        "Vehículo, fecha inicial y fecha final son obligatorios."
                });
            }

            // Comprobar vehículo
            const vehicle =
                await get(
                    `
                    SELECT *

                    FROM vehicles

                    WHERE id = ?
                    `,
                    [
                        vehicle_id
                    ]
                );

            if (!vehicle) {

                return res.status(404).json({

                    ok: false,

                    mensaje:
                        "El vehículo no existe."
                });
            }

            // Comprobar fechas
            if (
                new Date(fecha_fin) <
                new Date(fecha_inicio)
            ) {

                return res.status(400).json({

                    ok: false,

                    mensaje:
                        "La fecha final no puede ser anterior a la fecha inicial."
                });
            }

            // Comprobar reservas activas (no expiradas ni canceladas)
            const reservation =
                await get(
                    `
                    SELECT *

                    FROM reservations

                    WHERE vehicle_id = ?

                    AND estado IN
                    (
                        'pendiente',
                        'confirmada'
                    )

                    AND fecha_inicio < ?

                    AND fecha_fin > ?
                    `,
                    [
                        vehicle_id,

                        fecha_fin,

                        fecha_inicio
                    ]
                );

            if (
                reservation
            ) {

                return res.status(409).json({

                    ok: false,

                    mensaje:
                        "El vehículo ya está reservado durante esas fechas."
                });
            }

            // Crear reserva con timestamp actual de SQLite
            const result =
                await run(
                    `
                    INSERT INTO reservations
                    (
                        user_id,

                        vehicle_id,

                        fecha_inicio,

                        fecha_fin,

                        estado,

                        total_pago,

                        fecha_creacion
                    )

                    VALUES
                    (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                    `,
                    [

                        req.user.user_id,

                        vehicle_id,

                        fecha_inicio,

                        fecha_fin,

                        "pendiente",

                        Number(
                            total_pago || 0
                        )
                    ]
                );

            res.status(201).json({

                ok: true,

                mensaje:
                    "Reserva creada correctamente.",

                reservationId:
                    result.lastID
            });

        } catch (error) {

            console.error(
                "Error creando reserva:",
                error
            );

            res.status(500).json({

                ok: false,

                mensaje:
                    "No se pudo crear la reserva."
            });
        }
    }
);

app.get(
    "/api/reservations",
    autenticar,
    async (req, res) => {

        try {

            await limpiarReservasExpiradas();

            // Filtrar y devolver únicamente reservas activas (pendiente / confirmada)
            const reservations =
                await all(
                    `
                    SELECT

                        reservations.*,

                        vehicles.titulo,

                        vehicles.marca,

                        vehicles.modelo,

                        vehicles.precio,

                        users.nombre AS usuario

                    FROM reservations

                    INNER JOIN vehicles
                        ON vehicles.id =
                           reservations.vehicle_id

                    INNER JOIN users
                        ON users.id =
                           reservations.user_id

                    WHERE reservations.user_id = ?
                    AND reservations.estado IN ('pendiente', 'confirmada')

                    ORDER BY
                        reservations.fecha_creacion DESC
                    `,
                    [
                        req.user.user_id
                    ]
                );

            res.json({

                ok: true,

                total:
                    reservations.length,

                reservations
            });

        } catch (error) {

            console.error(
                "Error obteniendo reservas:",
                error
            );

            res.status(500).json({

                ok: false,

                mensaje:
                    "Error obteniendo las reservas."
            });
        }
    }
);

// =====================================================
// CANCELAR RESERVA DE CLIENTE
// =====================================================

app.patch(
    "/api/reservations/:id/cancel",
    autenticar,
    async (req, res) => {

        try {

            await limpiarReservasExpiradas();

            const reservationId = Number(req.params.id);

            if (!Number.isInteger(reservationId) || reservationId <= 0) {
                return res.status(400).json({
                    ok: false,
                    mensaje: "Identificador de reserva no válido."
                });
            }

            const reservation = await get(
                `
                SELECT *
                FROM reservations
                WHERE id = ? AND user_id = ?
                `,
                [reservationId, req.user.user_id]
            );

            if (!reservation) {
                return res.status(404).json({
                    ok: false,
                    mensaje: "La reserva no existe o no pertenece a tu cuenta."
                });
            }

            if (reservation.estado === "cancelada") {
                return res.status(400).json({
                    ok: false,
                    mensaje: "La reserva ya fue cancelada anteriormente."
                });
            }

            if (reservation.estado === "expirada") {
                return res.status(400).json({
                    ok: false,
                    mensaje: "No es posible cancelar una reserva que ya ha expirado."
                });
            }

            await run(
                `
                UPDATE reservations
                SET estado = 'cancelada'
                WHERE id = ? AND user_id = ?
                `,
                [reservationId, req.user.user_id]
            );

            res.json({
                ok: true,
                mensaje: "La reserva ha sido cancelada correctamente."
            });

        } catch (error) {

            console.error("Error cancelando la reserva:", error);
            res.status(500).json({
                ok: false,
                mensaje: "Ocurrió un error en el servidor al intentar cancelar la reserva."
            });
        }
    }
);

// =====================================================
// RESERVAS DE PROPIETARIO (OWNER)
// =====================================================

app.get(
    "/api/owner/reservations",
    autenticar,
    async (req, res) => {

        try {

            await limpiarReservasExpiradas();

            const reservations =
                await all(
                    `
                    SELECT
                        reservations.*,
                        vehicles.titulo,
                        vehicles.marca,
                        vehicles.modelo,
                        users.nombre AS cliente_nombre,
                        users.correo AS cliente_correo
                    FROM reservations
                    INNER JOIN vehicles
                        ON vehicles.id =
                           reservations.vehicle_id
                    INNER JOIN users
                        ON users.id =
                           reservations.user_id
                    WHERE vehicles.user_id = ?
                    AND reservations.estado IN ('pendiente', 'confirmada')
                    ORDER BY
                        CASE reservations.estado
                            WHEN 'pendiente' THEN 0
                            WHEN 'confirmada' THEN 1
                            ELSE 2
                        END,
                        reservations.fecha_creacion DESC
                    `,
                    [
                        req.user.user_id
                    ]
                );

            res.json({

                ok: true,

                total:
                    reservations.length,

                reservations
            });

        } catch (error) {

            console.error(
                "Error obteniendo reservas recibidas:",
                error
            );

            res.status(500).json({

                ok: false,

                mensaje:
                    "No se pudieron obtener las solicitudes de reserva."
            });
        }
    }
);

app.patch(
    "/api/owner/reservations/:id/status",
    autenticar,
    async (req, res) => {

        try {

            await limpiarReservasExpiradas();

            const reservationId =
                Number(req.params.id);

            const { estado } =
                req.body;

            const estadosPermitidos = [
                "confirmada",
                "rechazada"
            ];

            if (
                !Number.isInteger(reservationId) ||
                reservationId <= 0
            ) {

                return res.status(400).json({

                    ok: false,

                    mensaje:
                        "El identificador de la reserva no es válido."
                });
            }

            if (
                !estadosPermitidos.includes(estado)
            ) {

                return res.status(400).json({

                    ok: false,

                    mensaje:
                        "El estado debe ser confirmada o rechazada."
                });
            }

            const reservation =
                await get(
                    `
                    SELECT
                        reservations.id,
                        reservations.estado
                    FROM reservations
                    INNER JOIN vehicles
                        ON vehicles.id =
                           reservations.vehicle_id
                    WHERE reservations.id = ?
                    AND vehicles.user_id = ?
                    `,
                    [
                        reservationId,
                        req.user.user_id
                    ]
                );

            if (!reservation) {

                return res.status(404).json({

                    ok: false,

                    mensaje:
                        "La reserva no existe o no pertenece a uno de tus vehículos."
                });
            }

            if (
                reservation.estado !==
                "pendiente"
            ) {

                return res.status(409).json({

                    ok: false,

                    mensaje:
                        "Solo se pueden actualizar reservas pendientes."
                });
            }

            await run(
                `
                UPDATE reservations
                SET estado = ?
                WHERE id = ?
                `,
                [
                    estado,
                    reservationId
                ]
            );

            res.json({

                ok: true,

                mensaje:
                    estado === "confirmada"
                        ? "Reserva confirmada correctamente."
                        : "Reserva rechazada correctamente.",

                estado
            });

        } catch (error) {

            console.error(
                "Error actualizando estado de reserva:",
                error
            );

            res.status(500).json({

                ok: false,

                mensaje:
                    "No se pudo actualizar el estado de la reserva."
            });
        }
    }
);

// =====================================================
// RESERVAS DE ADMINISTRACIÓN (SOLO ADMIN)
// =====================================================

app.get(
    "/api/admin/reservations",
    autenticar,
    async (req, res) => {

        try {

            await limpiarReservasExpiradas();

            if (
                req.user.rol !==
                "admin"
            ) {

                return res.status(403).json({

                    ok: false,

                    mensaje:
                        "No tienes permisos de administrador."
                });
            }

            const reservations =
                await all(
                    `
                    SELECT

                        reservations.*,

                        vehicles.titulo,

                        vehicles.marca,

                        vehicles.modelo,

                        users.nombre,

                        users.correo

                    FROM reservations

                    INNER JOIN vehicles
                        ON vehicles.id =
                           reservations.vehicle_id

                    INNER JOIN users
                        ON users.id =
                           reservations.user_id

                    ORDER BY
                        reservations.fecha_creacion DESC
                    `
                );

            res.json({

                ok: true,

                reservations
            });

        } catch (error) {

            console.error(
                "Error obteniendo reservas administrativas:",
                error
            );

            res.status(500).json({

                ok: false,

                mensaje:
                    "Error obteniendo las reservas."
            });
        }
    }
);

// =====================================================
// ERROR MULTER Y MANEJO DE ERRORES
// =====================================================

app.use(
    (
        error,
        req,
        res,
        next
    ) => {

        if (
            error instanceof
            multer.MulterError
        ) {

            return res.status(400).json({

                ok: false,

                mensaje:
                    `Error subiendo archivos: ${error.message}`
            });
        }

        if (
            error
        ) {

            console.error(
                "Error:",
                error
            );

            return res.status(400).json({

                ok: false,

                mensaje:
                    error.message ||
                    "Error procesando la solicitud."
            });
        }

        next();
    }
);

// =====================================================
// RUTA 404
// =====================================================

app.use(
    (
        req,
        res
    ) => {

        res.status(404).json({

            ok: false,

            mensaje:
                "Endpoint no encontrado.",

            ruta:
                req.originalUrl
        });
    }
);

// =====================================================
// INICIAR SERVIDOR
// =====================================================

async function iniciarServidor() {

    try {

        console.log("");
        console.log(
            "Inicializando MasterDriver..."
        );

        await initializeDatabase();

        console.log(
            "Base de datos lista."
        );

        // Tarea en segundo plano para limpiar expiradas cada 30 segundos
        setInterval(limpiarReservasExpiradas, 30000);

        app.listen(
            PORT,
            () => {

                console.log("");
                console.log(
                    "================================"
                );

                console.log(
                    "       MASTERDRIVER API"
                );

                console.log(
                    "================================"
                );

                console.log("");

                console.log(
                    `Servidor: http://localhost:${PORT}`
                );

                console.log(
                    `API: http://localhost:${PORT}/api`
                );

                console.log("");

            }
        );

    } catch (error) {

        console.error("");
        console.error(
            "================================"
        );

        console.error(
            "ERROR INICIANDO MASTERDRIVER"
        );

        console.error(
            "================================"
        );

        console.error("");

        console.error(
            error
        );

        process.exit(1);
    }
}

// =====================================================
// EJECUTAR
// =====================================================

iniciarServidor();