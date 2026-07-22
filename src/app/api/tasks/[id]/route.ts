import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

const PRIORIDADES = ["alta", "media", "baja"] as const;
const HORA_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const DIA_RE = /^\d{4}-\d{2}-\d{2}$/;

// PATCH /api/tasks/[id] — editar / completar
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

  const existing = await prisma.task.findUnique({ where: { id } });
  if (!existing || existing.userId !== session.user.id) {
    return NextResponse.json({ error: "tarea no encontrada" }, { status: 404 });
  }

  const data: Record<string, unknown> = {};
  if (typeof body.titulo === "string" && body.titulo.trim())
    data.titulo = body.titulo.trim();
  if ("descripcion" in body) data.descripcion = body.descripcion ?? null;
  if (PRIORIDADES.includes(body.prioridad)) data.prioridad = body.prioridad;
  if ("completada" in body) {
    data.completada = Boolean(body.completada);
    data.completadaAt = body.completada ? new Date() : null;
  }
  if ("fechaVencimiento" in body)
    data.fechaVencimiento = body.fechaVencimiento
      ? new Date(body.fechaVencimiento)
      : null;
  if ("recordatorioAt" in body) {
    data.recordatorioAt = body.recordatorioAt
      ? new Date(body.recordatorioAt)
      : null;
    // si se reprograma el recordatorio, volver a notificar
    data.notificado = false;
  }
  if ("hora" in body) {
    data.hora = HORA_RE.test(body.hora ?? "") ? body.hora : null;
  }
  if ("ultimaHechaDia" in body) {
    data.ultimaHechaDia = DIA_RE.test(body.ultimaHechaDia ?? "")
      ? body.ultimaHechaDia
      : null;
  }

  const task = await prisma.task.update({ where: { id }, data });
  return NextResponse.json(task);
}

// DELETE /api/tasks/[id] — borrar
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { id } = await params;
  const existing = await prisma.task.findUnique({ where: { id } });
  if (!existing || existing.userId !== session.user.id) {
    return NextResponse.json({ error: "tarea no encontrada" }, { status: 404 });
  }

  await prisma.task.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
