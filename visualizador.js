(function () {
  "use strict";

  const listaAvisos = document.getElementById("listaAvisos");
  const loadingState = document.getElementById("loadingState");
  const filterTabs = document.getElementById("filterTabs");
  const filterCount = document.getElementById("filterCount");
  const configWarning = document.getElementById("configWarning");
  const dashboard = document.getElementById("dashboard");
  const tecnicoFilter = document.getElementById("tecnicoFilter");
  const fechaDesde = document.getElementById("fechaDesde");
  const fechaHasta = document.getElementById("fechaHasta");
  const limpiarFechas = document.getElementById("limpiarFechas");

  const TECNICOS = ["Cristhian", "Ismael", "Jaime", "Pablo", "Mauricio", "Viera", "Gian Franco", "Andy", "Victor"];

  let avisos = [];
  let filtroActivo = "todos";
  let tecnicosActivos = []; // vacío = sin filtrar por técnico
  let chartEstado = null;
  let chartTecnicos = null;

  // ---------- Filtro de técnico: construir los chips ----------
  TECNICOS.forEach((nombre) => {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "tecnico-chip";
    chip.textContent = nombre;
    chip.dataset.tecnico = nombre;
    chip.addEventListener("click", () => {
      if (tecnicosActivos.includes(nombre)) {
        tecnicosActivos = tecnicosActivos.filter((t) => t !== nombre);
        chip.classList.remove("active");
      } else {
        tecnicosActivos.push(nombre);
        chip.classList.add("active");
      }
      renderLista();
    });
    tecnicoFilter.appendChild(chip);
  });

  // ---------- Filtro de fecha ----------
  fechaDesde.addEventListener("change", renderLista);
  fechaHasta.addEventListener("change", renderLista);
  limpiarFechas.addEventListener("click", () => {
    fechaDesde.value = "";
    fechaHasta.value = "";
    renderLista();
  });

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

  // ---------- Cargar avisos desde Apps Script ----------
  async function cargarAvisos() {
    try {
      const res = await fetch(`${CONFIG.APPS_SCRIPT_URL}?action=listar`, { method: "GET" });
      if (!res.ok) throw new Error(`El servidor respondió con estado ${res.status}`);
      const data = await res.json();

      if (data && data.status === "error") throw new Error(data.message);

      avisos = Array.isArray(data) ? data : (data.value || []);
      avisos = avisos.map((a) => ({ ...a, Estado: a.Estado || "Pendiente" }));
      avisos.sort((a, b) => (b.Folio || "").localeCompare(a.Folio || ""));

      renderDashboard();
      renderLista();
    } catch (err) {
      console.error(err);
      loadingState.textContent =
        "No se pudo cargar la lista de avisos. Revisa tu conexión o el proyecto de Apps Script.";
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
    let lista = avisos;

    if (filtroActivo === "pendiente") lista = lista.filter((a) => a.Estado !== "Resuelto");
    if (filtroActivo === "resuelto") lista = lista.filter((a) => a.Estado === "Resuelto");

    if (tecnicosActivos.length > 0) {
      lista = lista.filter((a) => {
        const nombresAviso = (a.Especialidad || "").split(",").map((n) => n.trim());
        return tecnicosActivos.some((t) => nombresAviso.includes(t));
      });
    }

    if (fechaDesde.value) lista = lista.filter((a) => (a.Fecha || "") >= fechaDesde.value);
    if (fechaHasta.value) lista = lista.filter((a) => (a.Fecha || "") <= fechaHasta.value);

    return lista;
  }

  // ---------- Dashboard: 2 gráficos con todos los avisos ----------
  function renderDashboard() {
    if (avisos.length === 0) return;
    dashboard.style.display = "grid";

    const pendientes = avisos.filter((a) => a.Estado !== "Resuelto").length;
    const resueltos = avisos.filter((a) => a.Estado === "Resuelto").length;

    const conteoTecnicos = TECNICOS.map((nombre) =>
      avisos.filter((a) => (a.Especialidad || "").split(",").map((n) => n.trim()).includes(nombre)).length
    );

    if (chartEstado) chartEstado.destroy();
    chartEstado = new Chart(document.getElementById("chartEstado"), {
      type: "pie",
      data: {
        labels: ["Pendientes", "Resueltos"],
        datasets: [{ data: [pendientes, resueltos], backgroundColor: ["#c98600", "#2e7d4f"] }]
      },
      options: { plugins: { legend: { position: "bottom", labels: { boxWidth: 12, font: { size: 11 } } } } }
    });

    if (chartTecnicos) chartTecnicos.destroy();
    chartTecnicos = new Chart(document.getElementById("chartTecnicos"), {
      type: "bar",
      data: {
        labels: TECNICOS,
        datasets: [{ data: conteoTecnicos, backgroundColor: "#3a5a73" }]
      },
      options: {
        indexAxis: "y",
        plugins: { legend: { display: false } },
        scales: { x: { ticks: { precision: 0 } } }
      }
    });
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
        <span><b>Técnico(s):</b> ${aviso.Especialidad || "—"}</span>
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
          <input type="file" accept="image/*" multiple>
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
    const maxW = (window.CONFIG && CONFIG.MAX_PHOTO_WIDTH) || 1280;
    const quality = (window.CONFIG && CONFIG.PHOTO_QUALITY) || 0.75;

    if (window.createImageBitmap) {
      return createImageBitmap(file, { resizeWidth: maxW, resizeQuality: "low" })
        .then((bitmap) => {
          const canvas = document.createElement("canvas");
          canvas.width = bitmap.width;
          canvas.height = bitmap.height;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(bitmap, 0, 0);
          if (bitmap.close) bitmap.close();
          return canvasABase64(canvas, quality);
        })
        .catch(() => comprimirImagenFallback(file, maxW, quality));
    }

    return comprimirImagenFallback(file, maxW, quality);
  }

  function canvasABase64(canvas, quality) {
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) { reject(new Error("No se pudo comprimir la imagen")); return; }
          const reader = new FileReader();
          reader.onerror = () => reject(new Error("No se pudo leer la imagen comprimida"));
          reader.onload = () => resolve(reader.result);
          reader.readAsDataURL(blob);
        },
        "image/jpeg",
        quality
      );
    });
  }

  function comprimirImagenFallback(file, maxW, quality) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("No se pudo leer la imagen"));
      reader.onload = (e) => {
        const img = new Image();
        img.onerror = () => reject(new Error("No se pudo procesar la imagen"));
        img.onload = () => {
          const scale = Math.min(1, maxW / img.width);
          const canvas = document.createElement("canvas");
          canvas.width = img.width * scale;
          canvas.height = img.height * scale;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          canvasABase64(canvas, quality).then(resolve).catch(reject);
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  }
})();
