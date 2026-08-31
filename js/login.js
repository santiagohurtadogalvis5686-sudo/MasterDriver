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
    const registerForm = document.getElementById("registerForm");
    const mensaje = document.getElementById("mensaje");
    const btnLogin = document.getElementById("btnLogin");
    const btnRegister = document.getElementById("btnRegister");

    // =================================================
    // COMPROBAR ELEMENTOS
    // =================================================

    if (!loginForm) {
        console.error("No se encontró #loginForm");
        return;
    }

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
            // Se corrigió el endpoint: /api/login en lugar de /api/auth/login
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
            // Se corrigió el endpoint: /api/register en lugar de /api/auth/register
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
                    "Cuenta creada correctamente. Ahora puedes iniciar sesión.",
                    "success"
                );

                registerForm.reset();

                const loginCorreo = document.getElementById("loginCorreo");
                if (loginCorreo) {
                    loginCorreo.value = correo;
                }

                setTimeout(() => {
                    const loginPassword = document.getElementById("loginPassword");
                    if (loginPassword) {
                        loginPassword.focus();
                    }
                }, 300);

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

    // Comprobar si existe sesión
    const token = localStorage.getItem("masterdriver_token");
    if (token) {
        console.log("Existe una sesión almacenada.");
    }
});