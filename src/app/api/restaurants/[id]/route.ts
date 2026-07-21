import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

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
  if (!body) {
    return NextResponse.json({ error: "body inválido" }, { status: 400 });
  }

  const existing = await prisma.restaurantItem.findUnique({ where: { id } });
  if (!existing || existing.userId !== session.user.id) {
    return NextResponse.json({ error: "item no encontrado" }, { status: 404 });
  }

  const data: Record<string, unknown> = {};
  if (typeof body.titulo === "string" && body.titulo.trim())
    data.titulo = body.titulo.trim();
  if ("completada" in body) data.completada = Boolean(body.completada);

  const item = await prisma.restaurantItem.update({ where: { id }, data });
  return NextResponse.json(item);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { id } = await params;
  const existing = await prisma.restaurantItem.findUnique({ where: { id } });
  if (!existing || existing.userId !== session.user.id) {
    return NextResponse.json({ error: "item no encontrado" }, { status: 404 });
  }

  await prisma.restaurantItem.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
