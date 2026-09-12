document.addEventListener("DOMContentLoaded", () => {
    const form = document.querySelector("#publishForm");

    if (!form) return;

    // Verificar si el usuario está autenticado
    if (!usuarioAutenticado()) {
        alert("Debes iniciar sesión para publicar un vehículo.");
        window.location.href = "login.html";
        return;
    }

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        // =================================
        // VALIDACIÓN DE DOCUMENTOS (FRONTEND)
        // =================================
        const soatFile = document.querySelector("#soat_archivo")?.files[0];
        const tecnoFile = document.querySelector("#tecnomecanica_archivo")?.files[0];
        const tarjetaFile = document.querySelector("#tarjeta_archivo")?.files[0];

        const faltantes = [];
        if (!soatFile) faltantes.push("el SOAT");
        if (!tecnoFile) faltantes.push("la Tecnomecánica");
        if (!tarjetaFile) faltantes.push("la Tarjeta de propiedad");

        if (faltantes.length > 0) {
            let mensajeError = "";
            if (faltantes.length === 1) {
                mensajeError = `Debes adjuntar ${faltantes[0]}.`;
            } else if (faltantes.length === 2) {
                mensajeError = `Debes adjuntar ${faltantes[0]} y ${faltantes[1]}.`;
            } else {
                mensajeError = `Debes adjuntar ${faltantes[0]}, ${faltantes[1]} y ${faltantes[2]}.`;
            }
            alert(mensajeError);
            return;
        }

        try {
            const formData = new FormData(form);

            // Marca de presencia de documentos en JSON metadata
            const documentosStatus = {
                soat: true,
                tecnomecanica: true,
                tarjeta_propiedad: true
            };
            formData.set("documentos", JSON.stringify(documentosStatus));

            // =================================
            // CONDICIONES DE USO
            // =================================
            let condiciones = Array.from(
                document.querySelectorAll('input[name="condiciones"]:checked')
            ).map((checkbox) => checkbox.value);

            const otrasCondicionesElem = document.querySelector("#otras_condiciones");
            const otras = otrasCondicionesElem && otrasCondicionesElem.value
                ? otrasCondicionesElem.value
                    .split("\n")
                    .map((texto) => texto.trim())
                    .filter(Boolean)
                : [];

            condiciones = [...condiciones, ...otras];
            formData.set("condiciones_uso", JSON.stringify(condiciones));

            // =================================
            // ENVIAR SOLICITUD MULTIPART
            // =================================
            const response = await fetch(`${API_URL}/vehicles`, {
                method: "POST",
                headers: headersAuthMultipart(),
                body: formData
            });

            const data = await response.json();

            if (!response.ok) {
                alert(data.mensaje || "No se pudo publicar el vehículo.");
                return;
            }

            alert("¡Vehículo publicado correctamente!");
            form.reset();
            window.location.href = "catalog.html";

        } catch (error) {
            console.error("Error al publicar el vehículo:", error);
            alert("Error conectando con el servidor.");
        }
    });
});