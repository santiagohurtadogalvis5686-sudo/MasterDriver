const API_URL = "http://localhost:3000/api";

function obtenerToken() {
    return localStorage.getItem("masterdriver_token");
}

function obtenerUsuario() {

    const usuario =
        localStorage.getItem(
            "masterdriver_usuario"
        );

    return usuario
        ? JSON.parse(usuario)
        : null;
}

function guardarSesion(data) {

    localStorage.setItem(
        "masterdriver_token",
        data.token
    );

    localStorage.setItem(
        "masterdriver_usuario",
        JSON.stringify(data.usuario)
    );
}

function cerrarSesion() {

    const token =
        obtenerToken();

    if (token) {

        fetch(
            `${API_URL}/auth/logout`,
            {
                method: "POST",

                headers: {
                    Authorization:
                        `Bearer ${token}`
                }
            }
        );
    }

    localStorage.removeItem(
        "masterdriver_token"
    );

    localStorage.removeItem(
        "masterdriver_usuario"
    );

    window.location.href =
        "login.html";
}

function headersAuth() {

    return {
        Authorization:
            `Bearer ${obtenerToken()}`
    };
}

function usuarioAutenticado() {

    return Boolean(
        obtenerToken()
    );
}