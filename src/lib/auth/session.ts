import { cookies } from "next/headers";
import { verifyJwt, type JwtPayload } from "./jwt";

/** Customer / storefront session */
export const AUTH_COOKIE_NAME = "tpw_session";
/** Admin panel session (separate from customer cookie so both can be signed in). */
export const ADMIN_AUTH_COOKIE_NAME = "tpw_admin_session";

export function getAuthSecret() {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error("NEXTAUTH_SECRET is not set");
  return secret;
}

export async function getSession(): Promise<JwtPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyJwt(token, getAuthSecret());
}

export async function getAdminSession(): Promise<JwtPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_AUTH_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyJwt(token, getAuthSecret());
}

export async function setSessionCookie(token: string, maxAgeSeconds: number) {
  const cookieStore = await cookies();
  cookieStore.set({
    name: AUTH_COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: maxAgeSeconds,
  });
}

export async function setAdminSessionCookie(token: string, maxAgeSeconds: number) {
  const cookieStore = await cookies();
  cookieStore.set({
    name: ADMIN_AUTH_COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: maxAgeSeconds,
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.set({
    name: AUTH_COOKIE_NAME,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

export async function clearAdminSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.set({
    name: ADMIN_AUTH_COOKIE_NAME,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

