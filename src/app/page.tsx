import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import Agenda, { type Task } from "@/components/Agenda";
import Entretenimiento, { type EntertainmentItem } from "@/components/Entretenimiento";
import Restaurantes, { type RestaurantItem } from "@/components/Restaurantes";
import TabsManager from "@/components/TabsManager";
import { SignInButton, SignOutButton } from "@/components/AuthButtons";
import SettingsPanel from "@/components/SettingsPanel";
import type { UserPreferences } from "@/types/preferences";

export const dynamic = "force-dynamic";

export default async function Home() {
  const session = await auth();

  if (!session?.user?.id) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper px-5">
        <div className="w-full max-w-sm text-center">
          <h1 className="mb-2 font-display text-6xl text-ink">
            Bitácora
          </h1>
          <p className="mb-8 font-mono text-xs uppercase tracking-wider text-faint">
            Inicia sesión para acceder a tu agenda
          </p>
          <SignInButton />
        </div>
      </div>
    );
  }

  const userId = session.user.id;

  const userPrefs = await prisma.user.findUnique({
    where: { id: userId },
    select: { preferences: true },
  });
  const preferences = (userPrefs?.preferences ?? {}) as UserPreferences;

  const taskRows = await prisma.task.findMany({
    where: { userId },
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
    hora: t.hora,
    recurrencia: t.recurrencia as Task["recurrencia"],
    intervaloDias: t.intervaloDias,
    diasSemana: t.diasSemana,
    ultimaHechaDia: t.ultimaHechaDia,
  }));

  const entertainmentRows = await prisma.entertainmentItem.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  const entertainmentItems: EntertainmentItem[] = entertainmentRows.map((i) => ({
    id: i.id,
    titulo: i.titulo,
    categoria: i.categoria as EntertainmentItem["categoria"],
    completada: i.completada,
  }));

  const restaurantRows = await prisma.restaurantItem.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  const restaurantItems: RestaurantItem[] = restaurantRows.map((i) => ({
    id: i.id,
    titulo: i.titulo,
    categoria: i.categoria as RestaurantItem["categoria"],
    completada: i.completada,
  }));

  return (
    <div>
      <TabsManager />
      <header className="sticky top-0 z-10 border-b border-rule bg-paper/95 backdrop-blur">
        <div className="mx-auto max-w-2xl px-5 sm:px-8">
          <div className="flex items-center justify-between gap-3 overflow-x-auto py-3">
            <nav className="flex shrink-0 gap-1">
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
              <button
                data-tab="restaurants"
                className="rounded-full px-4 py-1.5 font-mono text-xs uppercase tracking-wider transition hover:bg-ink/5"
              >
                Lugares
              </button>
            </nav>
            <div className="flex shrink-0 items-center gap-3">
              <span className="font-mono text-xs uppercase tracking-[0.25em] text-faint">
                {new Intl.DateTimeFormat("es-AR", {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                }).format(new Date())}
              </span>
              <SettingsPanel />
              <SignOutButton title={session.user.email ?? ""} />
            </div>
          </div>
        </div>
      </header>

      <div data-content="todo">
        <Agenda initial={tasks} preferences={preferences.taskColors} />
      </div>
      <div data-content="entertainment" className="hidden">
        <Entretenimiento initial={entertainmentItems} preferences={preferences.entertainmentColors} />
      </div>
      <div data-content="restaurants" className="hidden">
        <Restaurantes initial={restaurantItems} preferences={preferences.restaurantColors} />
      </div>
    </div>
  );
}
