const API_URL = "http://localhost:3000/api";

function obtenerToken() {
    return localStorage.getItem("masterdriver_token");
}

function obtenerUsuario() {
    const usuario = localStorage.getItem("masterdriver_usuario");
    return usuario ? JSON.parse(usuario) : null;
}

function guardarSesion(data) {
    if (data.token) {
        localStorage.setItem("masterdriver_token", data.token);
    }
    const usuarioParaGuardar = data.user || data.usuario;
    if (usuarioParaGuardar) {
        localStorage.setItem(
            "masterdriver_usuario",
            JSON.stringify(usuarioParaGuardar)
        );
    }
}

function cerrarSesion() {
    localStorage.removeItem("masterdriver_token");
    localStorage.removeItem("masterdriver_usuario");
    window.location.href = "login.html";
}

function headersAuth() {
    return {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${obtenerToken()}`
    };
}

function usuarioAutenticado() {
    return Boolean(obtenerToken());
}