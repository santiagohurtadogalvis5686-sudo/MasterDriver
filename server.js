const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const jwt = require("jsonwebtoken");
const multer = require("multer");

const {
    run,
    get,
    all,
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

// Servir archivos estáticos desde la raíz del proyecto
app.use(express.static(__dirname));
app.use("/uploads/vehicles", express.static(vehiclesUploadsDirectory));

// Configuración de Multer para Licencias y Vehículos
const storageDocuments = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, documentsUploadsDirectory);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        cb(null, `licencia-${req.user.id}-${uniqueSuffix}${ext}`);
    }
});

const uploadDocuments = multer({
    storage: storageDocuments,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|webp|pdf/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        if (extname && mimetype) {
            return cb(null, true);
        }
        cb(new Error("Solo se permiten archivos de imagen (JPG, PNG, WEBP) o PDF."));
    }
});

// Middleware de autenticación JWT
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
            const user = await get("SELECT id, nombre, correo, telefono, licencia_frente, licencia_reverso FROM users WHERE id = ?", [decoded.id]);
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

// =====================================================
// RUTAS DE AUTENTICACIÓN Y PERFIL
// =====================================================

app.post("/api/login", async (req, res) => {
    const { correo, password } = req.body;

    if (!correo || !password) {
        return res.status(400).json({ ok: false, mensaje: "Correo y contraseña son requeridos." });
    }

    try {
        const user = await get("SELECT * FROM users WHERE correo = ?", [correo]);

        // Verificación con la columna password_hash de la base de datos
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
        const existingUser = await get("SELECT id FROM users WHERE correo = ?", [correo]);
        if (existingUser) {
            return res.status(400).json({ ok: false, mensaje: "El correo electrónico ya está registrado." });
        }

        // Inserción utilizando password_hash acorde al esquema de SQLite
        const result = await run(
            "INSERT INTO users (nombre, correo, password_hash, telefono) VALUES (?, ?, ?, ?)",
            [nombre, correo, password, telefono || ""]
        );

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

// =====================================================
// RUTAS DE VEHÍCULOS
// =====================================================

app.get("/api/vehicles", async (req, res) => {
    try {
        const vehicles = await all("SELECT * FROM vehicles ORDER BY created_at DESC");
        res.json({ ok: true, vehicles });
    } catch (error) {
        res.status(500).json({ ok: false, mensaje: "Error al obtener los vehículos." });
    }
});

app.get("/api/my-vehicles", authenticateToken, async (req, res) => {
    try {
        const vehicles = await all("SELECT * FROM vehicles WHERE user_id = ? ORDER BY created_at DESC", [req.user.id]);
        res.json({ ok: true, vehicles });
    } catch (error) {
        res.status(500).json({ ok: false, mensaje: "Error al obtener tus publicaciones." });
    }
});

app.put("/api/vehicles/:id", authenticateToken, async (req, res) => {
    const { titulo, marca, modelo, precio, whatsapp, descripcion } = req.body;
    try {
        await run(
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
        await run("DELETE FROM vehicles WHERE id = ? AND user_id = ?", [req.params.id, req.user.id]);
        res.json({ ok: true, mensaje: "Vehículo eliminado correctamente." });
    } catch (error) {
        res.status(500).json({ ok: false, mensaje: "Error al eliminar el vehículo." });
    }
});

// =====================================================
// RUTAS DE RESERVAS
// =====================================================

app.put("/api/reservations/:id", authenticateToken, async (req, res) => {
    const reservationId = req.params.id;
    const { fecha_inicio, fecha_fin } = req.body;

    if (!fecha_inicio || !fecha_fin) {
        return res.status(400).json({ ok: false, mensaje: "Las fechas de inicio y fin son requeridas." });
    }

    try {
        const reservation = await get(
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

        await run(
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
        const reservations = await all(
            `SELECT 
                r.id, 
                r.vehicle_id, 
                r.user_id AS cliente_id,
                r.fecha_inicio, 
                r.fecha_fin, 
                r.total_pago, 
                r.estado, 
                r.editado_por_cliente,
                r.created_at,
                v.titulo AS vehiculo_titulo, 
                v.marca, 
                v.modelo,
                u.nombre AS cliente_nombre, 
                u.correo AS cliente_correo,
                u.telefono AS cliente_telefono,
                u.licencia_frente AS cliente_licencia_frente,
                u.licencia_reverso AS cliente_licencia_reverso
             FROM reservations r
             JOIN vehicles v ON r.vehicle_id = v.id
             JOIN users u ON r.user_id = u.id
             WHERE v.user_id = ?
             ORDER BY r.created_at DESC`,
            [req.user.id]
        );

        const mappedReservations = reservations.map(r => ({
            ...r,
            cliente_licencia_frente: r.cliente_licencia_frente ? `/api/documents/licencia/${r.cliente_id}/frente` : null,
            cliente_licencia_reverso: r.cliente_licencia_reverso ? `/api/documents/licencia/${r.cliente_id}/reverso` : null
        }));

        res.json({ ok: true, reservations: mappedReservations });
    } catch (error) {
        console.error("Error obteniendo reservas del propietario:", error);
        res.status(500).json({ ok: false, mensaje: "Error al obtener las reservaciones recibidas." });
    }
});

app.patch("/api/owner/reservations/:id/status", authenticateToken, async (req, res) => {
    const { estado } = req.body;
    try {
        await run("UPDATE reservations SET estado = ? WHERE id = ?", [estado, req.params.id]);
        res.json({ ok: true, mensaje: "Estado de la reserva actualizado." });
    } catch (error) {
        res.status(500).json({ ok: false, mensaje: "Error actualizando estado de la reserva." });
    }
});

// Ruta por defecto para enviar index.html al acceder a la raíz
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});

// Inicializar DB y servidor
initializeDatabase().then(() => {
    app.listen(PORT, () => {
        console.log(`Servidor escuchando en http://localhost:${PORT}`);
    });
}).catch(err => {
    console.error("Error crítico inicializando servidor:", err);
});