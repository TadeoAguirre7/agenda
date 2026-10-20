import { cache } from "react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { UserPreferences } from "@/types/preferences";

export const NOMBRE_APP = "Agenda";

// Nombre de la app para el usuario de la sesión: preferences.appName o
// "Agenda". Se guarda en la base (no en el código) para no exponer emails.
export const nombreApp = cache(async (): Promise<string> => {
  const session = await auth();
  if (!session?.user?.id) return NOMBRE_APP;
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { preferences: true },
  });
  const nombre = (user?.preferences as UserPreferences | null)?.appName;
  return typeof nombre === "string" && nombre.trim() ? nombre.trim().slice(0, 40) : NOMBRE_APP;
});
