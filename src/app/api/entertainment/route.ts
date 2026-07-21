import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

const CATEGORIAS = ["pelis", "series", "musica", "libros"] as const;

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const items = await prisma.entertainmentItem.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(items);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body.titulo !== "string" || !body.titulo.trim()) {
    return NextResponse.json(
      { error: "titulo es requerido" },
      { status: 400 },
    );
  }

  const categoria = CATEGORIAS.includes(body.categoria)
    ? body.categoria
    : "pelis";

  const item = await prisma.entertainmentItem.create({
    data: {
      userId: session.user.id,
      titulo: body.titulo.trim(),
      categoria,
    },
  });

  return NextResponse.json(item, { status: 201 });
}
