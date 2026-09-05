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
    const fileNameFrente = document.getElementById("fileNameFrente");
    const fileNameReverso = document.getElementById("fileNameReverso");
    const placeholderFrente = document.getElementById("placeholderFrente");
    const placeholderReverso = document.getElementById("placeholderReverso");
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

    // Eventos de previsualización local y etiqueta de nombre de archivo
    inputFileFrente.addEventListener("change", (e) => handleFileSelect(e, imgPreviewFrente, fileNameFrente, placeholderFrente));
    inputFileReverso.addEventListener("change", (e) => handleFileSelect(e, imgPreviewReverso, fileNameReverso, placeholderReverso));

    // Helper para parsear JSON de forma segura ante respuestas HTML del servidor
    async function safeParseJsonResponse(response) {
        const contentType = response.headers.get("content-type") || "";
        if (!contentType.includes("application/json")) {
            throw new Error("El servidor no devolvió una respuesta JSON válida.");
        }
        return await response.json();
    }

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

            const data = await safeParseJsonResponse(response);

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

    // Subir Archivos de Licencia (OBLIGATORIOS AMBOS DEDOS)
    btnSaveLicense.addEventListener("click", async () => {
        const fileFrente = inputFileFrente.files[0];
        const fileReverso = inputFileReverso.files[0];

        // Se exige que ambos lados estén cargados en el input
        if (!fileFrente || !fileReverso) {
            showMessage("Debes seleccionar ambos documentos (frente y reverso) para subir tu licencia.", "error");
            return;
        }

        if (!validateFile(fileFrente)) return;
        if (!validateFile(fileReverso)) return;

        const formData = new FormData();
        formData.append("licencia_frente", fileFrente);
        formData.append("licencia_reverso", fileReverso);

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

            const data = await safeParseJsonResponse(response);

            if (!response.ok || !data.ok) {
                throw new Error(data.mensaje || "Error al subir documentos.");
            }

            showMessage("Licencia de conducir actualizada correctamente.", "success");
            resetFileInputs();
            await loadProfile(token);
        } catch (error) {
            showMessage(error.message || "Error al procesar la licencia.", "error");
        } finally {
            btnSaveLicense.disabled = false;
            btnSaveLicense.textContent = "Subir Documentos de Licencia";
        }
    });

    // Eliminar Licencias
    btnDeleteFrente.addEventListener("click", () => deleteLicenseSide("frente"));
    btnDeleteReverso.addEventListener("click", () => deleteLicenseSide("reverso"));

    async function deleteLicenseSide(side) {
        if (!confirm(`¿Estás seguro de eliminar el ${side} de tu licencia?`)) return;

        try {
            const response = await fetch(`/api/profile/license/${side}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` }
            });

            const data = await safeParseJsonResponse(response);

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

            if (response.status === 401) {
                btnLogout.click();
                return;
            }

            const data = await safeParseJsonResponse(response);

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

        // Renderizar Frente
        if (user.licencia_frente) {
            fetchAuthenticatedImage(user.licencia_frente, imgPreviewFrente, placeholderFrente);
            btnDeleteFrente.style.display = "inline-block";
        } else {
            imgPreviewFrente.hidden = true;
            imgPreviewFrente.src = "";
            placeholderFrente.style.display = "block";
            btnDeleteFrente.style.display = "none";
        }

        // Renderizar Reverso
        if (user.licencia_reverso) {
            fetchAuthenticatedImage(user.licencia_reverso, imgPreviewReverso, placeholderReverso);
            btnDeleteReverso.style.display = "inline-block";
        } else {
            imgPreviewReverso.hidden = true;
            imgPreviewReverso.src = "";
            placeholderReverso.style.display = "block";
            btnDeleteReverso.style.display = "none";
        }
    }

    async function fetchAuthenticatedImage(url, imgElement, placeholderElement) {
        try {
            const response = await fetch(url, {
                headers: { Authorization: `Bearer ${token}` }
            });

            const contentType = response.headers.get("content-type") || "";

            if (response.ok && (contentType.includes("image") || contentType.includes("pdf"))) {
                const blob = await response.blob();
                const objectUrl = URL.createObjectURL(blob);
                imgElement.src = objectUrl;
                imgElement.hidden = false;
                if (placeholderElement) placeholderElement.style.display = "none";
            } else {
                imgElement.hidden = true;
                if (placeholderElement) placeholderElement.style.display = "block";
            }
        } catch (_) {
            imgElement.hidden = true;
            if (placeholderElement) placeholderElement.style.display = "block";
        }
    }

    function handleFileSelect(event, imgElement, nameLabel, placeholderElement) {
        const file = event.target.files[0];
        if (file) {
            if (!validateFile(file)) {
                event.target.value = "";
                nameLabel.textContent = "Ningún archivo seleccionado";
                return;
            }
            nameLabel.textContent = file.name;
            if (file.type.startsWith("image/")) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    imgElement.src = e.target.result;
                    imgElement.hidden = false;
                    if (placeholderElement) placeholderElement.style.display = "none";
                };
                reader.readAsDataURL(file);
            } else {
                imgElement.hidden = true;
                if (placeholderElement) {
                    placeholderElement.textContent = `Archivo seleccionado: ${file.name}`;
                    placeholderElement.style.display = "block";
                }
            }
        } else {
            nameLabel.textContent = "Ningún archivo seleccionado";
        }
    }

    function validateFile(file) {
        const allowedTypes = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
        const maxSize = 5 * 1024 * 1024; // 5 MB

        if (!allowedTypes.includes(file.type)) {
            showMessage(`El archivo "${file.name}" no es válido. Solo JPG, PNG, WEBP o PDF.`, "error");
            return false;
        }

        if (file.size > maxSize) {
            showMessage(`El archivo "${file.name}" excede el límite de 5 MB.`, "error");
            return false;
        }

        return true;
    }

    function resetFileInputs() {
        inputFileFrente.value = "";
        inputFileReverso.value = "";
        fileNameFrente.textContent = "Ningún archivo seleccionado";
        fileNameReverso.textContent = "Ningún archivo seleccionado";
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