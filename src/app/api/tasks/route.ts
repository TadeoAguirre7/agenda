import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const PRIORIDADES = ["alta", "media", "baja"] as const;

// GET /api/tasks — listar tareas ordenadas por prioridad y fecha
export async function GET() {
  const tasks = await prisma.task.findMany({
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(tasks);
}

// POST /api/tasks — crear tarea
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body.titulo !== "string" || !body.titulo.trim()) {
    return NextResponse.json(
      { error: "titulo es requerido" },
      { status: 400 },
    );
  }

  const prioridad = PRIORIDADES.includes(body.prioridad)
    ? body.prioridad
    : "media";

  const task = await prisma.task.create({
    data: {
      titulo: body.titulo.trim(),
      descripcion: body.descripcion ?? null,
      prioridad,
      fechaVencimiento: body.fechaVencimiento
        ? new Date(body.fechaVencimiento)
        : null,
      recordatorioAt: body.recordatorioAt
        ? new Date(body.recordatorioAt)
        : null,
    },
  });

  return NextResponse.json(task, { status: 201 });
}
