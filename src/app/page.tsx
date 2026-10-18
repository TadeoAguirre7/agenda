import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import Agenda, { type Task } from "@/components/Agenda";
import Entretenimiento, { type EntertainmentItem } from "@/components/Entretenimiento";
import Restaurantes, { type RestaurantItem } from "@/components/Restaurantes";
import TabsShell from "@/components/TabsShell";
import Gimnasio, { type GymRutina } from "@/components/Gimnasio";
import type { GymSeccion } from "@/lib/parse-rutina";
import { SignInButton } from "@/components/AuthButtons";
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
    orderBy: { createdAt: "asc" },
  });

  const tasks: Task[] = taskRows.map((t) => ({
    id: t.id,
    titulo: t.titulo,
    descripcion: t.descripcion,
    prioridad: t.prioridad as Task["prioridad"],
    fechaVencimiento: t.fechaVencimiento?.toISOString() ?? null,
    recordatorioAt: t.recordatorioAt?.toISOString() ?? null,
    completada: t.completada,
    completadaAt: t.completadaAt?.toISOString() ?? null,
    hora: t.hora,
    duracionMin: t.duracionMin,
    recurrencia: t.recurrencia as Task["recurrencia"],
    intervaloDias: t.intervaloDias,
    diasSemana: t.diasSemana,
    ultimaHechaDia: t.ultimaHechaDia,
  }));

  const entertainmentRows = await prisma.entertainmentItem.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
  });

  const entertainmentItems: EntertainmentItem[] = entertainmentRows.map((i) => ({
    id: i.id,
    titulo: i.titulo,
    categoria: i.categoria as EntertainmentItem["categoria"],
    completada: i.completada,
  }));

  const restaurantRows = await prisma.restaurantItem.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
  });

  const restaurantItems: RestaurantItem[] = restaurantRows.map((i) => ({
    id: i.id,
    titulo: i.titulo,
    categoria: i.categoria as RestaurantItem["categoria"],
    completada: i.completada,
  }));

  const gymRow = await prisma.gymRoutine.findUnique({
    where: { userId },
    include: { dias: { orderBy: { orden: "asc" } } },
  });
  const rutina: GymRutina = gymRow
    ? {
        notas: Array.isArray(gymRow.notas) ? (gymRow.notas as string[]) : [],
        dias: gymRow.dias.map((d) => ({
          id: d.id,
          orden: d.orden,
          titulo: d.titulo,
          subtitulo: d.subtitulo,
          secciones: d.secciones as GymSeccion[],
          completadoAt: d.completadoAt?.toISOString() ?? null,
        })),
      }
    : null;

  return (
    <TabsShell
      gym={<Gimnasio key="gym" initial={rutina} />}
      userEmail={session.user.email ?? ""}
      todo={<Agenda key="todo" initial={tasks} preferences={preferences.taskColors} />}
      entertainment={
        <Entretenimiento
          key="entertainment"
          initial={entertainmentItems}
          preferences={preferences.entertainmentColors}
        />
      }
      restaurants={
        <Restaurantes
          key="restaurants"
          initial={restaurantItems}
          preferences={preferences.restaurantColors}
        />
      }
    />
  );
}
