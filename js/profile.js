document.addEventListener("DOMContentLoaded", () => {
    const profileForm = document.getElementById("profileForm");
    const profileMessage = document.getElementById("profileMessage");
    const btnLogout = document.getElementById("btnLogout");
    const profileName = document.getElementById("profileName");
    const profileEmail = document.getElementById("profileEmail");
    const avatarInitials = document.getElementById("avatarInitials");
    const profileHeaderName = document.getElementById("profileHeaderName");
    const profileHeaderEmail = document.getElementById("profileHeaderEmail");

    const token = localStorage.getItem("masterdriver_token");
    const storedUser = readStoredUser();

    if (!token || !storedUser) {
        window.location.replace("login.html");
        return;
    }

    renderUser(storedUser);
    loadProfile(token);

    profileForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        const nombre = profileName.value.trim();
        const correo = profileEmail.value.trim().toLowerCase();

        if (!nombre || !correo || !profileForm.checkValidity()) {
            profileForm.reportValidity();
            showMessage("Completa correctamente los campos obligatorios.", "error");
            return;
        }

        try {
            const response = await fetch("/api/profile", {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ nombre, correo })
            });
            const data = await response.json();

            if (!response.ok || !data.ok) {
                throw new Error(data.mensaje || "No se pudo actualizar el perfil.");
            }

            const updatedUser = { ...readStoredUser(), nombre, correo };
            localStorage.setItem("masterdriver_usuario", JSON.stringify(updatedUser));
            renderUser(updatedUser);
            showMessage("Perfil actualizado correctamente.", "success");
        } catch (error) {
            showMessage(error.message || "No se pudo guardar el perfil.", "error");
        }
    });

    btnLogout.addEventListener("click", () => {
        localStorage.removeItem("masterdriver_token");
        localStorage.removeItem("masterdriver_usuario");
        window.location.replace("login.html");
    });

    async function loadProfile(sessionToken) {
        try {
            const response = await fetch("/api/profile", {
                headers: { Authorization: `Bearer ${sessionToken}` }
            });
            const data = await response.json();

            if (response.status === 401) {
                btnLogout.click();
                return;
            }
            if (response.ok && data.ok && data.user) {
                const user = { ...readStoredUser(), ...data.user };
                localStorage.setItem("masterdriver_usuario", JSON.stringify(user));
                renderUser(user);
            }
        } catch (_) {
            showMessage("Mostrando la información guardada localmente.", "error");
        }
    }

    function readStoredUser() {
        try {
            const user = JSON.parse(localStorage.getItem("masterdriver_usuario"));
            return user && typeof user === "object" ? user : null;
        } catch (_) {
            localStorage.removeItem("masterdriver_usuario");
            return null;
        }
    }

    function renderUser(user) {
        const nombre = user.nombre || "Usuario";
        profileName.value = user.nombre || "";
        profileEmail.value = user.correo || "";
        profileHeaderName.textContent = nombre;
        profileHeaderEmail.textContent = user.correo || "";
        avatarInitials.textContent = nombre.charAt(0).toUpperCase();
    }

    function showMessage(text, type) {
        profileMessage.textContent = text;
        profileMessage.className = `auth-message ${type}`;
        profileMessage.style.display = "block";
    }
});
