let vehicleSelected = null;
let reservationData = null;
let expirationCheckInterval = null;

document.addEventListener(
    "DOMContentLoaded",
    iniciarPaginaReservas
);

async function iniciarPaginaReservas() {

    const logoutButton =
        document.querySelector(
            "#logoutButton"
        );

    const confirmButton =
        document.querySelector(
            "#confirmReservationButton"
        );

    if (logoutButton) {
        logoutButton.addEventListener(
            "click",
            cerrarSesion
        );
    }

    if (confirmButton) {
        confirmButton.addEventListener(
            "click",
            enviarReserva
        );
    }

    if (!usuarioAutenticado()) {
        window.location.href =
            "login.html";
        return;
    }

    await cargarReservas();
    await cargarVehiculoSeleccionado();

    if (expirationCheckInterval) {
        clearInterval(expirationCheckInterval);
    }
    expirationCheckInterval = setInterval(() => {
        cargarReservas();
    }, 10000);
}

async function cargarVehiculoSeleccionado() {

    const vehicleId =
        localStorage.getItem(
            "vehicle_to_reserve"
        );

    if (!vehicleId) {
        return;
    }

    const formSection =
        document.querySelector(
            "#reservationFormSection"
        );

    const vehicleInfo =
        document.querySelector(
            "#selectedVehicleInfo"
        );

    const availabilityInfo =
        document.querySelector(
            "#selectedAvailability"
        );

    const totalElement =
        document.querySelector(
            "#reservationTotal"
        );

    const formMessage =
        document.querySelector(
            "#reservationFormMessage"
        );

    try {

        const response =
            await fetch(
                `${API_URL}/vehicles/${encodeURIComponent(vehicleId)}`
            );

        const data =
            await response.json();

        if (!response.ok) {

            localStorage.removeItem(
                "vehicle_to_reserve"
            );

            if (formMessage) {
                formMessage.textContent =
                    data.mensaje ||
                    "No fue posible cargar el vehículo seleccionado.";
            }

            return;
        }

        vehicleSelected =
            data.vehicle;

        const usuario =
            obtenerUsuario();

        if (
            usuario &&
            Number(vehicleSelected.user_id) ===
            Number(usuario.id)
        ) {

            localStorage.removeItem(
                "vehicle_to_reserve"
            );

            if (formMessage) {
                formMessage.textContent =
                    "No puedes reservar un vehículo publicado por ti.";
            }

            return;
        }

        reservationData =
            obtenerDatosReservaDesdeDisponibilidad(
                vehicleSelected
            );

        if (!reservationData) {

            localStorage.removeItem(
                "vehicle_to_reserve"
            );

            if (formMessage) {
                formMessage.textContent =
                    "El vehículo no tiene una disponibilidad válida para reservar.";
            }

            return;
        }

        const precio =
            Number(vehicleSelected.precio) || 0;

        if (vehicleInfo) {
            vehicleInfo.textContent =
                `${vehicleSelected.titulo} · ${vehicleSelected.marca} ${vehicleSelected.modelo} · $${precio.toLocaleString("es-CO")} por hora`;
        }

        if (availabilityInfo) {
            availabilityInfo.textContent =
                `Disponibilidad definida por el propietario: ${formatearFecha(reservationData.fecha_inicio)} hasta ${formatearFecha(reservationData.fecha_fin)}.`;
        }

        if (totalElement) {
            totalElement.textContent =
                `Total estimado: $${reservationData.total_pago.toLocaleString("es-CO")}`;
        }

        if (formSection) {
            formSection.hidden =
                false;
        }

    } catch (error) {

        console.error(
            "Error obteniendo el vehículo:",
            error
        );

        localStorage.removeItem(
            "vehicle_to_reserve"
        );

        if (formMessage) {
            formMessage.textContent =
                "No se pudo conectar con el servidor.";
        }
    }
}

function obtenerDatosReservaDesdeDisponibilidad(vehicle) {

    const disponibilidad =
        vehicle.disponibilidad || {};

    const fechaInicio =
        disponibilidad.fecha_inicio;

    const fechaFin =
        disponibilidad.fecha_fin;

    const horaInicio =
        disponibilidad.hora_inicio;

    const horaFin =
        disponibilidad.hora_fin;

    if (
        !fechaInicio ||
        !fechaFin ||
        !horaInicio ||
        !horaFin
    ) {
        return null;
    }

    const inicio =
        `${fechaInicio}T${horaInicio}`;

    const fin =
        `${fechaFin}T${horaFin}`;

    const fechaInicioReserva =
        new Date(inicio);

    const fechaFinReserva =
        new Date(fin);

    if (
        Number.isNaN(fechaInicioReserva.getTime()) ||
        Number.isNaN(fechaFinReserva.getTime()) ||
        fechaFinReserva <= fechaInicioReserva
    ) {
        return null;
    }

    const diferenciaHoras =
        (fechaFinReserva - fechaInicioReserva) /
        (1000 * 60 * 60);

    const horas =
        Math.max(
            1,
            Math.ceil(diferenciaHoras)
        );

    const precioPorHora =
        Number(vehicle.precio) || 0;

    return {
        fecha_inicio: inicio,
        fecha_fin: fin,
        total_pago:
            precioPorHora * horas
    };
}

async function enviarReserva() {

    const formMessage =
        document.querySelector(
            "#reservationFormMessage"
        );

    const button =
        document.querySelector(
            "#confirmReservationButton"
        );

    if (
        !vehicleSelected ||
        !reservationData
    ) {

        if (formMessage) {
            formMessage.textContent =
                "No hay información válida para crear la reserva.";
        }

        return;
    }

    try {

        button.disabled =
            true;

        button.textContent =
            "Procesando reserva...";

        formMessage.textContent =
            "";

        const response =
            await fetch(
                `${API_URL}/reservations`,
                {
                    method: "POST",

                    headers: {
                        ...headersAuth(),

                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({
                        vehicle_id:
                            vehicleSelected.id,

                        fecha_inicio:
                            reservationData.fecha_inicio,

                        fecha_fin:
                            reservationData.fecha_fin,

                        total_pago:
                            reservationData.total_pago
                    })
                }
            );

        const data =
            await response.json();

        if (!response.ok) {

            formMessage.textContent =
                data.mensaje ||
                "No fue posible crear la reserva.";

            if (response.status === 401) {
                cerrarSesion();
            }

            return;
        }

        localStorage.removeItem(
            "vehicle_to_reserve"
        );

        vehicleSelected =
            null;

        reservationData =
            null;

        document.querySelector(
            "#reservationFormSection"
        ).hidden =
            true;

        mostrarNotificacion("Reserva creada con éxito", "success");
        await cargarReservas();

    } catch (error) {

        console.error(
            "Error creando reserva:",
            error
        );

        formMessage.textContent =
            "No se pudo conectar con el servidor.";

    } finally {

        button.disabled =
            false;

        button.textContent =
            "Confirmar reserva";
    }
}

async function cargarReservas() {

    const container =
        document.querySelector(
            "#reservationContainer"
        );

    if (!container) {
        return;
    }

    try {

        const response =
            await fetch(
                `${API_URL}/reservations`,
                {
                    headers:
                        headersAuth()
                }
            );

        const data =
            await response.json();

        if (!response.ok) {

            container.innerHTML =
                `<p>${escaparHtml(data.mensaje || "No fue posible cargar las reservas.")}</p>`;

            if (response.status === 401) {
                cerrarSesion();
            }

            return;
        }

        const reservations =
            Array.isArray(data.reservations)
                ? data.reservations
                : [];

        actualizarEstadisticas(
            reservations
        );

        container.innerHTML =
            "";

        if (reservations.length === 0) {

            container.innerHTML =
                "<p>No tienes reservas activas registradas.</p>";

            return;
        }

        reservations.forEach(
            reservation => {

                const element =
                    document.createElement(
                        "article"
                    );

                element.className =
                    "reservation-card";

                element.dataset.id = reservation.id;
                element.dataset.fechaFin = reservation.fecha_fin;

                const total =
                    Number(
                        reservation.total_pago
                    ) || 0;

                const estadoReserva = (reservation.estado || "pendiente").toLowerCase();
                const estadoClase = `badge-status badge-${estadoReserva}`;

                // Reglas actualizadas:
                // Solo se puede EDITAR si la reserva está 'pendiente'
                const sePuedeEditar = estadoReserva === "pendiente";
                // Se puede CANCELAR si está 'pendiente' o 'confirmada'
                const sePuedeCancelar = estadoReserva === "pendiente" || estadoReserva === "confirmada";

                element.innerHTML = `
                    <div class="reservation-card-header">
                        <h3>${escaparHtml(reservation.titulo)}</h3>
                        <span class="${estadoClase}">${escaparHtml(reservation.estado)}</span>
                    </div>

                    <p class="reservation-details">
                        <strong>Marca/Modelo:</strong> ${escaparHtml(reservation.marca)} ${escaparHtml(reservation.modelo)}
                    </p>

                    <p class="reservation-details">
                        <strong>Inicio:</strong> ${formatearFecha(reservation.fecha_inicio)}
                    </p>

                    <p class="reservation-details">
                        <strong>Fin:</strong> ${formatearFecha(reservation.fecha_fin)}
                    </p>

                    ${
                        sePuedeEditar
                            ? `
                                <div id="form-edit-${reservation.id}" class="edit-reservation-form" hidden style="margin-top: 10px; padding: 10px; border-top: 1px solid #ccc;">
                                    <label>Nueva fecha inicio:
                                        <input type="datetime-local" id="edit-inicio-${reservation.id}" value="${reservation.fecha_inicio ? reservation.fecha_inicio.slice(0, 16) : ''}">
                                    </label>
                                    <br>
                                    <label>Nueva fecha fin:
                                        <input type="datetime-local" id="edit-fin-${reservation.id}" value="${reservation.fecha_fin ? reservation.fecha_fin.slice(0, 16) : ''}">
                                    </label>
                                    <br>
                                    <button type="button" class="btn btn-primary" onclick="guardarEdicionReserva(${reservation.id})">Guardar cambios</button>
                                    <button type="button" class="btn btn-secondary" onclick="alternarModoEdicion(${reservation.id})">Cancelar</button>
                                </div>
                              `
                            : ''
                    }

                    <div class="reservation-card-footer" style="margin-top: 10px; display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
                        <strong class="reservation-total">
                            Total: $${total.toLocaleString("es-CO")}
                        </strong>

                        ${
                            sePuedeEditar
                                ? `
                                    <button 
                                        type="button" 
                                        class="btn btn-warning btn-edit-res" 
                                        onclick="alternarModoEdicion(${reservation.id})"
                                    >
                                        Editar fechas
                                    </button>
                                  `
                                : ''
                        }

                        ${
                            sePuedeCancelar
                                ? `
                                    <button 
                                        type="button" 
                                        class="btn btn-danger btn-cancel-res" 
                                        onclick="cancelarReserva(${reservation.id})"
                                    >
                                        Cancelar reserva
                                    </button>
                                  `
                                : `
                                    <button 
                                        type="button" 
                                        class="btn btn-secondary" 
                                        disabled
                                    >
                                        ${escaparHtml(reservation.estado)}
                                    </button>
                                  `
                        }
                    </div>
                `;

                container.appendChild(
                    element
                );
            }
        );

    } catch (error) {

        console.error(
            "Error cargando reservas:",
            error
        );

        container.innerHTML =
            "<p>Error conectando con el servidor.</p>";
    }
}

async function guardarEdicionReserva(reservationId) {
    const inputInicio = document.querySelector(`#edit-inicio-${reservationId}`);
    const inputFin = document.querySelector(`#edit-fin-${reservationId}`);

    if (!inputInicio || !inputFin || !inputInicio.value || !inputFin.value) {
        mostrarNotificacion("Debes seleccionar ambas fechas.", "error");
        return;
    }

    try {
        const response = await fetch(`${API_URL}/reservations/${encodeURIComponent(reservationId)}`, {
            method: "PUT",
            headers: {
                ...headersAuth(),
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                fecha_inicio: inputInicio.value,
                fecha_fin: inputFin.value
            })
        });

        const data = await response.json();

        if (!response.ok) {
            mostrarNotificacion(data.mensaje || "Error actualizando la reserva.", "error");
            if (response.status === 401) cerrarSesion();
            return;
        }

        mostrarNotificacion("Reserva actualizada con éxito.", "success");
        await cargarReservas();
    } catch (error) {
        console.error("Error al editar reserva:", error);
        mostrarNotificacion("Error de conexión al intentar actualizar la reserva.", "error");
    }
}

function alternarModoEdicion(reservationId) {
    const editForm = document.querySelector(`#form-edit-${reservationId}`);
    if (editForm) {
        editForm.hidden = !editForm.hidden;
    }
}

async function cancelarReserva(reservationId) {

    const confirmacion = window.confirm(
        "¿Estás seguro de que deseas cancelar esta reserva? Esta acción no se puede deshacer."
    );

    if (!confirmacion) {
        return;
    }

    try {

        const response = await fetch(
            `${API_URL}/reservations/${encodeURIComponent(reservationId)}/cancel`,
            {
                method: "PATCH",
                headers: {
                    ...headersAuth(),
                    "Content-Type": "application/json"
                }
            }
        );

        const data = await response.json();

        if (!response.ok) {
            mostrarNotificacion(
                data.mensaje || "No se pudo cancelar la reserva.",
                "error"
            );

            if (response.status === 401) {
                cerrarSesion();
            }
            return;
        }

        mostrarNotificacion(
            "Reserva cancelada exitosamente.",
            "success"
        );

        await cargarReservas();

    } catch (error) {

        console.error("Error cancelando la reserva:", error);
        mostrarNotificacion(
            "Error de conexión al intentar cancelar la reserva.",
            "error"
        );
    }
}

// Función auxiliar para que los propietarios puedan abrir las licencias de sus clientes
async function abrirLicenciaPropietario(urlDocumento) {
    const token = localStorage.getItem("masterdriver_token");
    try {
        const res = await fetch(urlDocumento, {
            headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) {
            alert("No fue posible cargar el documento o no tienes autorización.");
            return;
        }
        const blob = await res.blob();
        const blobUrl = URL.createObjectURL(blob);
        window.open(blobUrl, "_blank");
    } catch (err) {
        alert("Error al intentar abrir el documento.");
    }
}

function mostrarNotificacion(mensaje, tipo = "info") {
    const alertContainer = document.querySelector("#reservationAlertContainer");
    if (!alertContainer) {
        alert(mensaje);
        return;
    }

    alertContainer.innerHTML = `
        <div class="auth-message ${tipo === 'error' ? 'error' : 'success'}">
            ${escaparHtml(mensaje)}
        </div>
    `;

    setTimeout(() => {
        alertContainer.innerHTML = "";
    }, 5000);
}

function actualizarEstadisticas(reservations) {

    const totalReservations =
        document.querySelector(
            "#totalReservations"
        );

    const pendingReservations =
        document.querySelector(
            "#pendingReservations"
        );

    const confirmedReservations =
        document.querySelector(
            "#confirmedReservations"
        );

    const pendientes =
        reservations.filter(
            reservation =>
                reservation.estado ===
                "pendiente"
        ).length;

    const confirmadas =
        reservations.filter(
            reservation =>
                reservation.estado ===
                "confirmada"
        ).length;

    const activas = pendientes + confirmadas;

    if (totalReservations) {
        totalReservations.textContent =
            activas;
    }

    if (pendingReservations) {
        pendingReservations.textContent =
            pendientes;
    }

    if (confirmedReservations) {
        confirmedReservations.textContent =
            confirmadas;
    }
}

function formatearFecha(fecha) {

    if (!fecha) {
        return "No disponible";
    }

    const fechaFormateada =
        new Date(fecha);

    if (Number.isNaN(fechaFormateada.getTime())) {
        return fecha;
    }

    return fechaFormateada.toLocaleString(
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

    const element =
        document.createElement(
            "div"
        );

    element.textContent =
        valor ?? "";

    return element.innerHTML;
}