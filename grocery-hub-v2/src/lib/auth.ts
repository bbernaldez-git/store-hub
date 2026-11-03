import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { createHash } from "crypto";

const COOKIE = "gh_session";
const MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export type Session = { tenantId: string; tenantName: string };

function secret() {
  const s = process.env.AUTH_SECRET;
  if (s && s.length >= 32) return new TextEncoder().encode(s);
  // No AUTH_SECRET set: derive one from the private database URL
  const db = process.env.DATABASE_URL ?? process.env.POSTGRES_URL;
  if (!db) throw new Error("Set AUTH_SECRET or connect the database");
  return createHash("sha256").update("grocery-hub-session:" + db).digest();
}

export async function createSession(session: Session) {
  const jwt = await new SignJWT({ ...session })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secret());

  const jar = await cookies();
  jar.set(COOKIE, jwt, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function destroySession() {
  const jar = await cookies();
  jar.delete(COOKIE);
}

/** The ONLY trusted source of tenantId on the server. Never read it from request bodies. */
export async function getSession(): Promise<Session | null> {
  const jar = await cookies();
  const raw = jar.get(COOKIE)?.value;
  if (!raw) return null;
  try {
    const { payload } = await jwtVerify(raw, secret());
    if (typeof payload.tenantId !== "string") return null;
    return { tenantId: payload.tenantId, tenantName: String(payload.tenantName ?? "") };
  } catch {
    return null;
  }
}
