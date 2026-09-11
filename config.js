// ==========================================================
// CONFIGURACIÓN
// ==========================================================
// Pega aquí la URL del Web App de Google Apps Script (termina
// en /exec). La obtienes en el editor de Apps Script:
// Implementar → Nueva implementación → Aplicación web.
// ==========================================================

window.CONFIG = {
  APPS_SCRIPT_URL: "https://script.google.com/macros/s/AKfycbxTusNWKhZv4aAw5lO8gFC-pd3NanbA2Cl8zCb1Pxwfz2IE2OcoUa2Y-y61lz6YHz117A/exec",

  // Ancho máximo (px) al que se redimensionan las fotos antes
  // de enviarse, para no mandar archivos pesados.
  MAX_PHOTO_WIDTH: 1280,

  // Calidad de compresión JPEG (0 a 1)
  PHOTO_QUALITY: 0.75
};
