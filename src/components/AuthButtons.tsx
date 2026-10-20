"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
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
  const [confirmar, setConfirmar] = useState(false);
  const [saliendo, setSaliendo] = useState(false);

  useEffect(() => {
    if (!confirmar) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setConfirmar(false);
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [confirmar]);

  return (
    <>
      <button
        type="button"
        onClick={() => setConfirmar(true)}
        title={title}
        className="rounded-full px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-faint transition hover:bg-ink/5"
      >
        Salir
      </button>
      {confirmar &&
        // portal: el header usa backdrop-blur, que rompe position: fixed
        createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 px-5"
            onClick={() => setConfirmar(false)}
          >
            <div
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="salir-titulo"
              className="w-full max-w-sm rounded-xl border border-rule bg-paper p-5 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h3
                id="salir-titulo"
                className="font-mono text-xs uppercase tracking-[0.2em] text-ink"
              >
                Cerrar sesión
              </h3>
              <p className="mt-3 text-sm text-ink">
                ¿Querés cerrar sesión
                {title ? (
                  <>
                    {" "}
                    de <strong className="break-all">{title}</strong>
                  </>
                ) : null}
                ? Tus datos quedan guardados en tu cuenta.
              </p>
              <div className="mt-5 flex justify-end gap-3">
                <button
                  type="button"
                  autoFocus
                  onClick={() => setConfirmar(false)}
                  className="font-mono text-xs uppercase tracking-wider text-faint underline-offset-4 hover:underline"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={saliendo}
                  onClick={() => {
                    setSaliendo(true);
                    signOut();
                  }}
                  className="rounded-full bg-ink px-4 py-1.5 font-mono text-xs uppercase tracking-wider text-paper transition disabled:opacity-50"
                >
                  {saliendo ? "Saliendo…" : "Cerrar sesión"}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
