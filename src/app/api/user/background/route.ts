import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

const MAX_BYTES = 1_500_000; // la imagen llega comprimida (webp ~1920px)
const DATA_URL_RE = /^data:(image\/(?:webp|jpeg|png));base64,([A-Za-z0-9+/=]+)$/;

// Lee el body con tope de bytes (no confía en Content-Length)
async function leerConTope(req: Request, tope: number): Promise<string | null> {
  const reader = req.body?.getReader();
  if (!reader) return null;
  const partes: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.length;
    if (total > tope) {
      await reader.cancel();
      return null;
    }
    partes.push(value);
  }
  return Buffer.concat(partes).toString("utf8");
}

// El tipo declarado tiene que coincidir con la firma real del archivo
function firmaValida(mime: string, b: Buffer): boolean {
  if (mime === "image/png") return b.subarray(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47]));
  if (mime === "image/jpeg") return b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
  if (mime === "image/webp")
    return b.subarray(0, 4).toString("ascii") === "RIFF" && b.subarray(8, 12).toString("ascii") === "WEBP";
  return false;
}

// GET /api/user/background — imagen del fondo del usuario.
// La URL lleva ?v=<updatedAt>, así que se puede cachear para siempre.
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }
  const fondo = await prisma.userBackground.findUnique({
    where: { userId: session.user.id },
  });
  if (!fondo) {
    return NextResponse.json({ error: "sin fondo" }, { status: 404 });
  }
  return new Response(new Uint8Array(fondo.data), {
    headers: {
      "Content-Type": fondo.mime,
      "Cache-Control": "private, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

// PUT /api/user/background — guardar fondo ({ dataUrl })
export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }
  if (Number(req.headers.get("content-length") ?? 0) > MAX_BYTES * 1.5) {
    return NextResponse.json({ error: "la imagen es demasiado grande" }, { status: 413 });
  }
  const crudo = await leerConTope(req, Math.ceil(MAX_BYTES * 1.4) + 1024);
  if (crudo === null) {
    return NextResponse.json({ error: "la imagen es demasiado grande" }, { status: 413 });
  }
  let body: { dataUrl?: unknown } | null = null;
  try {
    body = JSON.parse(crudo);
  } catch {
    body = null;
  }
  const m =
    body && typeof body === "object" && typeof body.dataUrl === "string"
      ? DATA_URL_RE.exec(body.dataUrl)
      : null;
  if (!m) {
    return NextResponse.json({ error: "imagen inválida" }, { status: 400 });
  }
  const data = Buffer.from(m[2], "base64");
  if (data.length === 0 || data.length > MAX_BYTES) {
    return NextResponse.json({ error: "la imagen es demasiado grande" }, { status: 413 });
  }
  if (!firmaValida(m[1], data)) {
    return NextResponse.json({ error: "imagen inválida" }, { status: 400 });
  }

  const fondo = await prisma.userBackground.upsert({
    where: { userId: session.user.id },
    create: { userId: session.user.id, mime: m[1], data },
    update: { mime: m[1], data },
    select: { updatedAt: true },
  });
  return NextResponse.json({ version: fondo.updatedAt.getTime() });
}

// DELETE /api/user/background — volver al fondo por defecto
export async function DELETE() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }
  await prisma.userBackground.deleteMany({ where: { userId: session.user.id } });
  return NextResponse.json({ ok: true });
}
