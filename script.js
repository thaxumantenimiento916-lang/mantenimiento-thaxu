(function () {
  "use strict";

  const form = document.getElementById("avisoForm");
  const statusMsg = document.getElementById("statusMsg");
  const submitBtn = document.getElementById("submitBtn");
  const folioValue = document.getElementById("folioValue");
  const fechaValue = document.getElementById("fechaValue");
  const fechaInput = document.getElementById("fecha");
  const lugarSelect = document.getElementById("lugar");
  const lugarOtro = document.getElementById("lugarOtro");
  const especialidadOtro = document.getElementById("especialidadOtro");
  const especialidadRadios = document.querySelectorAll('input[name="especialidad"]');
  const fotosInput = document.getElementById("fotos");
  const previewGrid = document.getElementById("previewGrid");
  const configWarning = document.getElementById("configWarning");

  let fotosSeleccionadas = []; // { dataUrl, name }

  // ---------- Folio y fecha ----------
  function generarFolio() {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    const fechaCorta = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
    const hora = `${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
    return `MC-${fechaCorta}-${hora}`;
  }

  const folio = generarFolio();
  folioValue.textContent = folio;

  const hoy = new Date().toISOString().split("T")[0];
  fechaInput.value = hoy;
  fechaValue.textContent = hoy;
  fechaInput.addEventListener("change", () => {
    fechaValue.textContent = fechaInput.value || "—";
  });

  // ---------- Aviso si falta configurar el endpoint ----------
  if (!window.CONFIG || !CONFIG.APPS_SCRIPT_URL || CONFIG.APPS_SCRIPT_URL.includes("PEGA_AQUI")) {
    configWarning.style.display = "block";
  }

  // ---------- Especialidad "Otro" ----------
  especialidadRadios.forEach((radio) => {
    radio.addEventListener("change", () => {
      if (radio.value === "Otro" && radio.checked) {
        especialidadOtro.style.display = "block";
        especialidadOtro.required = true;
      } else if (radio.checked) {
        especialidadOtro.style.display = "none";
        especialidadOtro.required = false;
        especialidadOtro.value = "";
      }
    });
  });

  // ---------- Lugar "Otro" ----------
  lugarSelect.addEventListener("change", () => {
    if (lugarSelect.value === "__otro__") {
      lugarOtro.style.display = "block";
      lugarOtro.required = true;
    } else {
      lugarOtro.style.display = "none";
      lugarOtro.required = false;
      lugarOtro.value = "";
    }
  });

  // ---------- Fotos: compresión + preview ----------
  function comprimirImagen(file) {
    const maxW = (window.CONFIG && CONFIG.MAX_PHOTO_WIDTH) || 1280;
    const quality = (window.CONFIG && CONFIG.PHOTO_QUALITY) || 0.75;

    // Método preferido: decodifica la foto YA reducida de tamaño, evitando
    // que el navegador cargue la imagen a su resolución original completa
    // en memoria (esto es lo que tumbaba la pestaña con fotos de muchos
    // megapíxeles, comunes en celulares Android recientes).
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

  // Convierte el canvas a JPEG usando toBlob (asíncrono), que reparte el
  // trabajo de codificación en vez de exigir toda la memoria de golpe como
  // toDataURL — más amable con celulares de gama media/baja.
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

  // Método de respaldo (navegadores sin createImageBitmap con opciones de
  // reescalado). Menos eficiente en memoria, pero cubre casos poco comunes.
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

  function renderPreviews() {
    previewGrid.innerHTML = "";
    fotosSeleccionadas.forEach((foto, idx) => {
      const div = document.createElement("div");
      div.className = "thumb";
      div.innerHTML = `<img src="${foto.dataUrl}" alt="${foto.name}"><button type="button" aria-label="Quitar foto">✕</button>`;
      div.querySelector("button").addEventListener("click", () => {
        fotosSeleccionadas.splice(idx, 1);
        renderPreviews();
      });
      previewGrid.appendChild(div);
    });
  }

  fotosInput.addEventListener("change", async () => {
    const files = Array.from(fotosInput.files || []);
    for (const file of files) {
      try {
        const dataUrl = await comprimirImagen(file);
        fotosSeleccionadas.push({ dataUrl, name: file.name });
      } catch (err) {
        console.error(err);
      }
    }
    renderPreviews();
    fotosInput.value = ""; // permite volver a elegir/repetir archivos
  });

  // ---------- Envío ----------
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    statusMsg.textContent = "";
    statusMsg.className = "status";

    if (!window.CONFIG || !CONFIG.APPS_SCRIPT_URL || CONFIG.APPS_SCRIPT_URL.includes("PEGA_AQUI")) {
      statusMsg.textContent = "No se puede enviar: falta configurar la URL del flujo en config.js.";
      statusMsg.className = "status err";
      return;
    }

    const lugarFinal = lugarSelect.value === "__otro__" ? lugarOtro.value.trim() : lugarSelect.value;
    const especialidad = form.querySelector('input[name="especialidad"]:checked');
    const especialidadFinal =
      especialidad && especialidad.value === "Otro" ? especialidadOtro.value.trim() : (especialidad ? especialidad.value : "");

    const payload = {
      action: "crear",
      folio,
      fecha: fechaInput.value,
      solicitante: document.getElementById("nombreSolicitante").value.trim(),
      especialidad: especialidadFinal,
      lugar: lugarFinal,
      tipoMantenimiento: document.getElementById("tipoMantenimiento").value,
      prioridad: document.getElementById("prioridad").value,
      descripcion: document.getElementById("descripcion").value.trim(),
      fotos: fotosSeleccionadas.map((f) => ({ nombre: f.name, dataUrl: f.dataUrl }))
    };

    submitBtn.disabled = true;
    submitBtn.textContent = "Enviando…";

    try {
      const res = await fetch(CONFIG.APPS_SCRIPT_URL, {
        method: "POST",
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error(`El servidor respondió con estado ${res.status}`);
      const data = await res.json();
      if (data.status !== "ok") throw new Error(data.message || "El servidor rechazó el envío.");

      statusMsg.textContent = `Aviso ${folio} enviado correctamente.`;
      statusMsg.className = "status ok";
      form.reset();
      fotosSeleccionadas = [];
      renderPreviews();
      lugarOtro.style.display = "none";
      especialidadOtro.style.display = "none";
      fechaInput.value = hoy;
      fechaValue.textContent = hoy;

      // Genera un nuevo folio para el siguiente aviso
      folioValue.textContent = generarFolio();

    } catch (err) {
      console.error(err);
      statusMsg.textContent =
        "No se pudo enviar el aviso. Revisa tu conexión o la configuración del flujo (" + err.message + ").";
      statusMsg.className = "status err";
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Enviar aviso";
    }
  });
})();
