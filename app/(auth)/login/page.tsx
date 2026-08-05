"use client";

import { useActionState } from "react";
import { loginAction, type LoginState } from "./actions";

const initialState: LoginState = { error: null };

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(loginAction, initialState);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--paper)] px-4">
      <form
        action={formAction}
        className="w-full max-w-sm bg-white rounded-2xl shadow-lg p-8 space-y-5 border border-[var(--line)]"
      >
        <div>
          <h1 className="text-lg font-bold text-[var(--navy)]">NoaDentLab</h1>
          <p className="text-sm text-[var(--muted)]">Accés intern</p>
        </div>

        <div className="space-y-1">
          <label htmlFor="username" className="text-sm font-medium text-[var(--ink)]">
            Usuari
          </label>
          <input
            id="username"
            name="username"
            type="text"
            required
            autoFocus
            className="w-full rounded-lg border border-[var(--line)] px-3 py-2 text-sm outline-none transition-shadow duration-150 ease-out focus:ring-2 focus:ring-[var(--focus)]"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="password" className="text-sm font-medium text-[var(--ink)]">
            Contrasenya
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            className="w-full rounded-lg border border-[var(--line)] px-3 py-2 text-sm outline-none transition-shadow duration-150 ease-out focus:ring-2 focus:ring-[var(--focus)]"
          />
        </div>

        {state.error && (
          <p role="alert" className="text-sm text-red-600">
            {state.error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-lg bg-[var(--navy)] text-white text-sm font-semibold py-2.5 transition-colors duration-150 ease-out hover:bg-[var(--navy-deep)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)] focus-visible:ring-offset-2 disabled:opacity-50"
        >
          {pending ? "Entrant…" : "Entrar"}
        </button>
      </form>
    </div>
  );
}
