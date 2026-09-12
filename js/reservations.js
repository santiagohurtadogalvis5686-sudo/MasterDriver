let vehicleSelected = null;
let reservationData = null;
let expirationCheckInterval = null;
let countdownIntervals = {};

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

    const cancelButton =
        document.querySelector(
            "#cancelFormButton"
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

    if (cancelButton) {
        cancelButton.addEventListener(
            "click",
            descartarFormularioReserva
        );
    }

    const inputInicio = document.querySelector("#clientFechaInicio");
    const inputFin = document.querySelector("#clientFechaFin");

    if (inputInicio) {
        inputInicio.addEventListener("change", calcularTotalCliente);
    }
    if (inputFin) {
        inputFin.addEventListener("change", calcularTotalCliente);
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

function descartarFormularioReserva() {
    localStorage.removeItem("vehicle_to_reserve");
    vehicleSelected = null;
    reservationData = null;
    const formSection = document.querySelector("#reservationFormSection");
    if (formSection) {
        formSection.hidden = true;
    }
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
                formMessage.style.color = "#dc3545";
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
                formMessage.style.color = "#dc3545";
                formMessage.textContent =
                    "No puedes reservar un vehículo publicado por ti.";
            }

            return;
        }

        const precio =
            Number(vehicleSelected.precio) || 0;

        if (vehicleInfo) {
            vehicleInfo.textContent =
                `${vehicleSelected.titulo} · ${vehicleSelected.marca} ${vehicleSelected.modelo} · $${precio.toLocaleString("es-CO")} / hora`;
        }

        const now = new Date();
        const defaultStart = new Date(now.getTime() + (60 * 60 * 1000));
        const defaultEnd = new Date(defaultStart.getTime() + (2 * 60 * 60 * 1000));

        const formatForInput = (d) => {
            const tzOffset = d.getTimezoneOffset() * 60000;
            return new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
        };

        const inputInicio = document.querySelector("#clientFechaInicio");
        const inputFin = document.querySelector("#clientFechaFin");

        if (inputInicio && !inputInicio.value) {
            inputInicio.value = formatForInput(defaultStart);
        }
        if (inputFin && !inputFin.value) {
            inputFin.value = formatForInput(defaultEnd);
        }

        calcularTotalCliente();

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
            formMessage.style.color = "#dc3545";
            formMessage.textContent =
                "No se pudo conectar con el servidor.";
        }
    }
}

function calcularTotalCliente() {
    const totalElement = document.querySelector("#reservationTotal");
    const formMessage = document.querySelector("#reservationFormMessage");
    const inputInicio = document.querySelector("#clientFechaInicio");
    const inputFin = document.querySelector("#clientFechaFin");

    if (formMessage) formMessage.textContent = "";

    if (!vehicleSelected || !inputInicio || !inputFin) {
        reservationData = null;
        return;
    }

    const fechaInicioStr = inputInicio.value;
    const fechaFinStr = inputFin.value;

    if (!fechaInicioStr || !fechaFinStr) {
        if (totalElement) totalElement.textContent = "Total estimado: $0 COP";
        reservationData = null;
        return;
    }

    const fechaInicioReserva = new Date(fechaInicioStr);
    const fechaFinReserva = new Date(fechaFinStr);

    if (
        Number.isNaN(fechaInicioReserva.getTime()) ||
        Number.isNaN(fechaFinReserva.getTime())
    ) {
        if (totalElement) totalElement.textContent = "Total estimado: $0 COP";
        reservationData = null;
        return;
    }

    if (fechaFinReserva <= fechaInicioReserva) {
        if (formMessage) {
            formMessage.style.color = "#dc3545";
            formMessage.textContent = "La fecha de fin debe ser posterior a la fecha de inicio.";
        }
        if (totalElement) totalElement.textContent = "Total estimado: $0 COP";
        reservationData = null;
        return;
    }

    const diferenciaHoras = (fechaFinReserva - fechaInicioReserva) / (1000 * 60 * 60);
    const horas = Math.max(1, Math.ceil(diferenciaHoras));
    const precioPorHora = Number(vehicleSelected.precio) || 0;
    const totalPago = precioPorHora * horas;

    reservationData = {
        fecha_inicio: fechaInicioStr,
        fecha_fin: fechaFinStr,
        total_pago: totalPago
    };

    if (totalElement) {
        totalElement.textContent = `Total estimado (${horas} hr${horas > 1 ? 's' : ''}): $${totalPago.toLocaleString("es-CO")} COP`;
    }
}

function calcularNuevoTotalEdicion(reservationId, precioPorHora) {
    const inputInicio = document.querySelector(`#edit-inicio-${reservationId}`);
    const inputFin = document.querySelector(`#edit-fin-${reservationId}`);
    const totalLabel = document.querySelector(`#edit-total-preview-${reservationId}`);

    if (!inputInicio || !inputFin || !totalLabel) return;

    if (!inputInicio.value || !inputFin.value) {
        totalLabel.textContent = "Nuevo total: $0 COP";
        return;
    }

    const inicio = new Date(inputInicio.value);
    const fin = new Date(inputFin.value);

    if (isNaN(inicio.getTime()) || isNaN(fin.getTime()) || fin <= inicio) {
        totalLabel.textContent = "Rango de fechas inválido";
        totalLabel.style.color = "#dc3545";
        return;
    }

    totalLabel.style.color = "#2b6cb0";
    const diferenciaHoras = (fin - inicio) / (1000 * 60 * 60);
    const horas = Math.max(1, Math.ceil(diferenciaHoras));
    const nuevoTotal = horas * precioPorHora;

    totalLabel.textContent = `Nuevo total estimado (${horas} hr${horas > 1 ? 's' : ''}): $${nuevoTotal.toLocaleString("es-CO")} COP`;
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

    calcularTotalCliente();

    if (
        !vehicleSelected ||
        !reservationData
    ) {

        if (formMessage) {
            formMessage.style.color = "#dc3545";
            formMessage.textContent =
                "Selecciona un rango de fecha y hora válido para crear la reserva.";
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

            if (formMessage) {
                formMessage.style.color = "#dc3545";
                formMessage.style.fontWeight = "bold";
                formMessage.textContent =
                    data.mensaje ||
                    "No fue posible crear la reserva.";
            }

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

        if (formMessage) {
            formMessage.style.color = "#dc3545";
            formMessage.textContent =
                "No se pudo conectar con el servidor.";
        }

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

    // Preservar el estado y los valores introducidos por el usuario si está editando
    const activeEdits = {};
    document.querySelectorAll(".edit-reservation-form").forEach(form => {
        if (!form.hidden) {
            const resId = form.id.replace("form-edit-", "");
            const inicioInput = document.querySelector(`#edit-inicio-${resId}`);
            const finInput = document.querySelector(`#edit-fin-${resId}`);
            activeEdits[resId] = {
                inicio: inicioInput ? inicioInput.value : null,
                fin: finInput ? finInput.value : null
            };
        }
    });

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
                `<p style="color: #dc3545;">${escaparHtml(data.mensaje || "No fue posible cargar las reservas.")}</p>`;

            if (response.status === 401) {
                cerrarSesion();
            }

            return;
        }

        const rawReservations =
            Array.isArray(data.reservations)
                ? data.reservations
                : [];

        const now = new Date();

        const reservations = rawReservations.filter(reservation => {
            const estado = (reservation.estado || "").toLowerCase();
            if (estado === "cancelada") {
                return false;
            }

            if (estado === "rechazada") {
                const fechaActualizacion = new Date(reservation.updated_at || reservation.created_at);
                const diferenciaMs = now - fechaActualizacion;
                return diferenciaMs < (3 * 60 * 1000);
            }

            const fechaFin = new Date(reservation.fecha_fin);
            if (Number.isNaN(fechaFin.getTime())) {
                return true;
            }

            return fechaFin > now;
        });

        actualizarEstadisticas(
            reservations
        );

        // Limpiar temporizadores anteriores de la vista
        Object.keys(countdownIntervals).forEach(id => clearInterval(countdownIntervals[id]));
        countdownIntervals = {};

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

                const precioPorHora = Number(reservation.precio_por_hora) || 0;
                const estadoReserva = (reservation.estado || "pendiente").toLowerCase();
                const estadoClase = `badge-status badge-${estadoReserva}`;

                const sePuedeEditar = estadoReserva === "pendiente";
                const sePuedeCancelar = estadoReserva === "pendiente" || estadoReserva === "confirmada";

                const numeroWhatsapp = reservation.contacto_whatsapp
                    ? String(reservation.contacto_whatsapp).replace(/[^0-9]/g, "")
                    : "";

                const mostrarWhatsapp = estadoReserva === "confirmada" && numeroWhatsapp !== "";

                element.innerHTML = `
                    <div class="reservation-card-header">
                        <h3>${escaparHtml(reservation.titulo)}</h3>
                        <span class="${estadoClase}">${escaparHtml(reservation.estado)}</span>
                    </div>

                    ${
                        estadoReserva === "rechazada"
                            ? `<p id="timer-rechazada-${reservation.id}" style="color: #dc3545; font-weight: bold; font-size: 0.9rem; margin-top: 5px;"></p>`
                            : ''
                    }

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
                                <div id="form-edit-${reservation.id}" class="edit-reservation-form" hidden style="margin-top: 10px; padding: 15px; border-top: 1px solid #333; background-color: transparent; border-radius: 6px;">
                                    <label style="display: block; font-weight: bold; margin-bottom: 5px; color: #aaa;">Nueva fecha/hora inicio:
                                        <input type="datetime-local" id="edit-inicio-${reservation.id}" class="form-control" value="${reservation.fecha_inicio ? reservation.fecha_inicio.slice(0, 16) : ''}" onchange="calcularNuevoTotalEdicion(${reservation.id}, ${precioPorHora})" style="width: 100%; margin-top: 3px;">
                                    </label>
                                    <label style="display: block; font-weight: bold; margin-bottom: 5px; margin-top: 8px; color: #aaa;">Nueva fecha/hora fin:
                                        <input type="datetime-local" id="edit-fin-${reservation.id}" class="form-control" value="${reservation.fecha_fin ? reservation.fecha_fin.slice(0, 16) : ''}" onchange="calcularNuevoTotalEdicion(${reservation.id}, ${precioPorHora})" style="width: 100%; margin-top: 3px;">
                                    </label>
                                    <p id="edit-total-preview-${reservation.id}" style="font-weight: bold; color: #2b6cb0; margin-top: 10px; font-size: 1rem;">
                                        Nuevo total estimado: $${total.toLocaleString("es-CO")} COP
                                    </p>
                                    <div style="display: flex; gap: 8px; margin-top: 10px;">
                                        <button type="button" class="btn btn-primary" onclick="guardarEdicionReserva(${reservation.id})">Guardar cambios</button>
                                        <button type="button" class="btn btn-secondary" onclick="alternarModoEdicion(${reservation.id})">Cancelar</button>
                                    </div>
                                </div>
                              `
                            : ''
                    }

                    <div class="reservation-card-footer" style="margin-top: 10px; display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
                        <strong class="reservation-total">
                            Total: $${total.toLocaleString("es-CO")} COP
                        </strong>

                        ${
                            mostrarWhatsapp
                                ? `
                                    <a 
                                        href="https://wa.me/${numeroWhatsapp}" 
                                        target="_blank" 
                                        rel="noopener noreferrer" 
                                        class="btn btn-secondary"
                                        style="background-color: #25D366; color: white; border: none;"
                                    >
                                        Contactar por WhatsApp
                                    </a>
                                  `
                                : ''
                        }

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

                // Configurar el contador exacto para reservas rechazadas
                if (estadoReserva === "rechazada") {
                    iniciarContadorRechazada(reservation);
                }

                // Restaurar el formulario si el usuario lo estaba editando antes del refresco
                if (activeEdits[reservation.id]) {
                    const editForm = element.querySelector(`#form-edit-${reservation.id}`);
                    if (editForm) {
                        editForm.hidden = false;
                        if (activeEdits[reservation.id].inicio) {
                            element.querySelector(`#edit-inicio-${reservation.id}`).value = activeEdits[reservation.id].inicio;
                        }
                        if (activeEdits[reservation.id].fin) {
                            element.querySelector(`#edit-fin-${reservation.id}`).value = activeEdits[reservation.id].fin;
                        }
                        calcularNuevoTotalEdicion(reservation.id, precioPorHora);
                    }
                }
            }
        );

    } catch (error) {

        console.error(
            "Error cargando reservas:",
            error
        );

        container.innerHTML =
            "<p style='color: #dc3545;'>Error conectando con el servidor.</p>";
    }
}

function iniciarContadorRechazada(reservation) {
    const timerElem = document.querySelector(`#timer-rechazada-${reservation.id}`);
    if (!timerElem) return;

    const fechaRechazo = new Date(reservation.updated_at || reservation.created_at).getTime();
    const tiempoLimite = fechaRechazo + (3 * 60 * 1000);

    function actualizarTimer() {
        const ahora = Date.now();
        const restanteMs = tiempoLimite - ahora;

        if (restanteMs <= 0) {
            clearInterval(countdownIntervals[reservation.id]);
            cargarReservas();
            return;
        }

        const minutos = Math.floor(restanteMs / 60000);
        const segundos = Math.floor((restanteMs % 60000) / 1000);
        timerElem.textContent = `Esta reserva fue rechazada. Se eliminará en ${minutos}m ${segundos < 10 ? '0' : ''}${segundos}s`;
    }

    actualizarTimer();
    countdownIntervals[reservation.id] = setInterval(actualizarTimer, 1000);
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

        mostrarNotificacion("Las fechas y horas se editaron satisfactoriamente.", "success");
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

function mostrarNotificacion(mensaje, tipo = "info") {
    const alertContainer = document.querySelector("#reservationAlertContainer");
    if (!alertContainer) {
        alert(mensaje);
        return;
    }

    alertContainer.innerHTML = `
        <div class="auth-message ${tipo === 'error' ? 'error' : 'success'}" style="${tipo === 'error' ? 'color: #dc3545; font-weight: bold;' : ''}">
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