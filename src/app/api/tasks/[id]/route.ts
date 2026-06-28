import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const PRIORIDADES = ["alta", "media", "baja"] as const;

// PATCH /api/tasks/[id] — editar / completar
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
  if ("descripcion" in body) data.descripcion = body.descripcion ?? null;
  if (PRIORIDADES.includes(body.prioridad)) data.prioridad = body.prioridad;
  if ("completada" in body) data.completada = Boolean(body.completada);
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

  try {
    const task = await prisma.task.update({ where: { id }, data });
    return NextResponse.json(task);
  } catch {
    return NextResponse.json({ error: "tarea no encontrada" }, { status: 404 });
  }
}

// DELETE /api/tasks/[id] — borrar
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    await prisma.task.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "tarea no encontrada" }, { status: 404 });
  }
}
