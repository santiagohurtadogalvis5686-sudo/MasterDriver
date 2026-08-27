document.addEventListener(
    "DOMContentLoaded",
    iniciarMisPublicaciones
);

async function iniciarMisPublicaciones() {
    if (!usuarioAutenticado()) {
        window.location.href = "login.html";
        return;
    }

    const editForm = document.querySelector("#editForm");

    if (editForm) {
        editForm.addEventListener("submit", guardarEdicion);
    }

    await Promise.all([
        cargarMisVehiculos(),
        cargarReservasRecibidas()
    ]);
}

async function cargarMisVehiculos() {
    const container = document.querySelector("#myCatalogContainer");
    const message = document.querySelector("#myCatalogMessage");

    if (!container) return;

    try {
        const response = await fetch(`${API_URL}/my-vehicles`, {
            headers: headersAuth()
        });

        const data = await response.json();

        if (!response.ok || !data.ok) {
            manejarErrorAutenticacion(response.status);

            if (message) {
                message.textContent =
                    data.mensaje ||
                    "Error al obtener tus publicaciones.";
            }

            return;
        }

        const vehicles = Array.isArray(data.vehicles)
            ? data.vehicles
            : [];

        container.innerHTML = "";

        if (vehicles.length === 0) {
            if (message) {
                message.textContent =
                    "No has publicado ningún vehículo aún.";
            }

            return;
        }

        if (message) {
            message.textContent = "";
        }

        vehicles.forEach(vehicle => {
            container.appendChild(
                crearTarjetaVehiculo(vehicle)
            );
        });

    } catch (error) {
        console.error("Error al cargar publicaciones:", error);

        if (message) {
            message.textContent =
                "Error de conexión con el servidor.";
        }
    }
}

function crearTarjetaVehiculo(vehicle) {
    const card = document.createElement("article");
    card.className = "vehicle-card";

    const image =
        Array.isArray(vehicle.fotografias) &&
        vehicle.fotografias.length > 0
            ? vehicle.fotografias[0]
            : "https://via.placeholder.com/300x200?text=Sin+Imagen";

    const price = Number(vehicle.precio) || 0;

    card.innerHTML = `
        <div class="vehicle-image">
            <img
                src="${escaparHtml(image)}"
                alt="${escaparHtml(vehicle.titulo)}"
                style="width: 100%; height: 180px; object-fit: cover;"
            >
        </div>

        <div class="vehicle-content" style="padding: 20px;">
            <h3>${escaparHtml(vehicle.titulo)}</h3>

            <p>
                <strong>${escaparHtml(vehicle.marca)}</strong>
                -
                ${escaparHtml(vehicle.modelo)}
            </p>

            <strong>
                $${price.toLocaleString("es-CO")} / hr
            </strong>

            <div style="display: flex; gap: 10px; margin-top: 15px;">
                <button
                    class="btn btn-secondary btn-full"
                    type="button"
                    data-action="edit"
                >
                    Editar
                </button>

                <button
                    class="btn btn-primary btn-full"
                    type="button"
                    data-action="delete"
                    style="background: var(--danger, #dc3545); color: white;"
                >
                    Eliminar
                </button>
            </div>
        </div>
    `;

    card.querySelector('[data-action="edit"]').addEventListener(
        "click",
        () => abrirModal(vehicle)
    );

    card.querySelector('[data-action="delete"]').addEventListener(
        "click",
        () => eliminarVehiculo(vehicle.id)
    );

    return card;
}

async function cargarReservasRecibidas() {
    const container = document.querySelector(
        "#ownerReservationsContainer"
    );

    if (!container) return;

    try {
        const response = await fetch(
            `${API_URL}/owner/reservations`,
            {
                headers: headersAuth()
            }
        );

        const data = await response.json();

        if (!response.ok || !data.ok) {
            manejarErrorAutenticacion(response.status);

            container.innerHTML = `
                <p>
                    ${escaparHtml(
                        data.mensaje ||
                        "No fue posible cargar las solicitudes."
                    )}
                </p>
            `;

            return;
        }

        const reservations = Array.isArray(data.reservations)
            ? data.reservations
            : [];

        container.innerHTML = "";

        if (reservations.length === 0) {
            container.innerHTML =
                "<p>No tienes solicitudes de reserva recibidas.</p>";

            return;
        }

        reservations.forEach(reservation => {
            container.appendChild(
                crearTarjetaReserva(reservation)
            );
        });

    } catch (error) {
        console.error("Error cargando reservas recibidas:", error);

        container.innerHTML =
            "<p>Error de conexión con el servidor.</p>";
    }
}

function crearTarjetaReserva(reservation) {
    const card = document.createElement("article");
    card.className = "reservation-card";

    const total = Number(reservation.total_pago) || 0;

    card.innerHTML = `
        <h3>${escaparHtml(reservation.titulo)}</h3>

        <p>
            Cliente:
            ${escaparHtml(reservation.cliente_nombre)}
            (${escaparHtml(reservation.cliente_correo)})
        </p>

        <p>
            Inicio:
            ${formatearFecha(reservation.fecha_inicio)}
        </p>

        <p>
            Fin:
            ${formatearFecha(reservation.fecha_fin)}
        </p>

        <p>
            Estado:
            <strong>${escaparHtml(reservation.estado)}</strong>
        </p>

        <p>
            Total:
            $${total.toLocaleString("es-CO")}
        </p>
    `;

    if (reservation.estado !== "pendiente") {
        return card;
    }

    const actions = document.createElement("div");

    actions.style.display = "flex";
    actions.style.gap = "10px";
    actions.style.marginTop = "15px";

    const confirmButton = document.createElement("button");

    confirmButton.type = "button";
    confirmButton.className = "btn btn-primary";
    confirmButton.textContent = "Confirmar";

    confirmButton.addEventListener(
        "click",
        () => actualizarEstadoReserva(
            reservation.id,
            "confirmada"
        )
    );

    const rejectButton = document.createElement("button");

    rejectButton.type = "button";
    rejectButton.className = "btn btn-secondary";
    rejectButton.textContent = "Rechazar";

    rejectButton.addEventListener(
        "click",
        () => actualizarEstadoReserva(
            reservation.id,
            "rechazada"
        )
    );

    actions.appendChild(confirmButton);
    actions.appendChild(rejectButton);

    card.appendChild(actions);

    return card;
}

async function actualizarEstadoReserva(reservationId, estado) {
    const action =
        estado === "confirmada"
            ? "confirmar"
            : "rechazar";

    if (!confirm(`¿Deseas ${action} esta reserva?`)) {
        return;
    }

    try {
        const response = await fetch(
            `${API_URL}/owner/reservations/${reservationId}/status`,
            {
                method: "PATCH",

                headers: {
                    ...headersAuth(),
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    estado
                })
            }
        );

        const data = await response.json();

        if (!response.ok || !data.ok) {
            manejarErrorAutenticacion(response.status);

            alert(
                data.mensaje ||
                "No se pudo actualizar la reserva."
            );

            return;
        }

        await cargarReservasRecibidas();

    } catch (error) {
        console.error("Error actualizando reserva:", error);

        alert(
            "Error de conexión al actualizar la reserva."
        );
    }
}

function abrirModal(vehicle) {
    const modal = document.querySelector("#editModal");

    if (!modal) return;

    document.querySelector("#edit-id").value = vehicle.id;
    document.querySelector("#edit-titulo").value = vehicle.titulo || "";
    document.querySelector("#edit-marca").value = vehicle.marca || "";
    document.querySelector("#edit-modelo").value = vehicle.modelo || "";
    document.querySelector("#edit-precio").value = vehicle.precio || 0;
    document.querySelector("#edit-whatsapp").value = vehicle.whatsapp || "";
    document.querySelector("#edit-descripcion").value =
        vehicle.descripcion || "";

    modal.style.display = "flex";
}

function cerrarModal() {
    const modal = document.querySelector("#editModal");

    if (modal) {
        modal.style.display = "none";
    }
}

async function guardarEdicion(event) {
    event.preventDefault();

    const id = document.querySelector("#edit-id").value;

    const body = {
        titulo: document.querySelector("#edit-titulo").value.trim(),
        marca: document.querySelector("#edit-marca").value.trim(),
        modelo: document.querySelector("#edit-modelo").value.trim(),
        precio: Number(
            document.querySelector("#edit-precio").value
        ),
        whatsapp: document.querySelector("#edit-whatsapp").value.trim(),
        descripcion: document.querySelector("#edit-descripcion").value.trim()
    };

    try {
        const response = await fetch(
            `${API_URL}/vehicles/${id}`,
            {
                method: "PUT",

                headers: {
                    ...headersAuth(),
                    "Content-Type": "application/json"
                },

                body: JSON.stringify(body)
            }
        );

        const data = await response.json();

        if (!response.ok || !data.ok) {
            alert(
                data.mensaje ||
                "Error al actualizar la publicación."
            );

            return;
        }

        cerrarModal();
        await cargarMisVehiculos();

    } catch (error) {
        console.error("Error al editar vehículo:", error);

        alert(
            "Error de conexión al intentar actualizar."
        );
    }
}

async function eliminarVehiculo(id) {
    if (!confirm("¿Seguro que deseas eliminar esta publicación?")) {
        return;
    }

    try {
        const response = await fetch(
            `${API_URL}/vehicles/${id}`,
            {
                method: "DELETE",
                headers: headersAuth()
            }
        );

        const data = await response.json();

        if (!response.ok || !data.ok) {
            alert(
                data.mensaje ||
                "No se pudo eliminar la publicación."
            );

            return;
        }

        await Promise.all([
            cargarMisVehiculos(),
            cargarReservasRecibidas()
        ]);

    } catch (error) {
        console.error("Error al eliminar vehículo:", error);

        alert("Error de conexión al eliminar.");
    }
}

function manejarErrorAutenticacion(status) {
    if (status === 401) {
        cerrarSesion();
    }
}

function formatearFecha(fecha) {
    if (!fecha) return "No disponible";

    const parsedDate = new Date(fecha);

    if (Number.isNaN(parsedDate.getTime())) {
        return fecha;
    }

    return parsedDate.toLocaleString(
        "es-CO",
        {
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        }
    );
}

function escaparHtml(valor) {
    const element = document.createElement("div");

    element.textContent = valor ?? "";

    return element.innerHTML;
}

window.cerrarModal = cerrarModal;