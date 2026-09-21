(function () {
  "use strict";

  const form = document.getElementById("avisoForm");
  const statusMsg = document.getElementById("statusMsg");
  const whatsappBtn = document.getElementById("whatsappBtn");
  const submitBtn = document.getElementById("submitBtn");
  const folioValue = document.getElementById("folioValue");
  const fechaValue = document.getElementById("fechaValue");
  const fechaInput = document.getElementById("fecha");

  const areaSolicitante = document.getElementById("areaSolicitante");
  const areaSolicitanteOtro = document.getElementById("areaSolicitanteOtro");

  const tecnicoChecks = document.querySelectorAll('input[name="tecnico"]');
  const tecnicoError = document.getElementById("tecnicoError");

  const lugarBuscar = document.getElementById("lugarBuscar");
  const lugarHidden = document.getElementById("lugar");
  const lugarLista = document.getElementById("lugarLista");
  const lugarError = document.getElementById("lugarError");
  const lugarOtro = document.getElementById("lugarOtro");

  const fotosInput = document.getElementById("fotos");
  const previewGrid = document.getElementById("previewGrid");
  const configWarning = document.getElementById("configWarning");

  let fotosSeleccionadas = []; // { dataUrl, name }

  const LUGARES = [
    "Garita",
    "Oficina administrativa 1er piso",
    "Oficina de comercio exterior",
    "Oficina administrativa 2do piso",
    "Oficina de administración y finanzas",
    "Oficina de logística",
    "Oficina de producción",
    "Almacén general",
    "Comedor",
    "Sala de máquinas - Zona alta",
    "Sala de máquinas 1",
    "Sala de máquinas 2",
    "Zona de ingreso a planta",
    "Zona de empaque",
    "Zona de envasado de productos cocidos",
    "Área de perfilado",
    "Zona de cocina de planta",
    "Productor de hielo",
    "Laminado",
    "Zona de envasado fresco",
    "Zona de lavado",
    "Zona de fileteo",
    "Zona de recepción",
    "Área temporal de residuos sólidos",
    "Túnel 1",
    "Túnel 2",
    "Túnel 3",
    "Cámara 1",
    "Cámara 2",
    "Cámara 3",
    "Zona de pasadizo de cámaras",
    "Precámara",
    "Tópico",
    "Baño general de hombres",
    "Baño general de mujeres",
    "Vestidor de hombres",
    "Vestidor de mujeres"
  ];
  const OTRO_LUGAR = "__otro__";

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

  // ---------- Área solicitante "Otro" ----------
  areaSolicitante.addEventListener("change", () => {
    if (areaSolicitante.value === "__otro__") {
      areaSolicitanteOtro.style.display = "block";
      areaSolicitanteOtro.required = true;
    } else {
      areaSolicitanteOtro.style.display = "none";
      areaSolicitanteOtro.required = false;
      areaSolicitanteOtro.value = "";
    }
  });

  // ---------- Técnicos: quitar el error en cuanto marquen alguno ----------
  tecnicoChecks.forEach((chk) => {
    chk.addEventListener("change", () => {
      const algunoMarcado = Array.from(tecnicoChecks).some((c) => c.checked);
      if (algunoMarcado) tecnicoError.style.display = "none";
    });
  });

  // ---------- Lugar: buscador con autocompletado ----------
  function renderListaLugares(filtro) {
    const texto = (filtro || "").trim().toLowerCase();
    const coincidencias = texto
      ? LUGARES.filter((l) => l.toLowerCase().includes(texto))
      : LUGARES;

    lugarLista.innerHTML = "";

    coincidencias.forEach((lugar) => {
      const item = document.createElement("div");
      item.className = "combo-item";
      item.textContent = lugar;
      item.addEventListener("mousedown", (e) => {
        e.preventDefault();
        seleccionarLugar(lugar);
      });
      lugarLista.appendChild(item);
    });

    const itemOtro = document.createElement("div");
    itemOtro.className = "combo-item";
    itemOtro.textContent = "Otros lugares (especificar)";
    itemOtro.addEventListener("mousedown", (e) => {
      e.preventDefault();
      seleccionarLugar(OTRO_LUGAR);
    });
    lugarLista.appendChild(itemOtro);

    if (coincidencias.length === 0) {
      const vacio = document.createElement("div");
      vacio.className = "combo-item combo-vacio";
      vacio.textContent = "Sin coincidencias — usa \"Otros lugares\"";
      lugarLista.insertBefore(vacio, lugarLista.firstChild);
    }

    lugarLista.classList.add("abierta");
  }

  function seleccionarLugar(valor) {
    if (valor === OTRO_LUGAR) {
      lugarBuscar.value = "Otros lugares (especificar)";
      lugarHidden.value = OTRO_LUGAR;
      lugarOtro.style.display = "block";
      lugarOtro.required = true;
    } else {
      lugarBuscar.value = valor;
      lugarHidden.value = valor;
      lugarOtro.style.display = "none";
      lugarOtro.required = false;
      lugarOtro.value = "";
    }
    lugarError.style.display = "none";
    lugarLista.classList.remove("abierta");
  }

  lugarBuscar.addEventListener("focus", () => renderListaLugares(lugarBuscar.value));
  lugarBuscar.addEventListener("input", () => {
    lugarHidden.value = ""; // hasta que elija una opción de la lista, no hay lugar válido
    renderListaLugares(lugarBuscar.value);
  });
  document.addEventListener("click", (e) => {
    if (!document.getElementById("comboLugar").contains(e.target)) {
      lugarLista.classList.remove("abierta");
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

  // ---------- Mensaje de WhatsApp ----------
  function construirLinkWhatsApp(datos, fotos) {
    const lineas = [
      "*Aviso de Mantenimiento Correctivo*",
      `Folio: ${datos.folio}`,
      `Fecha: ${datos.fecha}`,
      `Área solicitante: ${datos.solicitante}`,
      `Técnico(s): ${datos.especialidad}`,
      `Lugar: ${datos.lugar}`,
      `Tipo de mantenimiento: ${datos.tipoMantenimiento}`,
      `Prioridad: ${datos.prioridad}`,
      "",
      `Descripción: ${datos.descripcion}`
    ];

    lineas.push("");
    if (fotos.length > 0) {
      lineas.push(fotos.length === 1 ? "Foto:" : "Fotos:");
      fotos.forEach((url) => lineas.push(url));
    } else {
      lineas.push("Foto: sin foto");
    }

    const texto = encodeURIComponent(lineas.join("\n"));
    return `https://wa.me/?text=${texto}`;
  }

  // ---------- Envío ----------
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    statusMsg.textContent = "";
    statusMsg.className = "status";
    whatsappBtn.style.display = "none";

    if (!window.CONFIG || !CONFIG.APPS_SCRIPT_URL || CONFIG.APPS_SCRIPT_URL.includes("PEGA_AQUI")) {
      statusMsg.textContent = "No se puede enviar: falta configurar la URL del flujo en config.js.";
      statusMsg.className = "status err";
      return;
    }

    const tecnicosSeleccionados = Array.from(tecnicoChecks)
      .filter((c) => c.checked)
      .map((c) => c.value);

    if (tecnicosSeleccionados.length === 0) {
      tecnicoError.style.display = "block";
      statusMsg.textContent = "Corrige los campos marcados en rojo antes de enviar.";
      statusMsg.className = "status err";
      return;
    }

    if (!lugarHidden.value) {
      lugarError.style.display = "block";
      statusMsg.textContent = "Corrige los campos marcados en rojo antes de enviar.";
      statusMsg.className = "status err";
      return;
    }

    const areaFinal =
      areaSolicitante.value === "__otro__" ? areaSolicitanteOtro.value.trim() : areaSolicitante.value;
    const lugarFinal = lugarHidden.value === OTRO_LUGAR ? lugarOtro.value.trim() : lugarHidden.value;

    const payload = {
      action: "crear",
      folio,
      fecha: fechaInput.value,
      solicitante: areaFinal,
      especialidad: tecnicosSeleccionados.join(", "),
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

      whatsappBtn.href = construirLinkWhatsApp(payload, data.fotos || []);
      whatsappBtn.style.display = "flex";

      form.reset();
      fotosSeleccionadas = [];
      renderPreviews();
      lugarBuscar.value = "";
      lugarHidden.value = "";
      lugarOtro.style.display = "none";
      areaSolicitanteOtro.style.display = "none";
      tecnicoError.style.display = "none";
      lugarError.style.display = "none";
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
