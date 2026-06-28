import { prisma } from "@/lib/prisma";
import Agenda, { type Task } from "@/components/Agenda";
import Entretenimiento, { type EntertainmentItem } from "@/components/Entretenimiento";
import TabsManager from "@/components/TabsManager";

export const dynamic = "force-dynamic";

export default async function Home() {
  const taskRows = await prisma.task.findMany({
    orderBy: { createdAt: "desc" },
  });

  const tasks: Task[] = taskRows.map((t) => ({
    id: t.id,
    titulo: t.titulo,
    descripcion: t.descripcion,
    prioridad: t.prioridad as Task["prioridad"],
    fechaVencimiento: t.fechaVencimiento?.toISOString() ?? null,
    recordatorioAt: t.recordatorioAt?.toISOString() ?? null,
    completada: t.completada,
  }));

  const entertainmentRows = await prisma.entertainmentItem.findMany({
    orderBy: { createdAt: "desc" },
  });

  const entertainmentItems: EntertainmentItem[] = entertainmentRows.map((i) => ({
    id: i.id,
    titulo: i.titulo,
    categoria: i.categoria as EntertainmentItem["categoria"],
    completada: i.completada,
  }));

  return (
    <div>
      <TabsManager />
      <header className="sticky top-0 z-10 border-b border-rule bg-paper/95 backdrop-blur">
        <div className="mx-auto max-w-2xl px-5 sm:px-8">
          <div className="flex items-center justify-between py-3">
            <nav className="flex gap-1">
              <button
                data-tab="todo"
                className="rounded-full px-4 py-1.5 font-mono text-xs uppercase tracking-wider transition hover:bg-ink/5"
              >
                To do list
              </button>
              <button
                data-tab="entertainment"
                className="rounded-full px-4 py-1.5 font-mono text-xs uppercase tracking-wider transition hover:bg-ink/5"
              >
                Entretenimiento
              </button>
            </nav>
            <span className="font-mono text-xs uppercase tracking-[0.25em] text-faint">
              {new Intl.DateTimeFormat("es-AR", {
                weekday: "short",
                day: "numeric",
                month: "short",
              }).format(new Date())}
            </span>
          </div>
        </div>
      </header>

      <div data-content="todo">
        <Agenda initial={tasks} />
      </div>
      <div data-content="entertainment" className="hidden">
        <Entretenimiento initial={entertainmentItems} />
      </div>
    </div>
  );
}
