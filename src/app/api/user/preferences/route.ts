import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

import type { UserPreferences } from "@/types/preferences";
export type { UserPreferences };

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

  // secciones desactivadas: solo las opcionales (To do list siempre visible)
  const OPCIONALES = ["gym", "entertainment", "restaurants"] as const;
  const tabsOcultas = Array.isArray(body.tabsOcultas)
    ? OPCIONALES.filter((t) => (body.tabsOcultas as unknown[]).includes(t))
    : existing?.tabsOcultas;

  const merged: UserPreferences = {
    ...existing,
    tabsOcultas,
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
