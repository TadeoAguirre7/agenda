import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

const CATEGORIAS = ["pelis", "series", "musica", "libros"] as const;
const MAX_ITEMS = 200;

// POST /api/entertainment/import — crear varios items de una vez
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body || !Array.isArray(body.titulos)) {
    return NextResponse.json(
      { error: "titulos debe ser un array" },
      { status: 400 },
    );
  }

  const categoria = CATEGORIAS.includes(body.categoria)
    ? body.categoria
    : "pelis";

  const titulos: string[] = Array.from(
    new Set(
      (body.titulos as unknown[])
        .filter((t): t is string => typeof t === "string")
        .map((t) => t.trim())
        .filter((t) => t.length > 0),
    ),
  ).slice(0, MAX_ITEMS);

  if (titulos.length === 0) {
    return NextResponse.json(
      { error: "no hay items válidos" },
      { status: 400 },
    );
  }

  // createdAt escalonado: el primer item pegado queda con el timestamp
  // más reciente y aparece arriba (el listado ordena por createdAt desc)
  const ahora = Date.now();
  await prisma.entertainmentItem.createMany({
    data: titulos.map((titulo, i) => ({
      userId: session.user.id,
      titulo,
      categoria,
      createdAt: new Date(ahora - i),
    })),
  });

  const items = await prisma.entertainmentItem.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(items, { status: 201 });
}
