// Parseo de listas pegadas o importadas: un item por línea.
// Limpia bullets ("- ", "• ", "1. ", "1) "), espacios, líneas vacías
// y duplicados exactos (case-insensitive).

const BULLET_RE = /^\s*(?:[-–—•*·+]|\d{1,3}[.)])\s+/;

export function parseLista(texto: string): string[] {
  const vistos = new Set<string>();
  const items: string[] = [];

  for (const linea of texto.split(/\r?\n/)) {
    const limpio = linea.replace(BULLET_RE, "").trim();
    if (!limpio) continue;
    const clave = limpio.toLowerCase();
    if (vistos.has(clave)) continue;
    vistos.add(clave);
    items.push(limpio);
  }

  return items;
}

// CSV simple: toma la primera columna de cada fila,
// respetando campos entrecomillados ("" es comilla escapada).
export function csvALineas(texto: string): string[] {
  return texto.split(/\r?\n/).map((linea) => {
    const l = linea.trim();
    if (l.startsWith('"')) {
      let campo = "";
      for (let i = 1; i < l.length; i++) {
        if (l[i] === '"') {
          if (l[i + 1] === '"') {
            campo += '"';
            i++;
          } else {
            break;
          }
        } else {
          campo += l[i];
        }
      }
      return campo.trim();
    }
    return (l.split(",")[0] ?? "").trim();
  });
}
