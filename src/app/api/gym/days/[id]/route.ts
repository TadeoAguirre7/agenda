import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { MAX_TEXTO, parseRutina } from "@/lib/parse-rutina";

// PATCH /api/gym/days/[id] — marcar hecho ({ completado: true }) o
// restaurar la fecha anterior ({ completadoAt: ISO | null }, para "deshacer")
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "body inválido" }, { status: 400 });
  }

  const dia = await prisma.gymDay.findUnique({
    where: { id },
    include: { routine: { select: { userId: true } } },
  });
  if (!dia || dia.routine.userId !== session.user.id) {
    return NextResponse.json({ error: "día no encontrado" }, { status: 404 });
  }

  // edición del contenido del día (mismo formato que la importación)
  if (typeof body.texto === "string") {
    if (body.texto.length > MAX_TEXTO) {
      return NextResponse.json({ error: "el día es demasiado largo" }, { status: 400 });
    }
    const [nuevo] = parseRutina(body.texto).dias;
    if (!nuevo) {
      return NextResponse.json(
        { error: "falta el encabezado ## o algún ejercicio" },
        { status: 400 },
      );
    }
    const actualizado = await prisma.gymDay.update({
      where: { id },
      data: {
        titulo: nuevo.titulo,
        subtitulo: nuevo.subtitulo,
        secciones: nuevo.secciones,
      },
    });
    return NextResponse.json(actualizado);
  }

  let completadoAt: Date | null;
  if (body.completado === true) {
    completadoAt = new Date();
  } else if ("completadoAt" in body) {
    if (body.completadoAt === null) completadoAt = null;
    else {
      const d =
        typeof body.completadoAt === "string" ? new Date(body.completadoAt) : null;
      if (!d || Number.isNaN(d.getTime()) || d > new Date()) {
        return NextResponse.json({ error: "completadoAt inválida" }, { status: 400 });
      }
      completadoAt = d;
    }
  } else {
    return NextResponse.json({ error: "nada para actualizar" }, { status: 400 });
  }

  // al terminar va al final; al deshacer vuelve a la posición que mandó el cliente
  let posicion: number | undefined;
  if (body.completado === true) {
    const ultimo = await prisma.gymDay.aggregate({
      where: { routineId: dia.routineId },
      _max: { posicion: true },
    });
    posicion = (ultimo._max.posicion ?? 0) + 1;
  } else if (Number.isInteger(body.posicion) && body.posicion >= 0 && body.posicion < 1000) {
    posicion = body.posicion;
  }

  const actualizado = await prisma.gymDay.update({
    where: { id },
    data: { completadoAt, ...(posicion !== undefined && { posicion }) },
  });
  return NextResponse.json(actualizado);
}
