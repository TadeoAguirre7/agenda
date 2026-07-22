import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

const CATEGORIAS = ["restaurantes", "cafes", "museos", "ferias"] as const;
const MAX_ITEMS = 200;

// POST /api/restaurants/import — crear varios items de una vez
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
    : "restaurantes";

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

  const creados = await prisma.$transaction(
    titulos.map((titulo) =>
      prisma.restaurantItem.create({
        data: { userId: session.user.id, titulo, categoria },
      }),
    ),
  );

  return NextResponse.json(creados, { status: 201 });
}
