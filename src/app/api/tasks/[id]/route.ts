import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

const PRIORIDADES = ["alta", "media", "baja"] as const;
const RECURRENCIAS = ["ninguna", "diaria", "intervalo", "semanal"] as const;
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

  for (const k of ["fechaVencimiento", "recordatorioAt"]) {
    if (body[k] && Number.isNaN(new Date(body[k]).getTime())) {
      return NextResponse.json({ error: `${k} inválida` }, { status: 400 });
    }
  }

  const data: Record<string, unknown> = {};
  if (typeof body.titulo === "string" && body.titulo.trim())
    data.titulo = body.titulo.trim();
  if ("descripcion" in body) data.descripcion = body.descripcion ?? null;
  if (PRIORIDADES.includes(body.prioridad)) data.prioridad = body.prioridad;
  if ("completada" in body) {
    data.completada = Boolean(body.completada);
    let at: Date | null = body.completada ? new Date() : null;
    // el cliente puede indicar el día (completar desde otro día de la agenda)
    if (at && typeof body.completadaAt === "string") {
      const d = new Date(body.completadaAt);
      // solo días razonables (completar desde el calendario, ±1 año)
      if (
        !Number.isNaN(d.getTime()) &&
        Math.abs(d.getTime() - Date.now()) <= 366 * 86400000
      )
        at = d;
    }
    data.completadaAt = at;
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
  if (RECURRENCIAS.includes(body.recurrencia)) {
    const rec = body.recurrencia;
    if (
      rec === "intervalo" &&
      !(Number.isInteger(body.intervaloDias) &&
        body.intervaloDias >= 2 &&
        body.intervaloDias <= 365)
    ) {
      return NextResponse.json(
        { error: "intervaloDias debe ser un entero entre 2 y 365" },
        { status: 400 },
      );
    }
    let dias: string | null = null;
    if (rec === "semanal") {
      const lista: string[] =
        typeof body.diasSemana === "string"
          ? body.diasSemana.split(",").map((d: string) => d.trim())
          : [];
      if (!lista.length || lista.some((d) => !/^[0-6]$/.test(d))) {
        return NextResponse.json(
          { error: "elegí al menos un día de la semana" },
          { status: 400 },
        );
      }
      dias = lista.join(",");
    }
    data.recurrencia = rec;
    data.intervaloDias = rec === "intervalo" ? body.intervaloDias : null;
    data.diasSemana = dias;
    // recurrentes no llevan fecha puntual
    if (rec !== "ninguna") {
      data.recordatorioAt = null;
      data.fechaVencimiento = null;
    }
  }
  if ("duracionMin" in body) {
    const d = body.duracionMin;
    data.duracionMin =
      Number.isInteger(d) && d >= 1 && d <= 1440 ? d : null;
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
