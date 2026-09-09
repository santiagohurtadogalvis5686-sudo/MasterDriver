// =====================================================
// MASTERDRIVER - REGISTRO
// =====================================================

const API_URL = "/api";

// =====================================================
// ESPERAR A QUE CARGUE EL DOM
// =====================================================

document.addEventListener("DOMContentLoaded", () => {
    console.log("register.js cargado correctamente.");

    // =================================================
    // OBTENER ELEMENTOS
    // =================================================

    const registerForm = document.getElementById("registerForm");
    const mensaje = document.getElementById("mensaje");
    const btnRegister = document.getElementById("btnRegister");

    // =================================================
    // COMPROBAR ELEMENTOS
    // =================================================

    if (!registerForm) {
        console.error("No se encontró #registerForm");
        return;
    }

    // =================================================
    // FUNCIÓN PARA MOSTRAR MENSAJES
    // =================================================

    function mostrarMensaje(texto, tipo = "error") {
        if (!mensaje) return;
        mensaje.textContent = texto;
        mensaje.hidden = false;
        mensaje.className = "auth-message " + tipo;
    }

    // =================================================
    // OCULTAR MENSAJE
    // =================================================

    function ocultarMensaje() {
        if (!mensaje) return;
        mensaje.textContent = "";
        mensaje.hidden = true;
    }

    // =================================================
    // CAMBIAR ESTADO DEL BOTÓN REGISTRO
    // =================================================

    function cambiarEstadoRegistro(cargando) {
        if (!btnRegister) return;
        btnRegister.disabled = cargando;
        if (cargando) {
            btnRegister.dataset.textoOriginal = btnRegister.textContent;
            btnRegister.textContent = "Creando cuenta...";
        } else {
            btnRegister.textContent = btnRegister.dataset.textoOriginal || "Crear Cuenta";
        }
    }

    // =================================================
    // REGISTRO
    // =================================================

    registerForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        console.log("Formulario de registro enviado.");
        ocultarMensaje();

        const nombre = document.getElementById("registerNombre").value.trim();
        const correo = document.getElementById("registerCorreo").value.trim().toLowerCase();
        const password = document.getElementById("registerPassword").value;

        if (!nombre) {
            mostrarMensaje("Ingresa tu nombre.");
            return;
        }

        if (!correo) {
            mostrarMensaje("Ingresa tu correo electrónico.");
            return;
        }

        if (!password) {
            mostrarMensaje("Ingresa una contraseña.");
            return;
        }

        if (password.length < 6) {
            mostrarMensaje("La contraseña debe tener mínimo 6 caracteres.");
            return;
        }

        cambiarEstadoRegistro(true);

        try {
            const response = await fetch(`${API_URL}/register`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ nombre, correo, password })
            });

            const data = await response.json();
            console.log("Respuesta registro:", data);

            if ((response.status === 200 || response.status === 201) && data.ok) {
                mostrarMensaje(
                    "Cuenta creada correctamente. Redirigiendo al inicio de sesión...",
                    "success"
                );

                registerForm.reset();

                setTimeout(() => {
                    window.location.href = `/html/login.html?correo=${encodeURIComponent(correo)}`;
                }, 1200);

                return;
            }

            if (response.status === 400) {
                mostrarMensaje(data.mensaje || "El correo electrónico ya está registrado o faltan datos.");
                return;
            }

            mostrarMensaje(data.mensaje || "No se pudo crear la cuenta.");

        } catch (error) {
            console.error("Error registrando usuario:", error);
            mostrarMensaje(
                "No se pudo conectar con el servidor. Verifica que MasterDriver esté ejecutándose."
            );
        } finally {
            cambiarEstadoRegistro(false);
        }
    });
});