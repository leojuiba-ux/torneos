"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useUser } from "@/lib/use-user";

type Torneo = {
  id: string;
  nombre: string;
  deporte: string;
  creado_por: string;
  fecha_inicio: string | null;
  sets_por_partido: number;
  juegos_por_set: number;
};
type Participante = {
  jugador_id: string;
  jugadores: { nombre: string; correo: string } | null;
};
type SetPartido = { numero_set: number; juegos_a: number; juegos_b: number };
type Partido = {
  id: string;
  jugador_a_id: string;
  jugador_b_id: string;
  fecha_limite: string | null;
  estado: "pendiente" | "jugado";
  ganador_id: string | null;
  sets_partido: SetPartido[];
};
type FilaClasificacion = {
  jugador_id: string;
  nombre: string;
  jugados: number;
  ganados: number;
  perdidos: number;
  puntos: number;
  dif_sets: number;
  dif_juegos: number;
  posicion: number;
};

// useParams necesita un <Suspense> alrededor en esta versión de Next (cacheComponents activado).
export default function TorneoPage() {
  return (
    <Suspense fallback={<main className="mx-auto max-w-2xl p-6">Cargando…</main>}>
      <TorneoContenido />
    </Suspense>
  );
}

function TorneoContenido() {
  const { id } = useParams<{ id: string }>();
  const { user, loading: cargandoUsuario } = useUser();
  const userId = user?.id;

  const [torneo, setTorneo] = useState<Torneo | null>(null);
  const [participantes, setParticipantes] = useState<Participante[]>([]);
  const [partidos, setPartidos] = useState<Partido[]>([]);
  const [tabla, setTabla] = useState<FilaClasificacion[]>([]);
  const [miJugadorId, setMiJugadorId] = useState<string | null>(null);
  const [estado, setEstado] = useState<"cargando" | "ok" | "no-encontrado">("cargando");

  const cargar = useCallback(async () => {
    if (!userId) return;
    const [t, pa, pt, cl, yo] = await Promise.all([
      supabase.from("torneos").select("*").eq("id", id).maybeSingle(),
      supabase
        .from("participantes")
        .select("jugador_id, jugadores(nombre, correo)")
        .eq("torneo_id", id),
      supabase
        .from("partidos")
        .select(
          "id, jugador_a_id, jugador_b_id, fecha_limite, estado, ganador_id, sets_partido(numero_set, juegos_a, juegos_b)"
        )
        .eq("torneo_id", id)
        .order("fecha_limite", { ascending: true }),
      supabase
        .from("clasificacion")
        .select("*")
        .eq("torneo_id", id)
        .order("posicion", { ascending: true }),
      supabase.from("jugadores").select("id").eq("user_id", userId).maybeSingle(),
    ]);

    if (!t.data) {
      setEstado("no-encontrado");
      return;
    }
    setTorneo(t.data as Torneo);
    setParticipantes((pa.data ?? []) as unknown as Participante[]);
    setPartidos((pt.data ?? []) as unknown as Partido[]);
    setTabla((cl.data ?? []) as FilaClasificacion[]);
    setMiJugadorId((yo.data as { id: string } | null)?.id ?? null);
    setEstado("ok");
  }, [id, userId]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  if (cargandoUsuario) return <main className="mx-auto max-w-2xl p-6">Cargando…</main>;

  if (!user) {
    return (
      <main className="mx-auto max-w-2xl p-6">
        <p className="mb-4">Entra para ver este torneo.</p>
        <Link href="/login" className="rounded bg-foreground px-4 py-2 text-background">
          Entrar
        </Link>
      </main>
    );
  }

  if (estado === "cargando") return <main className="mx-auto max-w-2xl p-6">Cargando…</main>;

  if (estado === "no-encontrado" || !torneo) {
    return (
      <main className="mx-auto max-w-2xl p-6">
        <Link href="/" className="text-sm underline">← Mis torneos</Link>
        <p className="mt-4">No encontramos este torneo, o no tienes acceso a él.</p>
      </main>
    );
  }

  const esOrganizador = torneo.creado_por === user.id;
  const nombres = new Map(participantes.map((p) => [p.jugador_id, p.jugadores?.nombre ?? "—"]));
  const calendarioGenerado = partidos.length > 0;

  return (
    <main className="mx-auto max-w-2xl p-6">
      <Link href="/" className="text-sm underline">← Mis torneos</Link>
      <h1 className="mb-1 mt-2 text-2xl font-bold">{torneo.nombre}</h1>
      <p className="mb-6 text-sm opacity-70">
        Al mejor de {torneo.sets_por_partido} {torneo.sets_por_partido === 1 ? "set" : "sets"} ·{" "}
        sets a {torneo.juegos_por_set} juegos {esOrganizador && "· Eres el organizador"}
      </p>

      {/* CLASIFICACIÓN */}
      <section className="mb-8">
        <h2 className="mb-2 text-lg font-semibold">Clasificación</h2>
        {tabla.length === 0 ? (
          <p className="text-sm opacity-70">Aún no hay jugadores.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b">
                  <th className="py-1 pr-2">#</th>
                  <th className="py-1 pr-2">Jugador</th>
                  <th className="py-1 pr-2" title="Partidos jugados">PJ</th>
                  <th className="py-1 pr-2" title="Ganados">G</th>
                  <th className="py-1 pr-2" title="Perdidos">P</th>
                  <th className="py-1 pr-2">Pts</th>
                  <th className="py-1 pr-2" title="Diferencia de sets">Sets</th>
                  <th className="py-1" title="Diferencia de juegos">Juegos</th>
                </tr>
              </thead>
              <tbody>
                {tabla.map((f) => (
                  <tr key={f.jugador_id} className="border-b last:border-0">
                    <td className="py-1 pr-2">{f.posicion}</td>
                    <td className="py-1 pr-2 font-medium">{f.nombre}</td>
                    <td className="py-1 pr-2">{f.jugados}</td>
                    <td className="py-1 pr-2">{f.ganados}</td>
                    <td className="py-1 pr-2">{f.perdidos}</td>
                    <td className="py-1 pr-2 font-semibold">{f.puntos}</td>
                    <td className="py-1 pr-2">{f.dif_sets > 0 ? `+${f.dif_sets}` : f.dif_sets}</td>
                    <td className="py-1">{f.dif_juegos > 0 ? `+${f.dif_juegos}` : f.dif_juegos}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* PARTIDOS */}
      <section className="mb-8">
        <h2 className="mb-2 text-lg font-semibold">Partidos</h2>
        {!calendarioGenerado && (
          <p className="text-sm opacity-70">
            {esOrganizador
              ? "Invita a los jugadores y genera el calendario cuando estén todos."
              : "El organizador aún no ha generado el calendario."}
          </p>
        )}
        <ul className="flex flex-col gap-3">
          {partidos.map((p) => (
            <PartidoCard
              key={p.id}
              partido={p}
              nombres={nombres}
              torneo={torneo}
              puedeEditar={esOrganizador || p.jugador_a_id === miJugadorId || p.jugador_b_id === miJugadorId}
              alGuardar={cargar}
            />
          ))}
        </ul>
      </section>

      {/* JUGADORES */}
      <section className="mb-8">
        <h2 className="mb-2 text-lg font-semibold">Jugadores ({participantes.length})</h2>
        <ul className="mb-4 flex flex-col gap-1 text-sm">
          {participantes.map((p) => (
            <li key={p.jugador_id}>
              {p.jugadores?.nombre}
              {esOrganizador && <span className="opacity-60"> · {p.jugadores?.correo}</span>}
            </li>
          ))}
        </ul>

        {esOrganizador && !calendarioGenerado && (
          <>
            <InvitarForm torneoId={torneo.id} alTerminar={cargar} />
            {participantes.length >= 2 && (
              <GenerarCalendario torneoId={torneo.id} alTerminar={cargar} />
            )}
          </>
        )}
      </section>
    </main>
  );
}

function InvitarForm({ torneoId, alTerminar }: { torneoId: string; alTerminar: () => void }) {
  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setError("");
    const { error } = await supabase.rpc("invitar_jugador", {
      p_torneo: torneoId,
      p_nombre: nombre,
      p_correo: correo,
    });
    setEnviando(false);
    if (error) {
      setError(error.message);
      return;
    }
    setNombre("");
    setCorreo("");
    alTerminar();
  }

  return (
    <form onSubmit={enviar} className="mb-4 flex flex-col gap-2 rounded border p-4">
      <h3 className="font-medium">Añadir jugador</h3>
      <input
        required
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        placeholder="Nombre"
        className="rounded border p-2"
      />
      <input
        required
        type="email"
        value={correo}
        onChange={(e) => setCorreo(e.target.value)}
        placeholder="correo@ejemplo.com"
        className="rounded border p-2"
      />
      <button disabled={enviando} className="rounded bg-foreground p-2 text-background disabled:opacity-50">
        {enviando ? "Añadiendo…" : "Añadir"}
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <p className="text-xs opacity-60">
        Para entrar, la persona debe usar este mismo correo en la pantalla de entrar. El correo de
        invitación automático llegará más adelante.
      </p>
    </form>
  );
}

function GenerarCalendario({ torneoId, alTerminar }: { torneoId: string; alTerminar: () => void }) {
  const [primerPlazo, setPrimerPlazo] = useState("");
  const [dias, setDias] = useState("7");
  const [error, setError] = useState("");
  const [generando, setGenerando] = useState(false);

  async function generar(e: React.FormEvent) {
    e.preventDefault();
    if (!confirm("Al generar el calendario ya no podrás añadir más jugadores. ¿Continuar?")) return;
    setGenerando(true);
    setError("");
    const { error } = await supabase.rpc("generar_calendario", {
      p_torneo: torneoId,
      p_primer_plazo: primerPlazo || null,
      p_dias_por_ronda: Number(dias),
    });
    setGenerando(false);
    if (error) {
      setError(error.message);
      return;
    }
    alTerminar();
  }

  return (
    <form onSubmit={generar} className="flex flex-col gap-2 rounded border p-4">
      <h3 className="font-medium">Generar calendario</h3>
      <label className="flex flex-col gap-1 text-sm">
        Fecha límite de la primera ronda (opcional)
        <input
          type="date"
          value={primerPlazo}
          onChange={(e) => setPrimerPlazo(e.target.value)}
          className="rounded border p-2"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Días entre rondas
        <input
          type="number"
          min={1}
          required
          value={dias}
          onChange={(e) => setDias(e.target.value)}
          className="rounded border p-2"
        />
      </label>
      <button disabled={generando} className="rounded bg-foreground p-2 text-background disabled:opacity-50">
        {generando ? "Generando…" : "Generar partidos"}
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </form>
  );
}

function formatearFecha(fecha: string) {
  return new Date(`${fecha}T00:00:00`).toLocaleDateString("es-ES", { day: "numeric", month: "short" });
}

function PartidoCard({
  partido,
  nombres,
  torneo,
  puedeEditar,
  alGuardar,
}: {
  partido: Partido;
  nombres: Map<string, string>;
  torneo: Torneo;
  puedeEditar: boolean;
  alGuardar: () => void;
}) {
  const nombreA = nombres.get(partido.jugador_a_id) ?? "—";
  const nombreB = nombres.get(partido.jugador_b_id) ?? "—";
  const setsOrdenados = [...partido.sets_partido].sort((x, y) => x.numero_set - y.numero_set);

  const [abierto, setAbierto] = useState(false);
  const [filas, setFilas] = useState<{ a: string; b: string }[]>(() =>
    Array.from({ length: torneo.sets_por_partido }, (_, i) => ({
      a: setsOrdenados[i] ? String(setsOrdenados[i].juegos_a) : "",
      b: setsOrdenados[i] ? String(setsOrdenados[i].juegos_b) : "",
    }))
  );
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);

  // ¿En qué set se decide el partido? (null = todavía no está decidido)
  // Ejemplo al mejor de 3: quien gana 2 sets gana el partido y el set 3 ya no se juega.
  const necesarios = Math.floor(torneo.sets_por_partido / 2) + 1;
  let decididoEn: number | null = null;
  {
    let setsA = 0;
    let setsB = 0;
    for (let i = 0; i < filas.length; i++) {
      if (filas[i].a === "" || filas[i].b === "") continue;
      const ga = Number(filas[i].a);
      const gb = Number(filas[i].b);
      if (ga > gb) setsA++;
      else if (gb > ga) setsB++;
      if (setsA >= necesarios || setsB >= necesarios) {
        decididoEn = i;
        break;
      }
    }
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setGuardando(true);
    setError("");
    // Solo se envían los sets hasta que el partido se decide; lo que haya después se ignora.
    const sets = filas
      .filter((f, i) => (decididoEn === null || i <= decididoEn) && f.a !== "" && f.b !== "")
      .map((f) => ({ a: Number(f.a), b: Number(f.b) }));
    const { error } = await supabase.rpc("guardar_resultado", {
      p_partido: partido.id,
      p_sets: sets,
    });
    setGuardando(false);
    if (error) {
      setError(error.message);
      return;
    }
    setAbierto(false);
    alGuardar();
  }

  const hoy = new Date().toISOString().slice(0, 10);
  const vencido = partido.estado === "pendiente" && partido.fecha_limite !== null && partido.fecha_limite < hoy;

  return (
    <li className="rounded border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-medium">
          <span className={partido.ganador_id === partido.jugador_a_id ? "underline" : ""}>{nombreA}</span>
          {" vs "}
          <span className={partido.ganador_id === partido.jugador_b_id ? "underline" : ""}>{nombreB}</span>
        </p>
        <p className="text-sm">
          {partido.estado === "jugado" ? (
            <span>{setsOrdenados.map((s) => `${s.juegos_a}-${s.juegos_b}`).join("  ")}</span>
          ) : partido.fecha_limite ? (
            <span className={vencido ? "text-red-600" : "opacity-70"}>
              {vencido ? "Plazo vencido: " : "Hasta el "}
              {formatearFecha(partido.fecha_limite)}
            </span>
          ) : (
            <span className="opacity-70">Pendiente</span>
          )}
        </p>
      </div>

      {puedeEditar && !abierto && (
        <button onClick={() => setAbierto(true)} className="mt-2 text-sm underline">
          {partido.estado === "jugado" ? "Corregir resultado" : "Apuntar resultado"}
        </button>
      )}

      {abierto && (
        <form onSubmit={guardar} className="mt-3 flex flex-col gap-2">
          <p className="text-xs opacity-70">
            Escribe solo los sets que se han jugado. Cuando alguien gana el partido, los sets que sobran se
            bloquean.
          </p>
          {filas.map((f, i) => {
            const bloqueado = decididoEn !== null && i > decididoEn;
            return (
            <div key={i} className={`flex items-center gap-2 text-sm ${bloqueado ? "opacity-40" : ""}`}>
              <span className="w-12">Set {i + 1}</span>
              <input
                type="number"
                min={0}
                aria-label={`Juegos de ${nombreA} en el set ${i + 1}`}
                value={f.a}
                disabled={bloqueado}
                onChange={(e) => setFilas(filas.map((x, j) => (j === i ? { ...x, a: e.target.value } : x)))}
                className="w-16 rounded border p-1"
              />
              <span>{nombreA}</span>
              <span>–</span>
              <input
                type="number"
                min={0}
                aria-label={`Juegos de ${nombreB} en el set ${i + 1}`}
                value={f.b}
                disabled={bloqueado}
                onChange={(e) => setFilas(filas.map((x, j) => (j === i ? { ...x, b: e.target.value } : x)))}
                className="w-16 rounded border p-1"
              />
              <span>{nombreB}</span>
              {bloqueado && <span className="text-xs">No hace falta</span>}
            </div>
            );
          })}
          <div className="flex gap-2">
            <button disabled={guardando} className="rounded bg-foreground px-3 py-1 text-background disabled:opacity-50">
              {guardando ? "Guardando…" : "Guardar"}
            </button>
            <button type="button" onClick={() => setAbierto(false)} className="rounded border px-3 py-1">
              Cancelar
            </button>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </form>
      )}
    </li>
  );
}
