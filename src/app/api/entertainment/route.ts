import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const CATEGORIAS = ["pelis", "series", "musica", "libros"] as const;

export async function GET() {
  const items = await prisma.entertainmentItem.findMany({
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(items);
}

export async function POST(req: Request) {
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
      titulo: body.titulo.trim(),
      categoria,
    },
  });

  return NextResponse.json(item, { status: 201 });
}
