import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import Agenda, { type Task } from "@/components/Agenda";
import Entretenimiento, { type EntertainmentItem } from "@/components/Entretenimiento";
import Restaurantes, { type RestaurantItem } from "@/components/Restaurantes";
import TabsShell from "@/components/TabsShell";
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
    completadaAt: t.completadaAt?.toISOString() ?? null,
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
    <TabsShell
      userEmail={session.user.email ?? ""}
      todo={<Agenda initial={tasks} preferences={preferences.taskColors} />}
      entertainment={
        <Entretenimiento
          initial={entertainmentItems}
          preferences={preferences.entertainmentColors}
        />
      }
      restaurants={
        <Restaurantes
          initial={restaurantItems}
          preferences={preferences.restaurantColors}
        />
      }
    />
  );
}
