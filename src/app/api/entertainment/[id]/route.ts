import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "body inválido" }, { status: 400 });
  }

  const data: Record<string, unknown> = {};
  if (typeof body.titulo === "string" && body.titulo.trim())
    data.titulo = body.titulo.trim();
  if ("completada" in body) data.completada = Boolean(body.completada);

  try {
    const item = await prisma.entertainmentItem.update({ where: { id }, data });
    return NextResponse.json(item);
  } catch {
    return NextResponse.json({ error: "item no encontrado" }, { status: 404 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    await prisma.entertainmentItem.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "item no encontrado" }, { status: 404 });
  }
}
