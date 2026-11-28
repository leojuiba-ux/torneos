"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useUser } from "@/lib/use-user";

type TorneoResumen = {
  id: string;
  nombre: string;
  deporte: string;
  creado_por: string;
};

export default function Home() {
  const { user, loading } = useUser();
  const [torneos, setTorneos] = useState<TorneoResumen[] | null>(null);

  useEffect(() => {
    if (!user) return;
    // Gracias a las reglas de seguridad, solo llegan los torneos que organizas o en los que juegas.
    supabase
      .from("torneos")
      .select("id, nombre, deporte, creado_por")
      .order("creado_en", { ascending: false })
      .then(({ data }) => setTorneos((data ?? []) as TorneoResumen[]));
  }, [user]);

  if (loading) return <main className="mx-auto max-w-2xl p-6">Cargando…</main>;

  if (!user) {
    return (
      <main className="mx-auto max-w-2xl p-6">
        <h1 className="mb-2 text-3xl font-bold">Rondia</h1>
        <p className="mb-6">Organiza tus ligas y torneos sin perseguir a nadie por WhatsApp.</p>
        <Link href="/login" className="rounded bg-foreground px-4 py-2 text-background">
          Entrar
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Mis torneos</h1>
        <Link href="/torneos/nuevo" className="rounded bg-foreground px-4 py-2 text-background">
          Crear torneo
        </Link>
      </div>

      {torneos === null && <p>Cargando…</p>}
      {torneos !== null && torneos.length === 0 && (
        <p>Todavía no tienes torneos. Crea uno o espera a que te inviten.</p>
      )}

      <ul className="flex flex-col gap-3">
        {torneos?.map((t) => (
          <li key={t.id}>
            <Link
              href={`/torneos/${t.id}`}
              className="flex items-center justify-between rounded border p-4 hover:bg-black/5 dark:hover:bg-white/10"
            >
              <span className="font-medium">{t.nombre}</span>
              <span className="text-sm opacity-70">
                {t.creado_por === user.id ? "Organizador" : "Jugador"}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
