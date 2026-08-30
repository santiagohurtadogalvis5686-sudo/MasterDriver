# MasterDriver

Plataforma web para el alquiler y práctica de vehículos (carros y motos). El sitio web permite a los usuarios publicar vehículos para alquiler, explorar un catálogo de opciones disponibles, gestionar publicaciones propias y realizar/gestionar reservas de manera interactiva.

### Propósito
MasterDriver busca conectar a propietarios de vehículos con personas que necesitan alquilar un vehículo para prácticas de conducción o desplazamientos urbanos. Proporciona una interfaz intuitiva para administrar publicaciones, controlar disponibilidad y llevar un registro claro de las solicitudes de reserva.

---

## 🚀 Características

* **Gestión de Usuarios y Sesiones:** Registro e inicio de sesión seguro con contraseñas encriptadas y sesiones basadas en tokens guardados en base de datos.
* **Catálogo de Vehículos:** Visualización de vehículos disponibles (carros y motos) con detalles, imágenes, precios y propietarios.
* **Publicación de Vehículos:** Formulario para publicar vehículos adjuntando fotografías, documentos de verificación, disponibilidad de horarios/días y condiciones de uso.
* **Gestión de Publicaciones Propias:** Permite a los propietarios consultar, editar y eliminar sus publicaciones de vehículos.
* **Sistema de Reservas:** Creación de solicitudes de reserva por rango de fechas con cálculo de costo total y validación de solapamiento de fechas.
* **Gestión de Reservas para Propietarios:** Confirmación o rechazo de solicitudes de reserva recibidas en vehículos propios.
* **Expiración Automática de Reservas:** Tarea en segundo plano que actualiza a estado `expirada` aquellas reservas con más de 10 minutos de antigüedad sin confirmar.
* **Subida de Archivos:** Carga de fotografías de vehículos y documentos PDF/imágenes mediante almacenamiento en disco.
* **Filtros de Administración:** Endpoint exclusivo para el rol `admin` para consultar la totalidad de reservas en el sistema.

---

## 🛠️ Tecnologías

* **HTML5:** Estructuración de las páginas e interfaces de la aplicación.
* **CSS3:** Estilos personalizados (`css/styles.css`) para la presentación gráfica de la plataforma.
* **JavaScript (Vanilla / ES6+):** Lógica del cliente para el manejo de DOM, peticiones HTTP (Fetch API) y gestión de sesión en `localStorage`.
* **Node.js:** Entorno de ejecución para el servidor backend.
* **Express (`^5.1.0`):** Framework web para el diseño de la API RESTful y servicio de archivos estáticos.
* **SQLite3 (`^5.1.7`):** Motor de base de datos relacional almacenado en archivo local (`masterdriver.db`).
* **Bcryptjs (`^3.0.2`):** Algoritmo para el hasheo seguro de contraseñas de usuarios.
* **Multer (`^2.0.2`):** Middleware para la gestión y carga de archivos multipart (`/uploads`).
* **CORS (`^2.8.5`):** Configuración de acceso cruzado entre dominios para la API.

---

## 📋 Requisitos previos

* **Node.js:** Versión 16.x o superior recomendada.
* **npm:** Gestor de paquetes de Node.js (incluido con Node.js).
* **Navegador Web:** Navegador moderno (Chrome, Firefox, Edge, Safari).

---

## ⚙️ Instalación

1. **Clonar el repositorio:**
   ```bash
   git clone <URL_DEL_REPOSITORIO>
   cd MasterDriver


## Instalar dependencias:

- npm install
- npm run seed

## 📦 Dependencias
Production Dependencies
bcryptjs (^3.0.2): Encriptación y verificación de contraseñas de usuarios.

cors (^2.8.5): Habilitación de Cross-Origin Resource Sharing.

express (^5.1.0): Servidor HTTP y rutas de la API REST.

multer (^2.0.2): Procesamiento de imágenes de vehículos y documentos subidos.

sqlite3 (^5.1.7): Controlador para la interacción con la base de datos SQLite.

DevDependencies
nodemon (^3.1.10): Reinicio automático del servidor en entorno de desarrollo al detectar cambios de código.

## 🔧 Configuración
El proyecto no requiere de variables de entorno externas (.env) por defecto.

Puerto: El servidor se ejecuta en el puerto 3000 por defecto.

Servidor estático: Express sirve directamente los archivos HTML, CSS y JS desde la raíz del proyecto.

Almacenamiento local: Los archivos cargados mediante Multer se guardan de forma automática en los directorios:

uploads/vehicles/ (fotografías de vehículos)

uploads/documents/ (documentos adjuntos)

## 🗄️ Base de datos
Motor: SQLite3

Archivo de base de datos: masterdriver.db (creado en la raíz del proyecto).

Ubicación del esquema SQL: database/schema.sql

## Tablas principales
users: id, nombre, correo, password_hash, telefono, rol, fecha_registro

sessions: id, user_id, token, fecha_inicio, estado

vehicles: id, user_id, titulo, tipo, marca, modelo, precio, whatsapp, descripcion, fotografias, disponibilidad, documentos, condiciones_uso, fecha_creacion

reservations: id, user_id, vehicle_id, fecha_inicio, fecha_fin, estado, total_pago, fecha_creacion

## Ejecución:

npm run seed

## 📁 Estructura del proyecto

MasterDriver/
├── css/
│   └── styles.css
├── database/
│   ├── database.js
│   └── schema.sql
├── js/
│   ├── app.js
│   ├── catalog.js
│   ├── login.js
│   ├── my-publications.js
│   ├── profile.js
│   ├── publish.js
│   └── reservations.js
├── uploads/
│   ├── documents/
│   └── vehicles/
├── catalog.html
├── index.html
├── login.html
├── my-publications.html
├── profile.html
├── publish.html
├── reservations.html
├── masterdriver.db
├── License
├── package.json
├── package-lock.json
├── seed.js
└── server.js


## ▶️ Ejecución del proyecto

1. npm run seed
2. npm start

Acceso en el navegador:

Aplicación Web: http://localhost:3000

Estado de la API: http://localhost:3000/api


## 🔄 Funcionamiento general

Navegación Inicial: El usuario ingresa a la página principal (index.html) o directamente al catálogo (catalog.html).

Autenticación:

Registro de usuario en login.html (POST /api/auth/register).

Inicio de sesión obteniendo un token numérico/hexadecimal guardado en localStorage (POST /api/auth/login).

Exploración de Vehículos: El catálogo obtiene los vehículos activos desde el endpoint GET /api/vehicles.

Reserva de Vehículo: Un usuario autenticado selecciona un vehículo e ingresa un rango de fechas. Si no hay conflictos de fechas, se registra la reserva con estado pendiente.

Aprobación de Reserva: El propietario del vehículo consulta sus solicitudes en reservations.html (GET /api/owner/reservations) y puede aceptar o rechazar la solicitud.

Expiración: Si la reserva permanece en estado pendiente o confirmada por más de 10 minutos desde su fecha de creación, la tarea periódica del servidor cambia automáticamente su estado a expirada.


## 📄 Páginas principales

index.html: Página de bienvenida e introducción a la plataforma.

login.html: Formulario unificado de inicio de sesión y registro de usuarios.

catalog.html: Catálogo público de carros y motos con opción de búsqueda y filtro.

publish.html: Formulario de alta para registrar un nuevo vehículo en la plataforma.

my-publications.html: Panel de administración de los vehículos publicados por el usuario conectado.

reservations.html: Gestión de reservas realizadas (como cliente) y solicitudes recibidas (como propietario).

profile.html: Consulta y actualización de datos personales (nombre, correo, teléfono).


## 🔐 Autenticación
La autenticación en MasterDriver opera de la siguiente forma:

Al autenticarse mediante /api/auth/login, el servidor genera un token hexadecimal aleatorio (crypto.randomBytes(32)).

El token se registra en la tabla sessions asignado al user_id con estado 'activa'.

El frontend almacena el token en localStorage bajo la clave masterdriver_token.

Para endpoints protegidos, el cliente debe adjuntar la cabecera HTTP:
Authorization: Bearer <TOKEN>

El middleware autenticar valida en la base de datos la existencia del token y que se encuentre en estado 'activa'.

## 🚗 Sistema de reservas
Creación: Se especifica vehicle_id, fecha_inicio, fecha_fin y total_pago.

Validación de Disponibilidad: El sistema verifica que no existan reservas en estado pendiente o confirmada cuyos rangos de fechas se crucen con la nueva solicitud.

Estados de la Reserva:

pendiente: Creada por el cliente, a la espera de respuesta del propietario.

confirmada: Aprobada por el propietario del vehículo.

rechazada: Rechazada por el propietario.

cancelada: Cancelada voluntariamente por el cliente.

expirada: Transcurridos 10 minutos sin confirmación o cierre.

## 🚘 Publicación de vehículos
El formulario en publish.html envía una petición multipart/form-data manejada por multer:

Imágenes: Hasta 10 archivos de imagen (.jpg, .png, .webp) limitados a 5 MB por archivo.

Documentos: Hasta 10 archivos adjuntos limitados a 10 MB por archivo.

Estructura Interna: Los campos complejos (fotografías, disponibilidad, documentos y condiciones) se serializan en formato JSON dentro de la base de datos SQLite.

## 📜 Scripts disponibles
En el archivo package.json se encuentran los siguientes comandos ejecutables:

npm start: Inicia el servidor de producción ejecutando node server.js.

npm run dev: Inicia el servidor en modo desarrollo utilizando nodemon.

npm run seed: Inicializa la estructura de la base de datos.

## 🐛 Solución de problemas
Error EADDRINUSE: address already in use :::3000:
El puerto 3000 está ocupado por otra aplicación. Finaliza el proceso existente o cambia la constante PORT en server.js.

Error de conexión con SQLite (SQLITE_CANTOPEN):
Asegúrate de tener permisos de escritura en la carpeta del proyecto para que Node.js pueda crear/escribir el archivo masterdriver.db.

Imágenes o archivos no cargan:
Verifica que existan los directorios uploads/vehicles/ y uploads/documents/. El servidor intenta crearlos automáticamente al iniciar si no existen.

## 🔒 Seguridad
Recomendaciones para preparar el repositorio antes de subir a GitHub:

Archivos Binarios y Subidas: Es recomendable no incluir el archivo de la base de datos local masterdriver.db ni las imágenes subidas por usuarios en los commits de Git.