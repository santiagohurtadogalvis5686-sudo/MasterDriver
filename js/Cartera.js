document.addEventListener("DOMContentLoaded", () => {
    // Usar las mismas claves globales definidas en el proyecto / app.js
    const token = localStorage.getItem("masterdriver_token") || localStorage.getItem("token");

    if (!token) {
        window.location.href = "login.html";
        return;
    }

    // Elementos DOM
    const walletBalanceDisplay = document.getElementById("walletBalanceDisplay");
    const walletStatusBadge = document.getElementById("walletStatusBadge");
    const walletAlertBox = document.getElementById("walletAlertBox");
    const walletAlertText = document.getElementById("walletAlertText");
    const walletTransactionsTable = document.getElementById("walletTransactionsTable");
    const rechargeModal = document.getElementById("rechargeModal");
    const btnOpenRechargeModal = document.getElementById("btnOpenRechargeModal");
    const btnCloseRechargeModal = document.getElementById("btnCloseRechargeModal");
    const btnCancelRecharge = document.getElementById("btnCancelRecharge");
    const rechargeForm = document.getElementById("rechargeForm");

    // Cargar información de la cartera al iniciar
    cargarCartera();

    // Eventos Modal
    if (btnOpenRechargeModal) {
        btnOpenRechargeModal.addEventListener("click", () => {
            rechargeModal.classList.remove("hidden");
        });
    }

    if (btnCloseRechargeModal) {
        btnCloseRechargeModal.addEventListener("click", () => {
            rechargeModal.classList.add("hidden");
        });
    }

    if (btnCancelRecharge) {
        btnCancelRecharge.addEventListener("click", () => {
            rechargeModal.classList.add("hidden");
        });
    }

    // Envío de Recarga
    if (rechargeForm) {
        rechargeForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const monto = document.getElementById("rechargeAmount").value;
            const metodo = document.getElementById("rechargeMethod").value;

            if (!monto || parseFloat(monto) <= 0) {
                mostrarToast("Por favor ingresa un monto válido.", "error");
                return;
            }

            try {
                const response = await fetch("/api/wallet/recharge", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}`
                    },
                    body: JSON.stringify({ monto, metodo })
                });

                const data = await response.json();

                if (data.ok) {
                    mostrarToast(data.mensaje, "success");
                    rechargeModal.classList.add("hidden");
                    rechargeForm.reset();
                    cargarCartera();
                } else {
                    mostrarToast(data.mensaje || "Error al procesar la recarga.", "error");
                }
            } catch (error) {
                console.error("Error realizando la recarga:", error);
                mostrarToast("Ocurrió un error de conexión al recargar.", "error");
            }
        });
    }

    // Cargar Datos desde el Servidor
    async function cargarCartera() {
        try {
            const response = await fetch("/api/wallet", {
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            });

            if (response.status === 401) {
                localStorage.removeItem("masterdriver_token");
                localStorage.removeItem("masterdriver_usuario");
                localStorage.removeItem("token");
                localStorage.removeItem("user");
                window.location.href = "login.html";
                return;
            }

            const data = await response.json();

            if (data.ok) {
                renderizarCartera(data);
            } else {
                mostrarToast(data.mensaje || "Error al cargar la cartera.", "error");
            }
        } catch (error) {
            console.error("Error al obtener la cartera:", error);
            mostrarToast("Error de conexión al cargar la cartera.", "error");
        }
    }

    function renderizarCartera(data) {
        if (!walletBalanceDisplay) return;

        // Renderizado del Saldo
        const saldoFormatted = new Intl.NumberFormat("es-CO", {
            style: "currency",
            currency: "COP",
            maximumFractionDigits: 0
        }).format(data.saldo);

        walletBalanceDisplay.textContent = saldoFormatted;

        // Renderizado del Badge de Estado
        if (walletStatusBadge && walletAlertBox && walletAlertText) {
            if (data.habilitada) {
                walletStatusBadge.className = "wallet-status-badge status-active";
                walletStatusBadge.textContent = "Habilitado (Mínimo $10.000 COP)";
                walletAlertBox.className = "alert-box alert-success";
                walletAlertText.textContent = "Tu cartera se encuentra activa y habilitada para aceptar y realizar reservas de vehículos.";
            } else {
                walletStatusBadge.className = "wallet-status-badge status-blocked";
                walletStatusBadge.textContent = "Bloqueado (< $10.000 COP)";
                walletAlertBox.className = "alert-box alert-warning";
                walletAlertText.textContent = data.estado_mensaje;
            }
            walletAlertBox.classList.remove("hidden");
        }

        // Renderizado del Historial de Transacciones
        if (walletTransactionsTable) {
            if (!data.transacciones || data.transacciones.length === 0) {
                walletTransactionsTable.innerHTML = `
                    <tr>
                        <td colspan="5" class="text-center empty-msg">No se registran movimientos en tu cartera aún.</td>
                    </tr>
                `;
                return;
            }

            walletTransactionsTable.innerHTML = data.transacciones.map(tx => {
                const fecha = new Date(tx.created_at).toLocaleString("es-CO", {
                    dateStyle: "medium",
                    timeStyle: "short"
                });

                let classTipo = "";
                let signo = "";

                if (tx.tipo === "recarga") {
                    classTipo = "badge-type-recharge";
                    signo = "+";
                } else if (tx.tipo === "comision") {
                    classTipo = "badge-type-commission";
                    signo = "-";
                } else if (tx.tipo === "devolucion") {
                    classTipo = "badge-type-refund";
                    signo = "+";
                }

                const montoFormateado = new Intl.NumberFormat("es-CO", {
                    style: "currency",
                    currency: "COP",
                    maximumFractionDigits: 0
                }).format(tx.monto);

                const saldoResultanteFormateado = new Intl.NumberFormat("es-CO", {
                    style: "currency",
                    currency: "COP",
                    maximumFractionDigits: 0
                }).format(tx.saldo_resultante);

                return `
                    <tr>
                        <td>${fecha}</td>
                        <td><span class="tx-badge ${classTipo}">${tx.tipo.toUpperCase()}</span></td>
                        <td>${tx.descripcion}</td>
                        <td class="tx-amount ${signo === '+' ? 'amount-positive' : 'amount-negative'}">
                            ${signo} ${montoFormateado}
                        </td>
                        <td>${saldoResultanteFormateado}</td>
                    </tr>
                `;
            }).join("");
        }
    }

    function mostrarToast(mensaje, tipo = "info") {
        const container = document.getElementById("toastContainer");
        if (!container) return;

        const toast = document.createElement("div");
        toast.className = `toast toast-${tipo}`;
        toast.textContent = mensaje;

        container.appendChild(toast);

        setTimeout(() => {
            toast.classList.add("fade-out");
            setTimeout(() => toast.remove(), 300);
        }, 4000);
    }
});