"use client";

import { useActionState } from "react";
import { loginAction, type LoginState } from "./actions";

const initialState: LoginState = { error: null };

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(loginAction, initialState);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--paper,#e8eef6)] px-4">
      <form
        action={formAction}
        className="w-full max-w-sm bg-white rounded-2xl shadow-lg p-8 space-y-5 border border-slate-200"
      >
        <div>
          <h1 className="text-lg font-bold text-[#1E4789]">NoaDentLab</h1>
          <p className="text-sm text-slate-500">Accés intern</p>
        </div>

        <div className="space-y-1">
          <label htmlFor="username" className="text-sm font-medium text-slate-700">
            Usuari
          </label>
          <input
            id="username"
            name="username"
            type="text"
            required
            autoFocus
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4FBEC4]"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="password" className="text-sm font-medium text-slate-700">
            Contrasenya
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4FBEC4]"
          />
        </div>

        {state.error && <p className="text-sm text-red-600">{state.error}</p>}

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-lg bg-[#1E4789] text-white text-sm font-semibold py-2.5 hover:bg-[#14356b] transition disabled:opacity-50"
        >
          {pending ? "Entrant…" : "Entrar"}
        </button>
      </form>
    </div>
  );
}
