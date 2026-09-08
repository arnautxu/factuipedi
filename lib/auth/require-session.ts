import "server-only";
import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME, verifySessionToken } from "./session";
export async function requireSession() {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  if (!token || !await verifySessionToken(token)) throw new Error("Sesión caducada. Vuelve a iniciar sesión.");
}
