"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { createSessionToken, SESSION_COOKIE_NAME, SESSION_MAX_AGE } from "@/lib/auth/session";

export type LoginState = { error: string | null };

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const username = String(formData.get("username") ?? "");
  const password = String(formData.get("password") ?? "");

  const expectedUser = process.env.APP_LOGIN_USER;
  const expectedHash = process.env.APP_LOGIN_PASSWORD_HASH;

  if (!expectedUser || !expectedHash) {
    return { error: "Servidor sense configurar (falten APP_LOGIN_USER/APP_LOGIN_PASSWORD_HASH)." };
  }

  const userOk = username === expectedUser;
  const passOk = await bcrypt.compare(password, expectedHash);

  if (!userOk || !passOk) {
    return { error: "Usuari o contrasenya incorrectes." };
  }

  const token = await createSessionToken(username);
  const store = await cookies();
  store.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });

  redirect("/albaran/nuevo");
}

export async function logoutAction() {
  const store = await cookies();
  store.delete(SESSION_COOKIE_NAME);
  redirect("/login");
}
