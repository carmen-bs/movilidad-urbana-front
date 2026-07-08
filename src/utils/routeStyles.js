/**
 * Configuración de estilos para las rutas del mapa.
 *
 * Define:
 * - Color
 * - Grosor de línea
 * - Opacidad
 * - Tipo de trazo
 *
 * Modos soportados:
 * - walk → a pie
 * - drive → coche
 * - bike → bicicleta
 * - drive_service → servicio / variante coche
 */
export const routeStyles = {
  walk: {
    color: "#16a34a", // verde
    weight: 4,
    dashArray: "4 6",
    opacity: 0.9,
  },

  drive: {
    color: "#2563eb", // azul
    weight: 5,
    opacity: 0.9,
  },

  bike: {
    color: "#f97316", // naranja
    weight: 5,
    opacity: 0.9,
  },

  drive_service: {
    color: "#a855f7", // lila (bus o servicio)
    weight: 5,
    opacity: 0.9,
  },
};