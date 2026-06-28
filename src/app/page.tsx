import { prisma } from "@/lib/prisma";
import Agenda, { type Task } from "@/components/Agenda";

export const dynamic = "force-dynamic";

export default async function Home() {
  const rows = await prisma.task.findMany({
    orderBy: { createdAt: "desc" },
  });

  const tasks: Task[] = rows.map((t) => ({
    id: t.id,
    titulo: t.titulo,
    descripcion: t.descripcion,
    prioridad: t.prioridad as Task["prioridad"],
    fechaVencimiento: t.fechaVencimiento?.toISOString() ?? null,
    recordatorioAt: t.recordatorioAt?.toISOString() ?? null,
    completada: t.completada,
  }));

  return <Agenda initial={tasks} />;
}
