"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "code" | "done">("email");
  const [message, setMessage] = useState("");
  useEffect(() => {
  supabase.auth.getUser().then(({ data }) => {
    if (data.user) {
      setStep("done");
      setMessage(`Has entrado como ${data.user.email}`);
    }
  });
}, []);
  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.auth.signInWithOtp({
  email,
  options: { emailRedirectTo: `${window.location.origin}/login` },
});
    if (error) {
      setMessage(error.message);
    } else {
      setStep("code");
      setMessage("Te hemos enviado un correo.");
    }
  }

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: "email",
    });
    if (error) {
      setMessage(error.message);
    } else {
      setStep("done");
      setMessage("¡Has entrado correctamente!");
    }
  }

  return (
    <main className="mx-auto max-w-sm p-8">
      <h1 className="mb-4 text-2xl font-bold">Entrar</h1>

      {step === "email" && (
        <form onSubmit={sendCode} className="flex flex-col gap-3">
          <input
            type="email"
            required
            placeholder="tu@correo.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded border p-2"
          />
          <button className="rounded bg-black p-2 text-white">
            Enviar código
          </button>
        </form>
      )}

      {step === "code" && (
        <form onSubmit={verifyCode} className="flex flex-col gap-3">
          <input
            required
            placeholder="Código del correo"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="rounded border p-2"
          />
          <button className="rounded bg-black p-2 text-white">Entrar</button>
        </form>
      )}

      {message && <p className="mt-4 text-sm">{message}</p>}

      {step === "done" && (
        <Link href="/" className="mt-4 inline-block rounded bg-black px-4 py-2 text-white">
          Ir a mis torneos
        </Link>
      )}
    </main>
  );
}