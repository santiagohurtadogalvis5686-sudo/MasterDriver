// =====================================================
// MASTERDRIVER - LOGIN
// =====================================================

// URL base de la API.
//
// Como el frontend y el backend están siendo servidos
// desde el mismo servidor Express:
//
// http://localhost:3000
//
// Por eso podemos utilizar rutas relativas:
//
// /api/auth/login
// /api/auth/register

const API_URL = "/api";


// =====================================================
// ESPERAR A QUE CARGUE EL DOM
// =====================================================

document.addEventListener(
    "DOMContentLoaded",
    () => {

        console.log(
            "login.js cargado correctamente."
        );


        // =================================================
        // OBTENER ELEMENTOS
        // =================================================

        const loginForm =
            document.getElementById(
                "loginForm"
            );

        const registerForm =
            document.getElementById(
                "registerForm"
            );

        const mensaje =
            document.getElementById(
                "mensaje"
            );

        const btnLogin =
            document.getElementById(
                "btnLogin"
            );

        const btnRegister =
            document.getElementById(
                "btnRegister"
            );


        // =================================================
        // COMPROBAR ELEMENTOS
        // =================================================

        if (!loginForm) {

            console.error(
                "No se encontró #loginForm"
            );

            return;
        }

        if (!registerForm) {

            console.error(
                "No se encontró #registerForm"
            );

            return;
        }


        // =================================================
        // FUNCIÓN PARA MOSTRAR MENSAJES
        // =================================================

        function mostrarMensaje(
            texto,
            tipo = "error"
        ) {

            if (!mensaje) {
                return;
            }

            mensaje.textContent =
                texto;

            mensaje.hidden = false;

            mensaje.className =
                "auth-message " + tipo;
        }


        // =================================================
        // OCULTAR MENSAJE
        // =================================================

        function ocultarMensaje() {

            if (!mensaje) {
                return;
            }

            mensaje.textContent = "";

            mensaje.hidden = true;
        }


        // =================================================
        // CAMBIAR ESTADO DEL BOTÓN LOGIN
        // =================================================

        function cambiarEstadoLogin(
            cargando
        ) {

            if (!btnLogin) {
                return;
            }

            btnLogin.disabled =
                cargando;

            if (cargando) {

                btnLogin.dataset
                    .textoOriginal =
                    btnLogin.textContent;

                btnLogin.textContent =
                    "Iniciando sesión...";

            } else {

                btnLogin.textContent =
                    btnLogin.dataset
                        .textoOriginal ||
                    "Iniciar Sesión";
            }
        }


        // =================================================
        // CAMBIAR ESTADO DEL BOTÓN REGISTRO
        // =================================================

        function cambiarEstadoRegistro(
            cargando
        ) {

            if (!btnRegister) {
                return;
            }

            btnRegister.disabled =
                cargando;

            if (cargando) {

                btnRegister.dataset
                    .textoOriginal =
                    btnRegister.textContent;

                btnRegister.textContent =
                    "Creando cuenta...";

            } else {

                btnRegister.textContent =
                    btnRegister.dataset
                        .textoOriginal ||
                    "Crear Cuenta";
            }
        }


        // =================================================
        // LOGIN
        // =================================================

        loginForm.addEventListener(
            "submit",
            async (event) => {

                // Evita que el navegador
                // recargue la página.

                event.preventDefault();

                console.log(
                    "Formulario de login enviado."
                );

                ocultarMensaje();

                // ==========================================
                // OBTENER DATOS
                // ==========================================

                const correo =
                    document
                        .getElementById(
                            "loginCorreo"
                        )
                        .value
                        .trim()
                        .toLowerCase();

                const password =
                    document
                        .getElementById(
                            "loginPassword"
                        )
                        .value;


                // ==========================================
                // VALIDACIÓN
                // ==========================================

                if (!correo) {

                    mostrarMensaje(
                        "Ingresa tu correo electrónico."
                    );

                    return;
                }

                if (!password) {

                    mostrarMensaje(
                        "Ingresa tu contraseña."
                    );

                    return;
                }


                // ==========================================
                // ACTIVAR BOTÓN
                // ==========================================

                cambiarEstadoLogin(
                    true
                );


                try {

                    // ======================================
                    // PETICIÓN AL BACKEND
                    // ======================================

                    const response =
                        await fetch(
                            `${API_URL}/auth/login`,
                            {

                                method:
                                    "POST",

                                headers: {

                                    "Content-Type":
                                        "application/json"
                                },

                                body:
                                    JSON.stringify({

                                        correo,

                                        password
                                    })
                            }
                        );


                    // ======================================
                    // OBTENER RESPUESTA
                    // ======================================

                    const data =
                        await response
                            .json();


                    console.log(
                        "Respuesta login:",
                        data
                    );


                    // ======================================
                    // LOGIN CORRECTO
                    // ======================================

                    if (
                        response.ok &&
                        data.ok
                    ) {

                        // Guardar token

                        localStorage.setItem(
                            "masterdriver_token",
                            data.token
                        );


                        // Guardar usuario

                        localStorage.setItem(
                            "masterdriver_usuario",
                            JSON.stringify(
                                data.usuario
                            )
                        );


                        mostrarMensaje(
                            "Inicio de sesión exitoso. Redirigiendo...",
                            "success"
                        );


                        // ==================================
                        // REDIRECCIÓN
                        // ==================================

                        setTimeout(
                            () => {

                                window.location.href =
                                    "catalog.html";

                            },
                            700
                        );


                        return;
                    }


                    // ======================================
                    // CUENTA NO EXISTE / CREDENCIALES
                    // ======================================

                    if (
                        response.status === 401
                    ) {

                        mostrarMensaje(
                            "La cuenta no existe o el correo y la contraseña son incorrectos. Si aún no tienes una cuenta, regístrate para continuar."
                        );

                        return;
                    }


                    // ======================================
                    // ERROR DE VALIDACIÓN
                    // ======================================

                    if (
                        response.status === 400
                    ) {

                        mostrarMensaje(
                            data.mensaje ||
                            "Los datos ingresados no son válidos."
                        );

                        return;
                    }


                    // ======================================
                    // OTROS ERRORES
                    // ======================================

                    mostrarMensaje(
                        data.mensaje ||
                        "Ocurrió un error al iniciar sesión."
                    );

                } catch (error) {

                    console.error(
                        "Error haciendo login:",
                        error
                    );


                    mostrarMensaje(
                        "No se pudo conectar con el servidor. Verifica que MasterDriver esté ejecutándose."
                    );

                } finally {

                    cambiarEstadoLogin(
                        false
                    );
                }
            }
        );


        // =================================================
        // REGISTRO
        // =================================================

        registerForm.addEventListener(
            "submit",
            async (event) => {

                // Evitar recarga

                event.preventDefault();

                console.log(
                    "Formulario de registro enviado."
                );

                ocultarMensaje();


                // ==========================================
                // OBTENER DATOS
                // ==========================================

                const nombre =
                    document
                        .getElementById(
                            "registerNombre"
                        )
                        .value
                        .trim();

                const correo =
                    document
                        .getElementById(
                            "registerCorreo"
                        )
                        .value
                        .trim()
                        .toLowerCase();

                const password =
                    document
                        .getElementById(
                            "registerPassword"
                        )
                        .value;


                // ==========================================
                // VALIDACIONES
                // ==========================================

                if (!nombre) {

                    mostrarMensaje(
                        "Ingresa tu nombre."
                    );

                    return;
                }


                if (!correo) {

                    mostrarMensaje(
                        "Ingresa tu correo electrónico."
                    );

                    return;
                }


                if (!password) {

                    mostrarMensaje(
                        "Ingresa una contraseña."
                    );

                    return;
                }


                if (
                    password.length < 6
                ) {

                    mostrarMensaje(
                        "La contraseña debe tener mínimo 6 caracteres."
                    );

                    return;
                }


                // ==========================================
                // ACTIVAR BOTÓN
                // ==========================================

                cambiarEstadoRegistro(
                    true
                );


                try {

                    // ======================================
                    // PETICIÓN AL BACKEND
                    // ======================================

                    const response =
                        await fetch(
                            `${API_URL}/auth/register`,
                            {

                                method:
                                    "POST",

                                headers: {

                                    "Content-Type":
                                        "application/json"
                                },

                                body:
                                    JSON.stringify({

                                        nombre,

                                        correo,

                                        password
                                    })
                            }
                        );


                    // ======================================
                    // RESPUESTA
                    // ======================================

                    const data =
                        await response
                            .json();


                    console.log(
                        "Respuesta registro:",
                        data
                    );


                    // ======================================
                    // REGISTRO CORRECTO
                    // ======================================

                    if (
                        response.status === 201 &&
                        data.ok
                    ) {

                        mostrarMensaje(
                            "Cuenta creada correctamente. Ahora puedes iniciar sesión.",
                            "success"
                        );


                        // Limpiar formulario

                        registerForm.reset();


                        // Copiar correo
                        // al login

                        const loginCorreo =
                            document
                                .getElementById(
                                    "loginCorreo"
                                );

                        if (
                            loginCorreo
                        ) {

                            loginCorreo.value =
                                correo;
                        }


                        // ==================================
                        // Llevar foco al login
                        // ==================================

                        setTimeout(
                            () => {

                                const loginPassword =
                                    document
                                        .getElementById(
                                            "loginPassword"
                                        );

                                if (
                                    loginPassword
                                ) {

                                    loginPassword
                                        .focus();
                                }

                            },
                            300
                        );


                        return;
                    }


                    // ======================================
                    // CORREO YA REGISTRADO
                    // ======================================

                    if (
                        response.status === 409
                    ) {

                        mostrarMensaje(
                            "Este correo ya está registrado. Intenta iniciar sesión."
                        );

                        return;
                    }


                    // ======================================
                    // ERROR 400
                    // ======================================

                    if (
                        response.status === 400
                    ) {

                        mostrarMensaje(
                            data.mensaje ||
                            "Los datos de registro no son válidos."
                        );

                        return;
                    }


                    // ======================================
                    // OTRO ERROR
                    // ======================================

                    mostrarMensaje(
                        data.mensaje ||
                        "No se pudo crear la cuenta."
                    );

                } catch (error) {

                    console.error(
                        "Error registrando usuario:",
                        error
                    );


                    mostrarMensaje(
                        "No se pudo conectar con el servidor. Verifica que MasterDriver esté ejecutándose."
                    );

                } finally {

                    cambiarEstadoRegistro(
                        false
                    );
                }
            }
        );


        // =================================================
        // COMPROBAR SI YA EXISTE UNA SESIÓN
        // =================================================

        const token =
            localStorage.getItem(
                "masterdriver_token"
            );


        if (token) {

            console.log(
                "Existe una sesión almacenada."
            );

            // No redirigimos automáticamente aquí.
            // El usuario todavía puede estar en la pantalla
            // de login voluntariamente.
        }

    }
);