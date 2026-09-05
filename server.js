const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const jwt = require("jsonwebtoken");
const multer = require("multer");

const {
    usersDb,
    vehiclesDb,
    initializeDatabase
} = require("./database/database");

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || "masterdriver_secret_key_2026";

// Configuración de almacenamiento de uploads
const uploadsDirectory = path.join(__dirname, "uploads");
const vehiclesUploadsDirectory = path.join(uploadsDirectory, "vehicles");
const documentsUploadsDirectory = path.join(uploadsDirectory, "documents");

fs.mkdirSync(uploadsDirectory, { recursive: true });
fs.mkdirSync(vehiclesUploadsDirectory, { recursive: true });
fs.mkdirSync(documentsUploadsDirectory, { recursive: true });

// Middleware global
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir archivos estáticos
app.use(express.static(__dirname));
app.use("/uploads/vehicles", express.static(vehiclesUploadsDirectory));

// Configuración de Multer para Documentos de Perfil/Licencias
const storageDocuments = multer.diskStorage({
    destination: (req, file, cb) => cb(null, documentsUploadsDirectory),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        cb(null, `licencia-${req.user.id}-${file.fieldname}-${uniqueSuffix}${ext}`);
    }
});

const uploadDocuments = multer({
    storage: storageDocuments,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|webp|pdf/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        if (extname && mimetype) return cb(null, true);
        cb(new Error("Solo se permiten archivos de imagen (JPG, PNG, WEBP) o PDF."));
    }
});

// Configuración de Multer para Publicación de Vehículos
const storageVehicles = multer.diskStorage({
    destination: (req, file, cb) => {
        if (
            file.fieldname === "documentos_archivos" ||
            file.fieldname === "soat_archivo" ||
            file.fieldname === "tecnomecanica_archivo" ||
            file.fieldname === "tarjeta_archivo"
        ) {
            cb(null, documentsUploadsDirectory);
        } else {
            cb(null, vehiclesUploadsDirectory);
        }
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        const isDoc = (
            file.fieldname === "documentos_archivos" ||
            file.fieldname === "soat_archivo" ||
            file.fieldname === "tecnomecanica_archivo" ||
            file.fieldname === "tarjeta_archivo"
        );
        const prefix = isDoc ? `doc-${file.fieldname}` : "vehiculo";
        cb(null, `${prefix}-${uniqueSuffix}${ext}`);
    }
});

const uploadVehicles = multer({
    storage: storageVehicles,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|webp|pdf/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        if (extname && mimetype) return cb(null, true);
        cb(new Error("Formato de archivo no permitido. Solo imágenes o documentos PDF."));
    }
});

// Middleware de autenticación JWT (Usa Base de Datos 1 - usersDb)
function authenticateToken(req, res, next) {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
        return res.status(401).json({ ok: false, mensaje: "Token de autenticación no proporcionado." });
    }

    jwt.verify(token, JWT_SECRET, async (err, decoded) => {
        if (err) {
            return res.status(401).json({ ok: false, mensaje: "Sesión inválida o expirada." });
        }
        try {
            const user = await usersDb.get(
                "SELECT id, nombre, correo, telefono, licencia_frente, licencia_reverso FROM users WHERE id = ?",
                [decoded.id]
            );
            if (!user) {
                return res.status(401).json({ ok: false, mensaje: "Usuario no encontrado." });
            }
            req.user = user;
            next();
        } catch (dbError) {
            return res.status(500).json({ ok: false, mensaje: "Error consultando usuario en la base de datos." });
        }
    });
}

// HELPER PARA OBTENER O CREAR CARTERA DE USUARIO
async function obtenerOCrearCartera(userId) {
    let wallet = await usersDb.get("SELECT * FROM wallets WHERE user_id = ?", [userId]);
    if (!wallet) {
        await usersDb.run("INSERT INTO wallets (user_id, saldo) VALUES (?, 0.0)", [userId]);
        wallet = await usersDb.get("SELECT * FROM wallets WHERE user_id = ?", [userId]);
    }
    return wallet;
}

// =====================================================
// RUTAS DE AUTENTICACIÓN Y PERFIL (Usa DB 1: usersDb)
// =====================================================

app.post("/api/login", async (req, res) => {
    const { correo, password } = req.body;

    if (!correo || !password) {
        return res.status(400).json({ ok: false, mensaje: "Correo y contraseña son requeridos." });
    }

    try {
        const user = await usersDb.get("SELECT * FROM users WHERE correo = ?", [correo]);

        if (!user || user.password_hash !== password) {
            return res.status(401).json({ ok: false, mensaje: "Credenciales incorrectas." });
        }

        const token = jwt.sign({ id: user.id, correo: user.correo }, JWT_SECRET, { expiresIn: "24h" });

        res.json({
            ok: true,
            mensaje: "Inicio de sesión exitoso.",
            token,
            user: {
                id: user.id,
                nombre: user.nombre,
                correo: user.correo
            }
        });
    } catch (error) {
        console.error("Error en login:", error);
        res.status(500).json({ ok: false, mensaje: "Error interno del servidor." });
    }
});

app.post("/api/register", async (req, res) => {
    const { nombre, correo, password, telefono } = req.body;

    if (!nombre || !correo || !password) {
        return res.status(400).json({ ok: false, mensaje: "Todos los campos obligatorios deben completarse." });
    }

    try {
        const existingUser = await usersDb.get("SELECT id FROM users WHERE correo = ?", [correo]);
        if (existingUser) {
            return res.status(400).json({ ok: false, mensaje: "El correo electrónico ya está registrado." });
        }

        const result = await usersDb.run(
            "INSERT INTO users (nombre, correo, password_hash, telefono) VALUES (?, ?, ?, ?)",
            [nombre, correo, password, telefono || ""]
        );

        // Inicializar cartera en 0 al registrar
        await usersDb.run("INSERT INTO wallets (user_id, saldo) VALUES (?, 0.0)", [result.lastID]);

        const token = jwt.sign({ id: result.lastID, correo }, JWT_SECRET, { expiresIn: "24h" });

        res.json({
            ok: true,
            mensaje: "Usuario registrado correctamente.",
            token,
            user: { id: result.lastID, nombre, correo }
        });
    } catch (error) {
        console.error("Error en registro:", error);
        res.status(500).json({ ok: false, mensaje: "Error al registrar el usuario." });
    }
});

app.get("/api/profile", authenticateToken, (req, res) => {
    res.json({
        ok: true,
        user: {
            id: req.user.id,
            nombre: req.user.nombre,
            correo: req.user.correo,
            telefono: req.user.telefono || "",
            licencia_frente: req.user.licencia_frente ? `/api/documents/licencia/${req.user.id}/frente` : null,
            licencia_reverso: req.user.licencia_reverso ? `/api/documents/licencia/${req.user.id}/reverso` : null
        }
    });
});

app.put("/api/profile", authenticateToken, async (req, res) => {
    const { nombre, correo, telefono } = req.body;
    if (!nombre || !correo) {
        return res.status(400).json({ ok: false, mensaje: "Nombre y correo son obligatorios." });
    }

    try {
        await usersDb.run(
            "UPDATE users SET nombre = ?, correo = ?, telefono = ? WHERE id = ?",
            [nombre, correo, telefono || "", req.user.id]
        );
        res.json({ ok: true, mensaje: "Perfil actualizado correctamente." });
    } catch (error) {
        console.error("Error al actualizar perfil:", error);
        res.status(500).json({ ok: false, mensaje: "Error interno al actualizar el perfil." });
    }
});

app.post("/api/profile/license", authenticateToken, (req, res) => {
    uploadDocuments.fields([
        { name: "licencia_frente", maxCount: 1 },
        { name: "licencia_reverso", maxCount: 1 }
    ])(req, res, async (err) => {
        if (err) {
            return res.status(400).json({ ok: false, mensaje: err.message });
        }

        try {
            const updates = [];
            const params = [];

            if (req.files && req.files["licencia_frente"]) {
                const pathFrente = `/uploads/documents/${req.files["licencia_frente"][0].filename}`;
                updates.push("licencia_frente = ?");
                params.push(pathFrente);
            }

            if (req.files && req.files["licencia_reverso"]) {
                const pathReverso = `/uploads/documents/${req.files["licencia_reverso"][0].filename}`;
                updates.push("licencia_reverso = ?");
                params.push(pathReverso);
            }

            if (updates.length === 0) {
                return res.status(400).json({ ok: false, mensaje: "No se proporcionó ningún archivo para subir." });
            }

            params.push(req.user.id);
            const sql = `UPDATE users SET ${updates.join(", ")} WHERE id = ?`;
            await usersDb.run(sql, params);

            res.json({ ok: true, mensaje: "Documentos cargados correctamente." });
        } catch (dbError) {
            console.error("Error al guardar licencias en DB:", dbError);
            res.status(500).json({ ok: false, mensaje: "Error al registrar archivos en la base de datos." });
        }
    });
});

app.delete("/api/profile/license/:side", authenticateToken, async (req, res) => {
    const side = req.params.side;
    if (side !== "frente" && side !== "reverso") {
        return res.status(400).json({ ok: false, mensaje: "Lado de la licencia no válido." });
    }

    const column = side === "frente" ? "licencia_frente" : "licencia_reverso";

    try {
        await usersDb.run(`UPDATE users SET ${column} = NULL WHERE id = ?`, [req.user.id]);
        res.json({ ok: true, mensaje: `Licencia (${side}) eliminada correctamente.` });
    } catch (error) {
        console.error("Error al eliminar licencia:", error);
        res.status(500).json({ ok: false, mensaje: "Error al eliminar la licencia de la base de datos." });
    }
});

app.get("/api/documents/licencia/:userId/:side", authenticateToken, async (req, res) => {
    const { userId, side } = req.params;

    if (parseInt(userId, 10) !== req.user.id && req.user.rol !== "admin") {
        return res.status(403).json({ ok: false, mensaje: "Acceso denegado." });
    }

    const column = side === "frente" ? "licencia_frente" : side === "reverso" ? "licencia_reverso" : null;
    if (!column) {
        return res.status(400).json({ ok: false, mensaje: "Lado no válido." });
    }

    try {
        const user = await usersDb.get(`SELECT ${column} FROM users WHERE id = ?`, [userId]);
        const filePathRelative = user ? user[column] : null;

        if (!filePathRelative) {
            return res.status(404).json({ ok: false, mensaje: "Documento no encontrado." });
        }

        const cleanPath = filePathRelative.replace(/^\/+/, "");
        const absolutePath = path.resolve(__dirname, cleanPath);

        if (!fs.existsSync(absolutePath)) {
            return res.status(404).json({ ok: false, mensaje: "El archivo físico no existe en el servidor." });
        }

        res.sendFile(absolutePath);
    } catch (error) {
        console.error("Error al servir el documento:", error);
        res.status(500).json({ ok: false, mensaje: "Error al procesar el archivo." });
    }
});

// =====================================================
// RUTAS MÓDULO CARTERA (DB 1: usersDb)
// =====================================================

app.get("/api/wallet", authenticateToken, async (req, res) => {
    try {
        const wallet = await obtenerOCrearCartera(req.user.id);
        const transactions = await usersDb.all(
            "SELECT * FROM wallet_transactions WHERE user_id = ? ORDER BY created_at DESC",
            [req.user.id]
        );

        const puedeReservarPropietario = wallet.saldo >= 10000;
        const estadoMensaje = puedeReservarPropietario 
            ? "Cartera habilitada" 
            : "Cartera bloqueada: necesitas tener mínimo $10.000 COP";

        res.json({
            ok: true,
            saldo: wallet.saldo,
            habilitada: puedeReservarPropietario,
            estado_mensaje: estadoMensaje,
            transacciones: transactions
        });
    } catch (error) {
        console.error("Error obteniendo información de la cartera:", error);
        res.status(500).json({ ok: false, mensaje: "Error al consultar la cartera." });
    }
});

app.post("/api/wallet/recharge", authenticateToken, async (req, res) => {
    const { monto, metodo } = req.body;
    const montoNumerico = parseFloat(monto);

    if (isNaN(montoNumerico) || montoNumerico <= 0) {
        return res.status(400).json({ ok: false, mensaje: "Monto de recarga inválido." });
    }

    const metodosValidos = ["PSE", "Nequi", "Daviplata", "Tarjeta de Crédito"];
    const metodoUsado = metodosValidos.includes(metodo) ? metodo : "PSE";

    try {
        await usersDb.run("BEGIN TRANSACTION");

        const wallet = await obtenerOCrearCartera(req.user.id);
        const nuevoSaldo = wallet.saldo + montoNumerico;

        await usersDb.run(
            "UPDATE wallets SET saldo = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?",
            [nuevoSaldo, req.user.id]
        );

        await usersDb.run(
            `INSERT INTO wallet_transactions (user_id, tipo, monto, saldo_resultante, descripcion) 
             VALUES (?, 'recarga', ?, ?, ?)`,
            [
                req.user.id,
                montoNumerico,
                nuevoSaldo,
                `Recarga simulada mediante ${metodoUsado}`
            ]
        );

        await usersDb.run("COMMIT");

        res.json({
            ok: true,
            mensaje: `Recarga realizada correctamente. Tu nuevo saldo es de $${nuevoSaldo.toLocaleString("es-CO")} COP.`,
            nuevoSaldo
        });
    } catch (error) {
        await usersDb.run("ROLLBACK").catch(() => {});
        console.error("Error en recarga de cartera:", error);
        res.status(500).json({ ok: false, mensaje: "Error al procesar la recarga." });
    }
});

// =====================================================
// RUTAS DE VEHÍCULOS (Usa DB 2: vehiclesDb)
// =====================================================

app.post("/api/vehicles", authenticateToken, uploadVehicles.fields([
    { name: "fotografias", maxCount: 5 },
    { name: "soat_archivo", maxCount: 1 },
    { name: "tecnomecanica_archivo", maxCount: 1 },
    { name: "tarjeta_archivo", maxCount: 1 }
]), async (req, res) => {
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
            condiciones_uso
        } = req.body;

        if (!titulo || !tipo || !marca || !modelo || !precio || !whatsapp) {
            return res.status(400).json({ ok: false, mensaje: "Todos los campos obligatorios deben ser diligenciados." });
        }

        const hasSoat = req.files && req.files["soat_archivo"] && req.files["soat_archivo"].length > 0;
        const hasTecno = req.files && req.files["tecnomecanica_archivo"] && req.files["tecnomecanica_archivo"].length > 0;
        const hasTarjeta = req.files && req.files["tarjeta_archivo"] && req.files["tarjeta_archivo"].length > 0;

        if (!hasSoat || !hasTecno || !hasTarjeta) {
            const faltantes = [];
            if (!hasSoat) faltantes.push("SOAT");
            if (!hasTecno) faltantes.push("Tecnomecánica");
            if (!hasTarjeta) faltantes.push("Tarjeta de propiedad");

            return res.status(400).json({
                ok: false,
                mensaje: `Es obligatorio adjuntar los tres documentos. Falta: ${faltantes.join(", ")}.`
            });
        }

        const fotos = req.files && req.files["fotografias"] 
            ? req.files["fotografias"].map(file => `/uploads/vehicles/${file.filename}`) 
            : [];

        const documentosObj = {
            soat: `/uploads/documents/${req.files["soat_archivo"][0].filename}`,
            tecnomecanica: `/uploads/documents/${req.files["tecnomecanica_archivo"][0].filename}`,
            tarjeta_propiedad: `/uploads/documents/${req.files["tarjeta_archivo"][0].filename}`
        };

        const disponibilidadJSON = JSON.stringify({
            hora_inicio: disponibilidad_hora_inicio || "",
            hora_fin: disponibilidad_hora_fin || "",
            dias: dias_disponibles ? JSON.parse(dias_disponibles) : [],
            fecha_inicio: fecha_inicio || "",
            fecha_fin: fecha_fin || ""
        });

        const result = await vehiclesDb.run(
            `INSERT INTO vehicles (
                user_id, titulo, tipo, marca, modelo, precio, whatsapp, descripcion, 
                fotografias, disponibilidad, documentos, condiciones_uso
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                req.user.id,
                titulo,
                tipo,
                marca,
                modelo,
                parseFloat(precio),
                whatsapp,
                descripcion || "",
                JSON.stringify(fotos),
                disponibilidadJSON,
                JSON.stringify(documentosObj),
                condiciones_uso || "[]"
            ]
        );

        res.json({
            ok: true,
            mensaje: "Vehículo publicado correctamente.",
            vehicleId: result.lastID
        });

    } catch (error) {
        console.error("Error al publicar vehículo:", error);
        res.status(500).json({ ok: false, mensaje: "Error interno al publicar el vehículo." });
    }
});

app.get("/api/vehicles", async (req, res) => {
    try {
        const excludeUser = req.query.exclude_user;
        let sql = "SELECT * FROM vehicles";
        let params = [];

        if (excludeUser) {
            sql += " WHERE user_id != ?";
            params.push(excludeUser);
        }

        sql += " ORDER BY created_at DESC";

        const vehicles = await vehiclesDb.all(sql, params);
        res.json({ ok: true, vehicles });
    } catch (error) {
        console.error("Error obteniendo vehículos:", error);
        res.status(500).json({ ok: false, mensaje: "Error al obtener los vehículos." });
    }
});

app.get("/api/vehicles/:id", async (req, res) => {
    try {
        const vehicle = await vehiclesDb.get("SELECT * FROM vehicles WHERE id = ?", [req.params.id]);

        if (!vehicle) {
            return res.status(404).json({ ok: false, mensaje: "Vehículo no encontrado." });
        }

        res.json({ ok: true, vehicle });
    } catch (error) {
        console.error("Error obteniendo detalle de vehículo:", error);
        res.status(500).json({ ok: false, mensaje: "Error al obtener la información del vehículo." });
    }
});

app.get("/api/my-vehicles", authenticateToken, async (req, res) => {
    try {
        const vehicles = await vehiclesDb.all("SELECT * FROM vehicles WHERE user_id = ? ORDER BY created_at DESC", [req.user.id]);
        res.json({ ok: true, vehicles });
    } catch (error) {
        console.error("Error obteniendo mis vehículos:", error);
        res.status(500).json({ ok: false, mensaje: "Error al obtener tus publicaciones." });
    }
});

app.put("/api/vehicles/:id", authenticateToken, async (req, res) => {
    const { titulo, marca, modelo, precio, whatsapp, descripcion } = req.body;
    try {
        await vehiclesDb.run(
            "UPDATE vehicles SET titulo = ?, marca = ?, modelo = ?, precio = ?, whatsapp = ?, descripcion = ? WHERE id = ? AND user_id = ?",
            [titulo, marca, modelo, precio, whatsapp, descripcion, req.params.id, req.user.id]
        );
        res.json({ ok: true, mensaje: "Vehículo actualizado correctamente." });
    } catch (error) {
        res.status(500).json({ ok: false, mensaje: "Error al actualizar el vehículo." });
    }
});

app.delete("/api/vehicles/:id", authenticateToken, async (req, res) => {
    try {
        await vehiclesDb.run("DELETE FROM vehicles WHERE id = ? AND user_id = ?", [req.params.id, req.user.id]);
        res.json({ ok: true, mensaje: "Vehículo eliminado correctamente." });
    } catch (error) {
        res.status(500).json({ ok: false, mensaje: "Error al eliminar el vehículo." });
    }
});

// =====================================================
// RUTAS DE RESERVAS Y VALIDACIONES DE CARTERA
// =====================================================

// CREAR RESERVA - REGLA 3: VALIDACIÓN EN BACKEND DEL SALDO DEL PROPIETARIO
app.post("/api/reservations", authenticateToken, async (req, res) => {
    const { vehicle_id, fecha_inicio, fecha_fin, total_pago } = req.body;

    if (!vehicle_id || !fecha_inicio || !fecha_fin || total_pago === undefined) {
        return res.status(400).json({ ok: false, mensaje: "Todos los datos de la reserva son requeridos." });
    }

    try {
        // Obtener el vehículo para identificar al propietario
        const vehicle = await vehiclesDb.get("SELECT user_id FROM vehicles WHERE id = ?", [vehicle_id]);
        if (!vehicle) {
            return res.status(404).json({ ok: false, mensaje: "El vehículo seleccionado ya no está disponible." });
        }

        const propietarioId = vehicle.user_id;

        // Verificar el saldo actual del propietario en la DB 1
        const carteraPropietario = await obtenerOCrearCartera(propietarioId);

        if (carteraPropietario.saldo < 10000) {
            return res.status(400).json({
                ok: false,
                mensaje: "Esta reserva no puede realizarse porque el propietario del vehículo tiene menos de $10.000 COP disponibles en su cartera. El propietario debe recargar su cartera para poder aceptar reservas."
            });
        }

        // Crear reserva en estado pendiente
        const result = await vehiclesDb.run(
            `INSERT INTO reservations (user_id, vehicle_id, fecha_inicio, fecha_fin, total_pago, estado) 
             VALUES (?, ?, ?, ?, ?, 'pendiente')`,
            [req.user.id, vehicle_id, fecha_inicio, fecha_fin, parseFloat(total_pago)]
        );

        res.json({
            ok: true,
            mensaje: "Reserva solicitada correctamente.",
            reservationId: result.lastID
        });

    } catch (error) {
        console.error("Error al crear reserva:", error);
        res.status(500).json({ ok: false, mensaje: "Error al registrar la reserva." });
    }
});

app.get("/api/reservations", authenticateToken, async (req, res) => {
    try {
        const reservations = await vehiclesDb.all(
            `SELECT r.*, v.titulo, v.marca, v.modelo 
             FROM reservations r 
             JOIN vehicles v ON r.vehicle_id = v.id 
             WHERE r.user_id = ? 
               AND LOWER(r.estado) != 'cancelada'
             ORDER BY r.created_at DESC`,
            [req.user.id]
        );

        const now = new Date();
        const activeReservations = reservations.filter(r => {
            const fechaFin = new Date(r.fecha_fin);
            return !isNaN(fechaFin.getTime()) && fechaFin > now;
        });

        res.json({ ok: true, reservations: activeReservations });
    } catch (error) {
        console.error("Error al obtener las reservas del cliente:", error);
        res.status(500).json({ ok: false, mensaje: "Error al obtener tus reservaciones." });
    }
});

// CANCELAR RESERVA - REGLA 6 Y 7: DEVOLUCIÓN ATÓMICA DE COMISIÓN AL CANCELAR O EXPIRAR
app.patch("/api/reservations/:id/cancel", authenticateToken, async (req, res) => {
    const reservationId = req.params.id;

    try {
        const reservation = await vehiclesDb.get(
            `SELECT r.*, v.user_id as owner_id 
             FROM reservations r 
             JOIN vehicles v ON r.vehicle_id = v.id 
             WHERE r.id = ?`,
            [reservationId]
        );

        if (!reservation) {
            return res.status(404).json({ ok: false, mensaje: "Reserva no encontrada." });
        }

        if (reservation.user_id !== req.user.id && reservation.owner_id !== req.user.id) {
            return res.status(403).json({ ok: false, mensaje: "No tienes permiso para cancelar esta reserva." });
        }

        // Si ya se cobró comisión (estado previa confirmación), realizar devolución de manera atómica
        if (reservation.comision_cobrada === 1) {
            const montoComision = reservation.total_pago * 0.10;

            await usersDb.run("BEGIN TRANSACTION");
            const wallet = await obtenerOCrearCartera(reservation.owner_id);
            const nuevoSaldo = wallet.saldo + montoComision;

            await usersDb.run(
                "UPDATE wallets SET saldo = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?",
                [nuevoSaldo, reservation.owner_id]
            );

            await usersDb.run(
                `INSERT INTO wallet_transactions (user_id, tipo, monto, saldo_resultante, descripcion, reservation_id) 
                 VALUES (?, 'devolucion', ?, ?, ?, ?)`,
                [
                    reservation.owner_id,
                    montoComision,
                    nuevoSaldo,
                    `Devolución de comisión — Reserva #${reservation.id}`,
                    reservation.id
                ]
            );

            await usersDb.run("COMMIT");
        }

        await vehiclesDb.run("UPDATE reservations SET estado = 'cancelada', comision_cobrada = 0 WHERE id = ?", [reservationId]);

        res.json({ ok: true, mensaje: "Reserva cancelada correctamente y comisión reembolsada si aplicaba." });
    } catch (error) {
        await usersDb.run("ROLLBACK").catch(() => {});
        console.error("Error al cancelar la reserva:", error);
        res.status(500).json({ ok: false, mensaje: "Error interno al cancelar la reserva." });
    }
});

app.put("/api/reservations/:id", authenticateToken, async (req, res) => {
    const reservationId = req.params.id;
    const { fecha_inicio, fecha_fin } = req.body;

    if (!fecha_inicio || !fecha_fin) {
        return res.status(400).json({ ok: false, mensaje: "Las fechas de inicio y fin son requeridas." });
    }

    try {
        const reservation = await vehiclesDb.get(
            "SELECT id, user_id, estado FROM reservations WHERE id = ?",
            [reservationId]
        );

        if (!reservation) {
            return res.status(404).json({ ok: false, mensaje: "Reserva no encontrada." });
        }

        if (reservation.user_id !== req.user.id) {
            return res.status(403).json({ ok: false, mensaje: "No tienes permiso para modificar esta reserva." });
        }

        if (reservation.estado !== "pendiente") {
            return res.status(400).json({ 
                ok: false, 
                mensaje: `No es posible editar una reserva en estado '${reservation.estado}'. Solo se pueden modificar reservas pendientes.` 
            });
        }

        const inicio = new Date(fecha_inicio);
        const fin = new Date(fecha_fin);

        if (isNaN(inicio.getTime()) || isNaN(fin.getTime()) || fin <= inicio) {
            return res.status(400).json({ ok: false, mensaje: "Rango de fechas inválido." });
        }

        await vehiclesDb.run(
            "UPDATE reservations SET fecha_inicio = ?, fecha_fin = ?, editado_por_cliente = 1 WHERE id = ?",
            [fecha_inicio, fecha_fin, reservationId]
        );

        res.json({ ok: true, mensaje: "Reserva actualizada correctamente." });
    } catch (error) {
        console.error("Error al actualizar la reserva:", error);
        res.status(500).json({ ok: false, mensaje: "Error interno al actualizar la reserva." });
    }
});

app.get("/api/owner/reservations", authenticateToken, async (req, res) => {
    try {
        const ownerVehicles = await vehiclesDb.all("SELECT id, titulo, marca, modelo FROM vehicles WHERE user_id = ?", [req.user.id]);
        
        if (ownerVehicles.length === 0) {
            return res.json({ ok: true, reservations: [] });
        }

        const vehicleIds = ownerVehicles.map(v => v.id);
        const placeholders = vehicleIds.map(() => "?").join(",");

        const reservations = await vehiclesDb.all(
            `SELECT * FROM reservations WHERE vehicle_id IN (${placeholders}) ORDER BY created_at DESC`,
            vehicleIds
        );

        const enrichedReservations = await Promise.all(
            reservations.map(async (r) => {
                const client = await usersDb.get("SELECT id, nombre, correo, telefono, licencia_frente, licencia_reverso FROM users WHERE id = ?", [r.user_id]);
                const vehicle = ownerVehicles.find(v => v.id === r.vehicle_id);

                return {
                    id: r.id,
                    vehicle_id: r.vehicle_id,
                    cliente_id: r.user_id,
                    fecha_inicio: r.fecha_inicio,
                    fecha_fin: r.fecha_fin,
                    total_pago: r.total_pago,
                    estado: r.estado,
                    editado_por_cliente: r.editado_por_cliente,
                    created_at: r.created_at,
                    vehiculo_titulo: vehicle ? vehicle.titulo : "",
                    marca: vehicle ? vehicle.marca : "",
                    modelo: vehicle ? vehicle.modelo : "",
                    cliente_nombre: client ? client.nombre : "Cliente desconocido",
                    cliente_correo: client ? client.correo : "",
                    cliente_telefono: client ? client.telefono : "",
                    cliente_licencia_frente: client && client.licencia_frente ? `/api/documents/licencia/${client.id}/frente` : null,
                    cliente_licencia_reverso: client && client.licencia_reverso ? `/api/documents/licencia/${client.id}/reverso` : null
                };
            })
        );

        res.json({ ok: true, reservations: enrichedReservations });
    } catch (error) {
        console.error("Error obteniendo reservas del propietario:", error);
        res.status(500).json({ ok: false, mensaje: "Error al obtener las reservaciones recibidas." });
    }
});

// CAMBIO DE ESTADO DE RESERVA POR EL PROPIETARIO - REGLA 4 Y 5: COBRO ATÓMICO DE COMISIÓN DEL 10%
app.patch("/api/owner/reservations/:id/status", authenticateToken, async (req, res) => {
    const { estado } = req.body;
    const reservationId = req.params.id;

    try {
        const reservation = await vehiclesDb.get(
            `SELECT r.*, v.user_id as owner_id 
             FROM reservations r 
             JOIN vehicles v ON r.vehicle_id = v.id 
             WHERE r.id = ?`,
            [reservationId]
        );

        if (!reservation) {
            return res.status(404).json({ ok: false, mensaje: "Reserva no encontrada." });
        }

        if (reservation.owner_id !== req.user.id) {
            return res.status(403).json({ ok: false, mensaje: "No estás autorizado para modificar el estado de esta reserva." });
        }

        // LÓGICA DE COBRO AL CONFIRMAR LA RESERVA
        if (estado === "confirmada" && reservation.estado !== "confirmada") {
            const cartera = await obtenerOCrearCartera(req.user.id);
            const montoComision = reservation.total_pago * 0.10;

            if (cartera.saldo < 10000) {
                return res.status(400).json({
                    ok: false,
                    mensaje: "No puedes confirmar esta reserva porque tienes menos de $10.000 COP en tu cartera. Recarga tu cartera para continuar."
                });
            }

            if (cartera.saldo < montoComision) {
                return res.status(400).json({
                    ok: false,
                    mensaje: `Saldo insuficiente para cubrir la comisión del 10% ($${montoComision.toLocaleString("es-CO")} COP).`
                });
            }

            // Operación Atómica en DB 1 y actualización en DB 2
            await usersDb.run("BEGIN TRANSACTION");
            const nuevoSaldo = cartera.saldo - montoComision;

            await usersDb.run(
                "UPDATE wallets SET saldo = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?",
                [nuevoSaldo, req.user.id]
            );

            await usersDb.run(
                `INSERT INTO wallet_transactions (user_id, tipo, monto, saldo_resultante, descripcion, reservation_id) 
                 VALUES (?, 'comision', ?, ?, ?, ?)`,
                [
                    req.user.id,
                    montoComision,
                    nuevoSaldo,
                    `Comisión por reserva #${reservation.id}`,
                    reservation.id
                ]
            );

            await usersDb.run("COMMIT");
            await vehiclesDb.run("UPDATE reservations SET estado = 'confirmada', comision_cobrada = 1 WHERE id = ?", [reservationId]);

            return res.json({
                ok: true,
                mensaje: `Reserva confirmada. Se descontó una comisión de $${montoComision.toLocaleString("es-CO")} COP de la cartera del propietario.`
            });
        }

        await vehiclesDb.run("UPDATE reservations SET estado = ? WHERE id = ?", [estado, reservationId]);
        res.json({ ok: true, mensaje: "Estado de la reserva actualizado." });

    } catch (error) {
        await usersDb.run("ROLLBACK").catch(() => {});
        console.error("Error cambiando estado de reserva:", error);
        res.status(500).json({ ok: false, mensaje: "Error actualizando estado de la reserva." });
    }
});

// Middleware para rutas de API no encontradas
app.use("/api/*", (req, res) => {
    res.status(404).json({ ok: false, mensaje: "Ruta de la API no encontrada." });
});

// Ruta por defecto para SPA/HTML
app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});

// Inicializar DBs y Servidor
initializeDatabase().then(() => {
    app.listen(PORT, () => {
        console.log(`Servidor escuchando en http://localhost:${PORT}`);
    });
}).catch(err => {
    console.error("Error crítico inicializando servidor:", err);
});