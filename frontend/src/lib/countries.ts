import type { CountryInfo } from "./types";

export const PAISES_FUTBOL: Record<string, CountryInfo> = {
  argentina: {
    nombre_completo: "Argentina",
    seleccion: "La Albiceleste",
    colores: ["celeste", "blanco"],
    colores_hex: ["75AADB", "FFFFFF"],
    patron_tipico: "Rayas horizontales celestes y blancas",
    elementos: ["AFA", "tres estrellas", "bandera argentina"],
    equipos_famosos: [
      "Argentina (selección)",
      "River Plate",
      "Boca Juniors",
      "Racing Club",
      "Independiente",
      "San Lorenzo",
    ],
    descripcion: "Rayas horizontales celestes y blancas, escudo AFA con estrellas",
  },
  brasil: {
    nombre_completo: "Brasil",
    seleccion: "La Canarinha",
    colores: ["amarillo", "verde", "azul"],
    colores_hex: ["FFDF00", "009739", "002776"],
    patron_tipico: "Amarillo con detalles verdes y azules",
    elementos: ["CBF", "cinco estrellas", "bandera brasileña"],
    equipos_famosos: [
      "Brasil (selección)",
      "Flamengo",
      "São Paulo",
      "Palmeiras",
      "Santos",
      "Corinthians",
    ],
    descripcion: "Amarillo dominante con franja verde en el pecho",
  },
  españa: {
    nombre_completo: "España",
    seleccion: "La Roja",
    colores: ["rojo", "amarillo"],
    colores_hex: ["AA151F", "FABD00"],
    patron_tipico: "Rojo con detalles amarillos",
    elementos: ["RFEF", "bandera española"],
    equipos_famosos: [
      "España (selección)",
      "Real Madrid",
      "FC Barcelona",
      "Atlético Madrid",
      "Sevilla FC",
    ],
    descripcion: "Rojo dominante con detalles amarillos y escudo RFEF",
  },
  alemania: {
    nombre_completo: "Alemania",
    seleccion: "Die Mannschaft",
    colores: ["blanco", "negro", "rojo"],
    colores_hex: ["FFFFFF", "000000", "DD0000"],
    patron_tipico: "Blanco con detalles negros y rojos",
    elementos: ["DFB", "cuatro estrellas", "bandera alemana"],
    equipos_famosos: [
      "Alemania (selección)",
      "Bayern München",
      "Borussia Dortmund",
      "Bayer Leverkusen",
    ],
    descripcion: "Blanco limpio con franja negra y detalles rojos",
  },
  francia: {
    nombre_completo: "Francia",
    seleccion: "Les Bleus",
    colores: ["azul", "blanco", "rojo"],
    colores_hex: ["002395", "FFFFFF", "ED2939"],
    patron_tipico: "Azul dominante con detalles blancos y rojos",
    elementos: ["FFF", "dos estrellas", "bandera francesa"],
    equipos_famosos: [
      "Francia (selección)",
      "Paris Saint-Germain",
      "Olympique Marsella",
      "Olympique Lyonnais",
    ],
    descripcion: "Azul marino con detalles blancos y rojos",
  },
  inglaterra: {
    nombre_completo: "Inglaterra",
    seleccion: "The Three Lions",
    colores: ["blanco"],
    colores_hex: ["FFFFFF"],
    patron_tipico: "Blanco con detalles azules",
    elementos: ["tres leones", "FA"],
    equipos_famosos: [
      "Inglaterra (selección)",
      "Manchester United",
      "Liverpool FC",
      "Chelsea FC",
      "Arsenal FC",
      "Manchester City",
    ],
    descripcion: "Blanco con escudo de tres leones y detalles azules",
  },
  italia: {
    nombre_completo: "Italia",
    seleccion: "Gli Azzurri",
    colores: ["azul"],
    colores_hex: ["004B87"],
    patron_tipico: "Azul celeste sólido",
    elementos: ["FIGC", "cuatro estrellas", "escudo italiano"],
    equipos_famosos: [
      "Italia (selección)",
      "Juventus",
      "AC Milan",
      "Inter Milan",
      "AS Roma",
      "SSC Napoli",
    ],
    descripcion: "Azul celeste sólido con escudo FIGC",
  },
  uruguay: {
    nombre_completo: "Uruguay",
    seleccion: "La Celeste",
    colores: ["azul", "blanco"],
    colores_hex: ["5BCBF4", "FFFFFF"],
    patron_tipico: "Celeste con detalles blancos",
    elementos: ["AUF", "cuatro estrellas", "bandera uruguaya"],
    equipos_famosos: [
      "Uruguay (selección)",
      "Club Nacional de Football",
      "Club Atlético Peñarol",
    ],
    descripcion: "Celeste con franjas blancas y escudo AUF",
  },
  portugal: {
    nombre_completo: "Portugal",
    seleccion: "A Seleção",
    colores: ["rojo", "verde"],
    colores_hex: ["006600", "FF0000"],
    patron_tipico: "Rojo con detalles verdes",
    elementos: ["FPF", "bandera portuguesa"],
    equipos_famosos: [
      "Portugal (selección)",
      "SL Benfica",
      "FC Porto",
      "Sporting CP",
    ],
    descripcion: "Rojo con franja vertical verde y escudo FPF",
  },
  colombia: {
    nombre_completo: "Colombia",
    seleccion: "Los Cafeteros",
    colores: ["amarillo", "azul", "rojo"],
    colores_hex: ["FCD116", "003893", "CE1126"],
    patron_tipico: "Amarillo dominante con detalles azules y rojos",
    elementos: ["FCF", "bandera colombiana"],
    equipos_famosos: [
      "Colombia (selección)",
      "Millonarios FC",
      "Atlético Nacional",
      "América de Cali",
    ],
    descripcion: "Amarillo con franja azul y detalles rojos",
  },
  mexico: {
    nombre_completo: "México",
    seleccion: "El Tri",
    colores: ["verde", "blanco", "rojo"],
    colores_hex: ["006847", "FFFFFF", "CE1126"],
    patron_tipico: "Verde dominante con detalles blancos y rojos",
    elementos: ["FMF", "águila", "bandera mexicana"],
    equipos_famosos: [
      "México (selección)",
      "Club América",
      "Cruz Azul",
      "Chivas de Guadalajara",
      "Pumas UNAM",
    ],
    descripcion: "Verde con detalles blancos y rojos, escudo FMF",
  },
  paises_bajos: {
    nombre_completo: "Países Bajos",
    seleccion: "Oranje",
    colores: ["naranja"],
    colores_hex: ["FF6600"],
    patron_tipico: "Naranja dominante",
    elementos: ["KNVB", "bandera neerlandesa"],
    equipos_famosos: [
      "Países Bajos (selección)",
      "Ajax",
      "PSV Eindhoven",
      "Feyenoord",
    ],
    descripcion: "Naranja vibrante con escudo KNVB",
  },
  japon: {
    nombre_completo: "Japón",
    seleccion: "Samurai Blue",
    colores: ["azul", "blanco"],
    colores_hex: ["00214F", "FFFFFF"],
    patron_tipico: "Azul oscuro con detalles blancos",
    elementos: ["JFA", "sol naciente"],
    equipos_famosos: [
      "Japón (selección)",
      "Kashima Antlers",
      "Yokohama F. Marinos",
    ],
    descripcion: "Azul marino con detalles blancos y sol naciente",
  },
  corea_del_sur: {
    nombre_completo: "Corea del Sur",
    seleccion: "Taegeuk Warriors",
    colores: ["rojo", "azul", "blanco"],
    colores_hex: ["CD2E3A", "0047A0", "FFFFFF"],
    patron_tipico: "Blanco con detalles rojos y azules",
    elementos: ["KFA", "tigre", "bandera surcoreana"],
    equipos_famosos: [
      "Corea del Sur (selección)",
      "Ulsan Hyundai",
      "Jeonbuk Hyundai Motors",
    ],
    descripcion: "Blanco con patrón rojo y azul inspired en la bandera",
  },
  nigeria: {
    nombre_completo: "Nigeria",
    seleccion: "Super Eagles",
    colores: ["verde", "blanco"],
    colores_hex: ["008751", "FFFFFF"],
    patron_tipico: "Verde con detalles blancos",
    elementos: ["NFF", "águila", "bandera nigeriana"],
    equipos_famosos: [
      "Nigeria (selección)",
      "Enyimba FC",
    ],
    descripcion: "Verde con patrón geométrico y detalles blancos",
  },
  senegal: {
    nombre_completo: "Senegal",
    seleccion: "Les Lions de la Téranga",
    colores: ["verde", "amarillo", "rojo"],
    colores_hex: ["00853F", "FDEF42", "E31B23"],
    patron_tipico: "Verde con detalles amarillos y rojos",
    elementos: ["FSF", "león", "bandera senegalesa"],
    equipos_famosos: [
      "Senegal (selección)",
    ],
    descripcion: "Verde con estrella amarilla y detalles rojos",
  },
};

export function identifyCountry(productName: string, productId: string): { key: string; info: CountryInfo } | null {
  const text = `${productName} ${productId}`.toLowerCase();
  for (const [key, info] of Object.entries(PAISES_FUTBOL)) {
    if (
      text.includes(key) ||
      text.includes(info.nombre_completo.toLowerCase()) ||
      text.includes(info.seleccion.toLowerCase())
    ) {
      return { key, info };
    }
  }
  const colors = ["celeste", "azul", "rojo", "verde", "amarillo", "naranja", "blanco", "negro"];
  for (const color of colors) {
    if (text.includes(color)) {
      for (const [key, info] of Object.entries(PAISES_FUTBOL)) {
        if (info.colores.includes(color)) {
          return { key, info };
        }
      }
    }
  }
  return null;
}
