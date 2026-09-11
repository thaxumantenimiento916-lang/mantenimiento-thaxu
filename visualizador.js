(function () {
  "use strict";

  const listaAvisos = document.getElementById("listaAvisos");
  const loadingState = document.getElementById("loadingState");
  const filterTabs = document.getElementById("filterTabs");
  const filterCount = document.getElementById("filterCount");
  const configWarning = document.getElementById("configWarning");

  let avisos = [];
  let filtroActivo = "todos";

  // ---------- Validación de configuración ----------
  const faltaConfig =
    !window.CONFIG ||
    !CONFIG.APPS_SCRIPT_URL || CONFIG.APPS_SCRIPT_URL.includes("PEGA_AQUI");

  if (faltaConfig) {
    configWarning.style.display = "block";
    loadingState.textContent = "No se puede cargar la lista: falta configurar config.js.";
  } else {
    cargarAvisos();
  }

  // ---------- Cargar avisos desde Power Automate ----------
  async function cargarAvisos() {
    try {
      const res = await fetch(`${CONFIG.APPS_SCRIPT_URL}?action=listar`, { method: "GET" });
      if (!res.ok) throw new Error(`El servidor respondió con estado ${res.status}`);
      const data = await res.json();

      if (data && data.status === "error") throw new Error(data.message);

      avisos = Array.isArray(data) ? data : (data.value || []);
      avisos = avisos.map((a) => ({ ...a, Estado: a.Estado || "Pendiente" }));
      avisos.sort((a, b) => (b.Folio || "").localeCompare(a.Folio || ""));

      renderLista();
    } catch (err) {
      console.error(err);
      loadingState.textContent =
        "No se pudo cargar la lista de avisos. Revisa tu conexión o el flujo de Power Automate.";
    }
  }

  // ---------- Filtros ----------
  filterTabs.addEventListener("click", (e) => {
    const btn = e.target.closest(".filter-tab");
    if (!btn) return;
    filterTabs.querySelectorAll(".filter-tab").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    filtroActivo = btn.dataset.filter;
    renderLista();
  });

  function avisosFiltrados() {
    if (filtroActivo === "pendiente") return avisos.filter((a) => a.Estado !== "Resuelto");
    if (filtroActivo === "resuelto") return avisos.filter((a) => a.Estado === "Resuelto");
    return avisos;
  }

  // ---------- Render lista ----------
  function renderLista() {
    const lista = avisosFiltrados();
    filterCount.textContent = `${lista.length} aviso${lista.length === 1 ? "" : "s"}`;

    if (lista.length === 0) {
      listaAvisos.innerHTML = `<div class="empty-state">No hay avisos que mostrar en este filtro.</div>`;
      return;
    }

    listaAvisos.innerHTML = "";
    lista.forEach((aviso) => listaAvisos.appendChild(renderCard(aviso)));
  }

  function renderCard(aviso) {
    const resuelto = aviso.Estado === "Resuelto";

    const card = document.createElement("div");
    card.className = `aviso-card ${resuelto ? "resuelto" : "pendiente"}`;

    const fotos = (aviso.Fotos || "").split(",").map((f) => f.trim()).filter(Boolean);
    const fotosHtml = fotos.length
      ? `<div class="aviso-fotos">${fotos
          .map((url, i) => `<a href="${url}" target="_blank" rel="noopener">Ver foto ${i + 1}</a>`)
          .join("")}</div>`
      : "";

    const fotosSolucion = (aviso.FotosSolucion || "").split(",").map((f) => f.trim()).filter(Boolean);
    const fotosSolucionHtml = fotosSolucion.length
      ? `<div class="aviso-fotos">${fotosSolucion
          .map((url, i) => `<a href="${url}" target="_blank" rel="noopener">Evidencia solución ${i + 1}</a>`)
          .join("")}</div>`
      : "";

    card.innerHTML = `
      <div class="aviso-head">
        <div>
          <div class="aviso-folio">${aviso.Folio || "—"} · ${aviso.Fecha || "—"}</div>
          <div class="aviso-lugar">${aviso.Lugar || "Sin lugar"}</div>
        </div>
        <span class="badge ${resuelto ? "resuelto" : "pendiente"}">${resuelto ? "Resuelto" : "Pendiente"}</span>
      </div>
      <div class="aviso-meta">
        <span><b>Solicitante:</b> ${aviso.Solicitante || "—"}</span>
        <span><b>Especialidad:</b> ${aviso.Especialidad || "—"}</span>
        <span><b>Tipo:</b> ${aviso.TipoMantenimiento || "—"}</span>
        <span><b>Prioridad:</b> ${aviso.Prioridad || "—"}</span>
      </div>
      <div class="aviso-desc">${aviso.Descripcion || ""}</div>
      ${fotosHtml}
      ${fotosSolucionHtml}
      <div class="aviso-actions">
        <button type="button" class="btn-toggle ${resuelto ? "" : "resolver"}">
          ${resuelto ? "Reabrir aviso" : "Marcar como resuelto"}
        </button>
      </div>
      <div class="confirm-panel" style="display:none;"></div>
    `;

    card.querySelector(".btn-toggle").addEventListener("click", (e) =>
      abrirPanelConfirmacion(card, aviso, resuelto ? "Pendiente" : "Resuelto")
    );

    return card;
  }

  // ---------- Panel de confirmación (clave + evidencia) ----------
  function abrirPanelConfirmacion(card, aviso, nuevoEstado) {
    const requierePhotoEvidencia = nuevoEstado === "Resuelto";
    const panel = card.querySelector(".confirm-panel");
    const actionsBtn = card.querySelector(".btn-toggle");

    let evidencia = []; // { dataUrl, name }

    panel.innerHTML = `
      <label for="clave-${aviso.Folio}">Clave de mantenimiento</label>
      <input type="password" id="clave-${aviso.Folio}" autocomplete="off" placeholder="Ingresa la clave del área">

      ${requierePhotoEvidencia ? `
        <label>Foto de evidencia de la solución</label>
        <label class="photo-input-mini" id="photoMini-${aviso.Folio}">
          Toca para tomar o subir la foto
          <input type="file" accept="image/*" capture="environment" multiple>
        </label>
        <div class="confirm-preview" id="preview-${aviso.Folio}"></div>
      ` : ""}

      <div class="confirm-error" id="error-${aviso.Folio}" style="display:none;"></div>
      <div class="confirm-actions">
        <button type="button" class="btn-cancel">Cancelar</button>
        <button type="button" class="btn-confirm">Confirmar</button>
      </div>
    `;
    panel.style.display = "block";
    actionsBtn.style.display = "none";

    const errorBox = panel.querySelector(`#error-${cssEscape(aviso.Folio)}`);
    const claveInput = panel.querySelector(`#clave-${cssEscape(aviso.Folio)}`);

    if (requierePhotoEvidencia) {
      const fileInput = panel.querySelector(`#photoMini-${cssEscape(aviso.Folio)} input`);
      const miniLabel = panel.querySelector(`#photoMini-${cssEscape(aviso.Folio)}`);
      const previewBox = panel.querySelector(`#preview-${cssEscape(aviso.Folio)}`);

      fileInput.addEventListener("change", async () => {
        const files = Array.from(fileInput.files || []);
        for (const file of files) {
          try {
            const dataUrl = await comprimirImagen(file);
            evidencia.push({ dataUrl, name: file.name });
          } catch (err) {
            console.error(err);
          }
        }
        fileInput.value = "";
        previewBox.innerHTML = evidencia
          .map((f) => `<div class="thumb-mini"><img src="${f.dataUrl}" alt="${f.name}"></div>`)
          .join("");
        miniLabel.classList.toggle("has-photos", evidencia.length > 0);
        miniLabel.firstChild.textContent =
          evidencia.length > 0 ? `${evidencia.length} foto(s) lista(s) — toca para agregar más` : "Toca para tomar o subir la foto";
      });
    }

    panel.querySelector(".btn-cancel").addEventListener("click", () => {
      panel.style.display = "none";
      panel.innerHTML = "";
      actionsBtn.style.display = "";
    });

    panel.querySelector(".btn-confirm").addEventListener("click", async () => {
      errorBox.style.display = "none";
      const clave = claveInput.value.trim();

      if (!clave) {
        errorBox.textContent = "Ingresa la clave de mantenimiento para continuar.";
        errorBox.style.display = "block";
        return;
      }
      if (requierePhotoEvidencia && evidencia.length === 0) {
        errorBox.textContent = "Se requiere al menos una foto de evidencia de la solución.";
        errorBox.style.display = "block";
        return;
      }

      const confirmBtn = panel.querySelector(".btn-confirm");
      confirmBtn.disabled = true;
      confirmBtn.textContent = "Guardando…";

      try {
        const res = await fetch(CONFIG.APPS_SCRIPT_URL, {
          method: "POST",
          body: JSON.stringify({
            action: "actualizar",
            folio: aviso.Folio,
            estado: nuevoEstado,
            clave,
            evidencia: evidencia.map((f) => ({ nombre: f.name, dataUrl: f.dataUrl }))
          })
        });

        if (!res.ok) throw new Error(`El servidor respondió con estado ${res.status}`);
        const data = await res.json();

        if (data.status !== "ok") {
          errorBox.textContent =
            data.message === "Clave incorrecta"
              ? "Clave incorrecta. Solo el personal de mantenimiento puede cambiar el estado."
              : (data.message || "No se pudo guardar el cambio.");
          errorBox.style.display = "block";
          confirmBtn.disabled = false;
          confirmBtn.textContent = "Confirmar";
          return;
        }

        aviso.Estado = nuevoEstado;
        panel.style.display = "none";
        panel.innerHTML = "";
        renderLista();
      } catch (err) {
        console.error(err);
        errorBox.textContent = "No se pudo guardar el cambio. Revisa tu conexión e intenta de nuevo.";
        errorBox.style.display = "block";
        confirmBtn.disabled = false;
        confirmBtn.textContent = "Confirmar";
      }
    });
  }

  function cssEscape(str) {
    return String(str).replace(/[^a-zA-Z0-9_-]/g, "\\$&");
  }

  // ---------- Compresión de imágenes (evidencia) ----------
  function comprimirImagen(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("No se pudo leer la imagen"));
      reader.onload = (e) => {
        const img = new Image();
        img.onerror = () => reject(new Error("No se pudo procesar la imagen"));
        img.onload = () => {
          const maxW = (window.CONFIG && CONFIG.MAX_PHOTO_WIDTH) || 1280;
          const scale = Math.min(1, maxW / img.width);
          const canvas = document.createElement("canvas");
          canvas.width = img.width * scale;
          canvas.height = img.height * scale;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const quality = (window.CONFIG && CONFIG.PHOTO_QUALITY) || 0.75;
          resolve(canvas.toDataURL("image/jpeg", quality));
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  }
})();
