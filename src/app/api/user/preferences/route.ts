import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export type UserPreferences = {
  taskColors?: Partial<Record<"alta" | "media" | "baja", string>>;
  entertainmentColors?: Partial<Record<"pelis" | "series" | "musica" | "libros", string>>;
  restaurantColors?: Partial<Record<"restaurantes" | "cafes" | "museos" | "ferias", string>>;
};

// GET /api/user/preferences
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { preferences: true },
  });

  return NextResponse.json((user?.preferences ?? {}) as UserPreferences);
}

// PATCH /api/user/preferences
export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as UserPreferences;
  const existing = (await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { preferences: true },
  }))?.preferences as UserPreferences | undefined;

  const merged: UserPreferences = {
    ...existing,
    taskColors: { ...existing?.taskColors, ...body.taskColors },
    entertainmentColors: { ...existing?.entertainmentColors, ...body.entertainmentColors },
    restaurantColors: { ...existing?.restaurantColors, ...body.restaurantColors },
  };

  await prisma.user.update({
    where: { id: session.user.id },
    data: { preferences: merged },
  });

  return NextResponse.json(merged);
}
