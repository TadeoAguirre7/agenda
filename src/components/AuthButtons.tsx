"use client";

import { signIn, signOut } from "next-auth/react";

export function SignInButton() {
  return (
    <button
      type="button"
      onClick={() => signIn("google")}
      className="inline-block w-full rounded-full bg-ink px-6 py-3 font-mono text-xs uppercase tracking-wider text-paper transition hover:bg-ink/80"
    >
      Iniciar sesión con Google
    </button>
  );
}

export function SignOutButton({ title }: { title?: string }) {
  return (
    <button
      type="button"
      onClick={() => signOut()}
      title={title}
      className="rounded-full px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-faint transition hover:bg-ink/5"
    >
      Salir
    </button>
  );
}
