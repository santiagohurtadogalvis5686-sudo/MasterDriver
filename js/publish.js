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

        try {
            const formData = new FormData(form);

            // =================================
            // DÍAS DISPONIBLES
            // =================================
            const dias = Array.from(
                document.querySelectorAll('input[name="dias"]:checked')
            ).map((checkbox) => checkbox.value);

            formData.set("dias_disponibles", JSON.stringify(dias));

            // =================================
            // DOCUMENTOS
            // =================================
            const soatElem = document.querySelector("#soat");
            const tecnoElem = document.querySelector("#tecnomecanica");
            const tarjetaElem = document.querySelector("#tarjeta");

            const documentos = {
                soat: soatElem ? soatElem.checked : false,
                tecnomecanica: tecnoElem ? tecnoElem.checked : false,
                tarjeta_propiedad: tarjetaElem ? tarjetaElem.checked : false
            };

            formData.set("documentos", JSON.stringify(documentos));

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
            // ENVIAR SOLICITUD
            // =================================
            const response = await fetch(`${API_URL}/vehicles`, {
                method: "POST",
                headers: headersAuth(), // No añadir 'Content-Type', FormData lo ajusta automáticamente con el boundary
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