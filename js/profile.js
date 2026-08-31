document.addEventListener("DOMContentLoaded", () => {
    const profileForm = document.getElementById("profileForm");
    const profileMessage = document.getElementById("profileMessage");
    const btnLogout = document.getElementById("btnLogout");
    const profileName = document.getElementById("profileName");
    const profileEmail = document.getElementById("profileEmail");
    const profilePhone = document.getElementById("profilePhone");
    const avatarInitials = document.getElementById("avatarInitials");
    const profileHeaderName = document.getElementById("profileHeaderName");
    const profileHeaderEmail = document.getElementById("profileHeaderEmail");

    // Elementos de la Licencia
    const inputFileFrente = document.getElementById("inputFileFrente");
    const inputFileReverso = document.getElementById("inputFileReverso");
    const imgPreviewFrente = document.getElementById("imgPreviewFrente");
    const imgPreviewReverso = document.getElementById("imgPreviewReverso");
    const btnDeleteFrente = document.getElementById("btnDeleteFrente");
    const btnDeleteReverso = document.getElementById("btnDeleteReverso");
    const btnSaveLicense = document.getElementById("btnSaveLicense");

    const token = localStorage.getItem("masterdriver_token");
    const storedUser = readStoredUser();

    if (!token || !storedUser) {
        window.location.replace("login.html");
        return;
    }

    renderUser(storedUser);
    loadProfile(token);

    // Eventos de previsualización local
    inputFileFrente.addEventListener("change", (e) => handleFileSelect(e, imgPreviewFrente));
    inputFileReverso.addEventListener("change", (e) => handleFileSelect(e, imgPreviewReverso));

    // Guardar Perfil (Nombre, Correo, Teléfono)
    profileForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        const nombre = profileName.value.trim();
        const correo = profileEmail.value.trim().toLowerCase();
        const telefono = profilePhone.value.trim();

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
                body: JSON.stringify({ nombre, correo, telefono })
            });
            const data = await response.json();

            if (!response.ok || !data.ok) {
                throw new Error(data.mensaje || "No se pudo actualizar el perfil.");
            }

            const updatedUser = { ...readStoredUser(), nombre, correo, telefono };
            localStorage.setItem("masterdriver_usuario", JSON.stringify(updatedUser));
            renderUser(updatedUser);
            showMessage("Perfil actualizado correctamente.", "success");
        } catch (error) {
            showMessage(error.message || "No se pudo guardar el perfil.", "error");
        }
    });

    // Subir Archivos de Licencia
    btnSaveLicense.addEventListener("click", async () => {
        const fileFrente = inputFileFrente.files[0];
        const fileReverso = inputFileReverso.files[0];

        if (!fileFrente && !fileReverso) {
            showMessage("Selecciona al menos un documento (frente o reverso) para subir.", "error");
            return;
        }

        const formData = new FormData();
        if (fileFrente) formData.append("licencia_frente", fileFrente);
        if (fileReverso) formData.append("licencia_reverso", fileReverso);

        try {
            btnSaveLicense.disabled = true;
            btnSaveLicense.textContent = "Subiendo documentos...";

            const response = await fetch("/api/profile/license", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`
                },
                body: formData
            });

            const data = await response.json();
            if (!response.ok || !data.ok) {
                throw new Error(data.mensaje || "Error al subir documentos.");
            }

            showMessage("Licencia de conducir actualizada correctamente.", "success");
            inputFileFrente.value = "";
            inputFileReverso.value = "";
            await loadProfile(token);
        } catch (error) {
            showMessage(error.message || "Error al procesar la licencia.", "error");
        } finally {
            btnSaveLicense.disabled = false;
            btnSaveLicense.textContent = "Subir Documentos de Licencia";
        }
    });

    // Eliminar Licencia Frente
    btnDeleteFrente.addEventListener("click", () => deleteLicenseSide("frente"));
    // Eliminar Licencia Reverso
    btnDeleteReverso.addEventListener("click", () => deleteLicenseSide("reverso"));

    async function deleteLicenseSide(side) {
        if (!confirm(`¿Estás seguro de eliminar el ${side} de tu licencia?`)) return;

        try {
            const response = await fetch(`/api/profile/license/${side}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await response.json();

            if (!response.ok || !data.ok) {
                throw new Error(data.mensaje || "Error al eliminar el documento.");
            }

            showMessage(`Licencia (${side}) eliminada.`, "success");
            await loadProfile(token);
        } catch (error) {
            showMessage(error.message || "Error al eliminar.", "error");
        }
    }

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
        if (profilePhone) profilePhone.value = user.telefono || "";
        profileHeaderName.textContent = nombre;
        profileHeaderEmail.textContent = user.correo || "";
        avatarInitials.textContent = nombre.charAt(0).toUpperCase();

        // Renderizar previsualización segura de Frente
        if (user.licencia_frente) {
            fetchAuthenticatedImage(user.licencia_frente, imgPreviewFrente);
            btnDeleteFrente.style.display = "inline-block";
        } else {
            imgPreviewFrente.hidden = true;
            imgPreviewFrente.src = "";
            btnDeleteFrente.style.display = "none";
        }

        // Renderizar previsualización segura de Reverso
        if (user.licencia_reverso) {
            fetchAuthenticatedImage(user.licencia_reverso, imgPreviewReverso);
            btnDeleteReverso.style.display = "inline-block";
        } else {
            imgPreviewReverso.hidden = true;
            imgPreviewReverso.src = "";
            btnDeleteReverso.style.display = "none";
        }
    }

    // Carga de imágenes protegidas mediante petición autenticada Blob
    async function fetchAuthenticatedImage(url, imgElement) {
        try {
            const response = await fetch(url, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.ok) {
                const blob = await response.blob();
                const objectUrl = URL.createObjectURL(blob);
                imgElement.src = objectUrl;
                imgElement.hidden = false;
            } else {
                imgElement.hidden = true;
            }
        } catch (_) {
            imgElement.hidden = true;
        }
    }

    function handleFileSelect(event, imgElement) {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                imgElement.src = e.target.result;
                imgElement.hidden = false;
            };
            reader.readAsDataURL(file);
        }
    }

    function showMessage(text, type) {
        profileMessage.textContent = text;
        profileMessage.className = `auth-message ${type}`;
        profileMessage.style.display = "block";
    }

    btnLogout.addEventListener("click", () => {
        localStorage.removeItem("masterdriver_token");
        localStorage.removeItem("masterdriver_usuario");
        window.location.replace("login.html");
    });
});