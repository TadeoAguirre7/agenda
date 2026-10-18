// Parseo de rutinas de gimnasio en texto/markdown pegado.
// Formato esperado (flexible):
//   ## DÍA 1: PIERNA + GLÚTEOS          -> nuevo día
//   **Movilidad y calentamiento**      -> sección del día
//   - Bici suave: 5 min                -> item (nombre: dosis)
//   1. Hip thrust: 4x10-12             -> item
//   https://youtube.com/...            -> video del item anterior
//   ---                                -> fin del día
// Lo que viene después del último día (bullets) se toma como notas.

export type GymItem = { nombre: string; dosis: string | null; url: string | null };
export type GymSeccion = {
  titulo: string;
  tipo: "calentamiento" | "ejercicios" | "otro";
  items: GymItem[];
};
export type GymDiaParsed = {
  titulo: string;
  subtitulo: string | null;
  secciones: GymSeccion[];
};
export type RutinaParsed = { dias: GymDiaParsed[]; notas: string[] };

export const MAX_TEXTO = 50_000;
const MAX_DIAS = 14;
const MAX_ITEMS_SECCION = 40;
const MAX_LARGO = 300;

const HEADING_RE = /^#{1,3}\s+(.+)$/;
const BOLD_RE = /^\*\*(.+?)\*\*:?$/;
const ITEM_RE = /^(?:[-–—•*·+]|\d{1,3}[.)])\s+(.+)$/;
const URL_RE = /^https?:\/\/\S+$/i;

const corto = (s: string) => s.trim().slice(0, MAX_LARGO);

function tipoSeccion(titulo: string): GymSeccion["tipo"] {
  if (/calent|movilidad|warm/i.test(titulo)) return "calentamiento";
  if (/ejerc|rutina|bloque|work/i.test(titulo)) return "ejercicios";
  return "otro";
}

// "Hip thrust (barra): 4x10-12" -> nombre + dosis (último ": ")
function item(texto: string): GymItem {
  const t = texto.replace(/\*\*/g, "").trim();
  const i = t.lastIndexOf(": ");
  if (i > 0) return { nombre: corto(t.slice(0, i)), dosis: corto(t.slice(i + 2)), url: null };
  return { nombre: corto(t), dosis: null, url: null };
}

// "DÍA 1: PIERNA + GLÚTEOS" -> { titulo: "Día 1", subtitulo: "Pierna + glúteos" }
function encabezado(texto: string): { titulo: string; subtitulo: string | null } {
  const t = texto.replace(/\*\*/g, "").trim();
  const i = t.indexOf(":");
  const cap = (s: string) =>
    s === s.toUpperCase() ? s.charAt(0) + s.slice(1).toLowerCase() : s;
  if (i > 0) {
    const sub = t.slice(i + 1).trim();
    return { titulo: corto(cap(t.slice(0, i).trim())), subtitulo: sub ? corto(cap(sub)) : null };
  }
  return { titulo: corto(cap(t)), subtitulo: null };
}

export function parseRutina(texto: string): RutinaParsed {
  const dias: GymDiaParsed[] = [];
  const notas: string[] = [];
  let dia: GymDiaParsed | null = null;
  let seccion: GymSeccion | null = null;
  let ultimo: GymItem | null = null;

  for (const cruda of texto.slice(0, MAX_TEXTO).split(/\r?\n/)) {
    const linea = cruda.trim();
    if (!linea) continue;

    const h = HEADING_RE.exec(linea);
    if (h) {
      if (dias.length >= MAX_DIAS) break;
      dia = { ...encabezado(h[1]), secciones: [] };
      dias.push(dia);
      seccion = null;
      ultimo = null;
      continue;
    }

    if (/^-{3,}$|^\*{3,}$/.test(linea)) {
      dia = null;
      seccion = null;
      ultimo = null;
      continue;
    }

    if (URL_RE.test(linea)) {
      if (ultimo && !ultimo.url) ultimo.url = linea.slice(0, 1000);
      continue;
    }

    const b = BOLD_RE.exec(linea);
    if (b) {
      if (dia) {
        seccion = { titulo: corto(b[1]), tipo: tipoSeccion(b[1]), items: [] };
        dia.secciones.push(seccion);
        ultimo = null;
      }
      continue; // fuera de un día: encabezado de notas, se omite
    }

    const m = ITEM_RE.exec(linea);
    const contenido = m ? m[1] : linea;

    if (dia) {
      if (!seccion) {
        seccion = { titulo: "Ejercicios", tipo: "ejercicios", items: [] };
        dia.secciones.push(seccion);
      }
      if (seccion.items.length < MAX_ITEMS_SECCION) {
        ultimo = item(contenido);
        seccion.items.push(ultimo);
      }
    } else if (dias.length > 0) {
      if (m || notas.length === 0) notas.push(corto(contenido));
      else notas[notas.length - 1] = corto(`${notas[notas.length - 1]} ${contenido}`);
    }
  }

  return {
    dias: dias.filter((d) => d.secciones.some((s) => s.items.length > 0)),
    notas: notas.slice(0, 30),
  };
}

export function contarEjercicios(d: { secciones: GymSeccion[] }): number {
  return d.secciones
    .filter((s) => s.tipo !== "calentamiento")
    .reduce((n, s) => n + s.items.length, 0);
}

// Inverso de parseRutina para un día: texto editable en el mismo formato
export function diaATexto(d: GymDiaParsed): string {
  const lineas = [`## ${d.titulo}${d.subtitulo ? `: ${d.subtitulo}` : ""}`];
  for (const s of d.secciones) {
    lineas.push("", `**${s.titulo}**`);
    s.items.forEach((it, i) => {
      const bullet = s.tipo === "calentamiento" ? "-" : `${i + 1}.`;
      lineas.push(`${bullet} ${it.nombre}${it.dosis ? `: ${it.dosis}` : ""}`);
      if (it.url) lineas.push(it.url);
    });
  }
  return lineas.join("\n");
}

// Notas: una por línea (se aceptan bullets)
export function parseNotas(texto: string): string[] {
  return texto
    .slice(0, MAX_TEXTO)
    .split(/\r?\n/)
    .map((l) => l.replace(/^\s*(?:[-–—•*·+]|\d{1,3}[.)])\s+/, "").trim())
    .filter(Boolean)
    .map((l) => l.slice(0, 500))
    .slice(0, 30);
}

// Búsqueda de YouTube "<ejercicio> tecnica"
export function urlTecnica(nombre: string): string {
  const q = encodeURIComponent(`${nombre.trim()} tecnica`).replace(/%20/g, "+");
  return `https://www.youtube.com/results?search_query=${q}`;
}
