import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { MAX_TEXTO, parseNotas, parseRutina } from "@/lib/parse-rutina";

// POST /api/gym — importar rutina desde texto (reemplaza la actual)
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }
  const userId = session.user.id;

  // cortar bodies enormes antes de parsear el JSON
  if (Number(req.headers.get("content-length") ?? 0) > MAX_TEXTO * 2) {
    return NextResponse.json({ error: "la rutina es demasiado larga" }, { status: 413 });
  }
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object" || typeof body.texto !== "string" || !body.texto.trim()) {
    return NextResponse.json({ error: "texto es requerido" }, { status: 400 });
  }
  if (body.texto.length > MAX_TEXTO) {
    return NextResponse.json({ error: "la rutina es demasiado larga" }, { status: 400 });
  }

  const { dias, notas } = parseRutina(body.texto);
  if (dias.length === 0) {
    return NextResponse.json(
      { error: "no encontré días: cada día tiene que empezar con ## (ej. ## DÍA 1: PIERNA)" },
      { status: 400 },
    );
  }

  const rutina = await prisma.$transaction(async (tx) => {
    await tx.gymRoutine.deleteMany({ where: { userId } });
    return tx.gymRoutine.create({
      data: {
        userId,
        notas,
        dias: {
          create: dias.map((d, i) => ({
            orden: i,
            posicion: i,
            titulo: d.titulo,
            subtitulo: d.subtitulo,
            secciones: d.secciones,
          })),
        },
      },
      include: { dias: { orderBy: { posicion: "asc" } } },
    });
  });

  return NextResponse.json(rutina, { status: 201 });
}

// PATCH /api/gym — editar las notas ({ notas: "una por línea" })
export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object" || typeof body.notas !== "string") {
    return NextResponse.json({ error: "notas es requerido" }, { status: 400 });
  }
  const notas = parseNotas(body.notas);
  const res = await prisma.gymRoutine.updateMany({
    where: { userId: session.user.id },
    data: { notas },
  });
  if (res.count === 0) {
    return NextResponse.json({ error: "no hay rutina" }, { status: 404 });
  }
  return NextResponse.json({ notas });
}

// DELETE /api/gym — borrar la rutina
export async function DELETE() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }
  await prisma.gymRoutine.deleteMany({ where: { userId: session.user.id } });
  return NextResponse.json({ ok: true });
}
