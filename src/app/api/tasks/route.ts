import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

const PRIORIDADES = ["alta", "media", "baja"] as const;
const RECURRENCIAS = ["ninguna", "diaria", "intervalo", "semanal"] as const;
const HORA_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

function validarDiasSemana(value: unknown): string | null {
  if (typeof value !== "string" || !value) return null;
  const dias = value.split(",").map((d) => d.trim());
  if (dias.some((d) => !/^[0-6]$/.test(d))) return null;
  return dias.join(",");
}

// GET /api/tasks — listar tareas del usuario autenticado
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const tasks = await prisma.task.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(tasks);
}

// POST /api/tasks — crear tarea
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

  const prioridad = PRIORIDADES.includes(body.prioridad)
    ? body.prioridad
    : "media";

  const recurrencia = RECURRENCIAS.includes(body.recurrencia)
    ? body.recurrencia
    : "ninguna";
  const esRecurrente = recurrencia !== "ninguna";

  const intervaloDias =
    recurrencia === "intervalo" &&
    Number.isInteger(body.intervaloDias) &&
    body.intervaloDias >= 2 &&
    body.intervaloDias <= 365
      ? body.intervaloDias
      : null;

  const diasSemana =
    recurrencia === "semanal" ? validarDiasSemana(body.diasSemana) : null;

  // semanal sin días elegidos no tiene sentido
  if (recurrencia === "semanal" && !diasSemana) {
    return NextResponse.json(
      { error: "elegí al menos un día de la semana" },
      { status: 400 },
    );
  }
  // intervalo sin cantidad válida tampoco
  if (recurrencia === "intervalo" && !intervaloDias) {
    return NextResponse.json(
      { error: "intervaloDias debe ser un entero entre 2 y 365" },
      { status: 400 },
    );
  }

  const task = await prisma.task.create({
    data: {
      userId: session.user.id,
      titulo: body.titulo.trim(),
      descripcion: body.descripcion ?? null,
      prioridad,
      hora: HORA_RE.test(body.hora ?? "") ? body.hora : null,
      recurrencia,
      intervaloDias,
      diasSemana,
      // recurrentes no llevan fecha puntual: la define la regla
      fechaVencimiento:
        !esRecurrente && body.fechaVencimiento
          ? new Date(body.fechaVencimiento)
          : null,
      recordatorioAt:
        !esRecurrente && body.recordatorioAt
          ? new Date(body.recordatorioAt)
          : null,
    },
  });

  return NextResponse.json(task, { status: 201 });
}
