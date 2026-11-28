"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useUser } from "@/lib/use-user";

export default function NuevoTorneoPage() {
  const router = useRouter();
  const { user, loading } = useUser();
  const [nombre, setNombre] = useState("");
  const [sets, setSets] = useState("3");
  const [juegos, setJuegos] = useState("6");
  const [fechaInicio, setFechaInicio] = useState("");
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);

  async function crear(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setGuardando(true);
    setError("");

    const { data, error } = await supabase
      .from("torneos")
      .insert({
        nombre: nombre.trim(),
        deporte: "tenis",
        creado_por: user.id, // la regla de seguridad exige que sea tu propio usuario
        fecha_inicio: fechaInicio || null,
        sets_por_partido: Number(sets),
        juegos_por_set: Number(juegos),
      })
      .select("id")
      .single();

    if (error || !data) {
      setError(error?.message ?? "No se ha podido crear el torneo");
      setGuardando(false);
      return;
    }
    router.push(`/torneos/${data.id}`);
  }

  if (loading) return <main className="mx-auto max-w-md p-6">Cargando…</main>;

  if (!user) {
    return (
      <main className="mx-auto max-w-md p-6">
        <p className="mb-4">Para crear un torneo tienes que entrar primero.</p>
        <Link href="/login" className="rounded bg-foreground px-4 py-2 text-background">
          Entrar
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-md p-6">
      <Link href="/" className="text-sm underline">← Mis torneos</Link>
      <h1 className="mb-4 mt-2 text-2xl font-bold">Nuevo torneo</h1>

      <form onSubmit={crear} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1">
          Nombre
          <input
            required
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Liga de enero"
            className="rounded border p-2"
          />
        </label>

        <label className="flex flex-col gap-1">
          Partidos al mejor de
          <select value={sets} onChange={(e) => setSets(e.target.value)} className="rounded border p-2">
            <option value="1">1 set</option>
            <option value="3">3 sets</option>
            <option value="5">5 sets</option>
          </select>
        </label>

        <label className="flex flex-col gap-1">
          Juegos por set
          <input
            type="number"
            min={1}
            max={10}
            required
            value={juegos}
            onChange={(e) => setJuegos(e.target.value)}
            className="rounded border p-2"
          />
        </label>

        <label className="flex flex-col gap-1">
          Fecha de inicio (opcional)
          <input
            type="date"
            value={fechaInicio}
            onChange={(e) => setFechaInicio(e.target.value)}
            className="rounded border p-2"
          />
        </label>

        <button disabled={guardando} className="rounded bg-foreground p-2 text-background disabled:opacity-50">
          {guardando ? "Creando…" : "Crear torneo"}
        </button>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </form>
    </main>
  );
}
