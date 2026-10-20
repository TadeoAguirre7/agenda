import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// PUT /api/gym/orden — guardar el orden de los días ({ ids: [...] })
export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }
  const body = await req.json().catch(() => null);
  const ids: unknown = body && typeof body === "object" ? body.ids : null;
  if (!Array.isArray(ids) || ids.length > 30 || !ids.every((i) => typeof i === "string")) {
    return NextResponse.json({ error: "ids inválidos" }, { status: 400 });
  }

  const rutina = await prisma.gymRoutine.findUnique({
    where: { userId: session.user.id },
    select: { dias: { select: { id: true } } },
  });
  const propios = new Set(rutina?.dias.map((d) => d.id) ?? []);
  // tienen que ser exactamente los días de la rutina del usuario
  if (ids.length !== propios.size || new Set(ids).size !== ids.length || !ids.every((i) => propios.has(i))) {
    return NextResponse.json({ error: "ids inválidos" }, { status: 400 });
  }

  await prisma.$transaction(
    (ids as string[]).map((id, posicion) =>
      prisma.gymDay.update({ where: { id }, data: { posicion } }),
    ),
  );
  return NextResponse.json({ ok: true });
}
