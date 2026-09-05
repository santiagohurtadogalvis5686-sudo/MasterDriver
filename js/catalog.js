let todosLosVehiculos = [];

document.addEventListener("DOMContentLoaded", () => {
    cargarVehiculos();
    configurarBusqueda();
});

async function cargarVehiculos() {
    const container = document.querySelector("#catalogContainer");
    const message = document.querySelector("#catalogMessage");

    if (!container || !message) {
        return;
    }

    try {
        const usuario = obtenerUsuario();
        const queryParam = usuario && usuario.id
            ? `?exclude_user=${encodeURIComponent(usuario.id)}`
            : "";

        const response = await fetch(`${API_URL}/vehicles${queryParam}`);
        const data = await response.json();

        if (!response.ok) {
            message.textContent = data.mensaje || "No se pudieron cargar los vehículos.";
            return;
        }

        todosLosVehiculos = Array.isArray(data.vehicles) ? data.vehicles : [];

        if (todosLosVehiculos.length === 0) {
            container.innerHTML = "";
            message.textContent = "No hay vehículos disponibles para reservar de otros usuarios.";
            return;
        }

        renderizarVehiculos(todosLosVehiculos);

    } catch (error) {
        console.error("Error cargando vehículos:", error);
        message.textContent = "No se pudo conectar con el servidor.";
    }
}

function configurarBusqueda() {
    const searchInput = document.querySelector("#searchInput");
    if (!searchInput) return;

    searchInput.addEventListener("input", (e) => {
        const busqueda = e.target.value.toLowerCase().trim();

        if (!busqueda) {
            renderizarVehiculos(todosLosVehiculos);
            return;
        }

        const vehiculosFiltrados = todosLosVehiculos.filter(vehicle => {
            const titulo = (vehicle.titulo || "").toLowerCase();
            const marca = (vehicle.marca || "").toLowerCase();
            const modelo = (vehicle.modelo || "").toLowerCase();
            const descripcion = (vehicle.descripcion || "").toLowerCase();

            return titulo.includes(busqueda) ||
                   marca.includes(busqueda) ||
                   modelo.includes(busqueda) ||
                   descripcion.includes(busqueda);
        });

        renderizarVehiculos(vehiculosFiltrados, true);
    });
}

function renderizarVehiculos(listaVehiculos, esBusqueda = false) {
    const container = document.querySelector("#catalogContainer");
    const message = document.querySelector("#catalogMessage");

    if (!container || !message) return;

    container.innerHTML = "";

    if (listaVehiculos.length === 0) {
        if (esBusqueda) {
            message.textContent = "No se encontraron vehículos.";
        } else {
            message.textContent = "No hay vehículos disponibles para reservar de otros usuarios.";
        }
        return;
    }

    message.textContent = `${listaVehiculos.length} vehículo${listaVehiculos.length === 1 ? '' : 's'} disponible${listaVehiculos.length === 1 ? '' : 's'}.`;

    listaVehiculos.forEach(vehicle => {
        container.appendChild(crearTarjetaVehiculo(vehicle));
    });
}

function crearTarjetaVehiculo(vehicle) {
    const card = document.createElement("article");
    card.className = "vehicle-card";

    let fotos = [];
    if (typeof vehicle.fotografias === "string") {
        try {
            fotos = JSON.parse(vehicle.fotografias);
        } catch (e) {
            fotos = [];
        }
    } else if (Array.isArray(vehicle.fotografias)) {
        fotos = vehicle.fotografias;
    }

    const imagen = fotos.length > 0
        ? fotos[0]
        : "https://via.placeholder.com/500x300?text=Sin+imagen";

    const whatsapp = vehicle.whatsapp
        ? vehicle.whatsapp.replace(/[^0-9]/g, "")
        : "";

    const whatsappLink = whatsapp
        ? `
            <a
                href="https://wa.me/${whatsapp}"
                target="_blank"
                rel="noopener noreferrer"
                class="btn btn-secondary btn-full"
                style="margin-top: 8px;"
            >
                Contactar por WhatsApp
            </a>
        `
        : "";

    const precio = Number(vehicle.precio) || 0;

    card.innerHTML = `
        <img
            src="${escaparHtml(imagen)}"
            alt="${escaparHtml(vehicle.titulo)}"
            class="vehicle-image"
        >

        <div class="vehicle-content" style="padding: 20px;">
            <h3>${escaparHtml(vehicle.titulo)}</h3>

            <p>
                ${escaparHtml(vehicle.marca)}
                ${escaparHtml(vehicle.modelo)}
            </p>

            <p>
                ${escaparHtml(vehicle.descripcion || "")}
            </p>

            <strong>
                $${precio.toLocaleString("es-CO")} / hora
            </strong>

            <button
                type="button"
                class="btn btn-primary btn-full btn-reserve-action"
                data-vehicle-id="${Number(vehicle.id)}"
                style="margin-top: 12px;"
            >
                Reservar
            </button>

            ${whatsappLink}
        </div>
    `;

    const reservationButton = card.querySelector(".btn-reserve-action");
    if (reservationButton) {
        reservationButton.addEventListener("click", () => reservarVehiculo(vehicle.id));
    }

    return card;
}

function reservarVehiculo(vehicleId) {
    if (!usuarioAutenticado()) {
        alert("Debes iniciar sesión para reservar.");
        window.location.href = "login.html";
        return;
    }

    localStorage.setItem("vehicle_to_reserve", String(vehicleId));
    window.location.href = "reservations.html";
}

function escaparHtml(valor) {
    const element = document.createElement("div");
    element.textContent = valor ?? "";
    return element.innerHTML;
}