// =====================================================
// MASTERDRIVER - LOGIN
// =====================================================

const API_URL = "/api";

// =====================================================
// ESPERAR A QUE CARGUE EL DOM
// =====================================================

document.addEventListener("DOMContentLoaded", () => {
    console.log("login.js cargado correctamente.");

    // =================================================
    // OBTENER ELEMENTOS
    // =================================================

    const loginForm = document.getElementById("loginForm");
    const mensaje = document.getElementById("mensaje");
    const btnLogin = document.getElementById("btnLogin");

    // =================================================
    // COMPROBAR ELEMENTOS
    // =================================================

    if (!loginForm) {
        console.error("No se encontró #loginForm");
        return;
    }

    // Cargar correo si viene redireccionado del registro
    const urlParams = new URLSearchParams(window.location.search);
    const correoRegistrado = urlParams.get("correo");
    if (correoRegistrado) {
        const loginCorreoInput = document.getElementById("loginCorreo");
        if (loginCorreoInput) {
            loginCorreoInput.value = correoRegistrado;
            mostrarMensaje("Cuenta creada exitosamente. Ingresa tu contraseña para iniciar sesión.", "success");
        }
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
    // CAMBIAR ESTADO DEL BOTÓN LOGIN
    // =================================================

    function cambiarEstadoLogin(cargando) {
        if (!btnLogin) return;
        btnLogin.disabled = cargando;
        if (cargando) {
            btnLogin.dataset.textoOriginal = btnLogin.textContent;
            btnLogin.textContent = "Iniciando sesión...";
        } else {
            btnLogin.textContent = btnLogin.dataset.textoOriginal || "Iniciar Sesión";
        }
    }

    // =================================================
    // LOGIN
    // =================================================

    loginForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        console.log("Formulario de login enviado.");
        ocultarMensaje();

        const correo = document.getElementById("loginCorreo").value.trim().toLowerCase();
        const password = document.getElementById("loginPassword").value;

        if (!correo) {
            mostrarMensaje("Ingresa tu correo electrónico.");
            return;
        }

        if (!password) {
            mostrarMensaje("Ingresa tu contraseña.");
            return;
        }

        cambiarEstadoLogin(true);

        try {
            const response = await fetch(`${API_URL}/login`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ correo, password })
            });

            const data = await response.json();
            console.log("Respuesta login:", data);

            if (response.ok && data.ok) {
                localStorage.setItem("masterdriver_token", data.token);
                localStorage.setItem("masterdriver_usuario", JSON.stringify(data.user || data.usuario));

                mostrarMensaje("Inicio de sesión exitoso. Redirigiendo...", "success");

                setTimeout(() => {
                    window.location.href = "catalog.html";
                }, 700);

                return;
            }

            if (response.status === 401) {
                mostrarMensaje(
                    data.mensaje || "La cuenta no existe o el correo y la contraseña son incorrectos."
                );
                return;
            }

            if (response.status === 400) {
                mostrarMensaje(data.mensaje || "Los datos ingresados no son válidos.");
                return;
            }

            mostrarMensaje(data.mensaje || "Ocurrió un error al iniciar sesión.");

        } catch (error) {
            console.error("Error haciendo login:", error);
            mostrarMensaje(
                "No se pudo conectar con el servidor. Verifica que MasterDriver esté ejecutándose."
            );
        } finally {
            cambiarEstadoLogin(false);
        }
    });

    // Comprobar si existe sesión
    const token = localStorage.getItem("masterdriver_token");
    if (token) {
        console.log("Existe una sesión almacenada.");
    }
});