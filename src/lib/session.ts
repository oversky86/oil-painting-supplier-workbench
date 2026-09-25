import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { getEnv } from "./env";

const COOKIE = "vb_supplier_session";
const TTL_HOURS = 12;

function secretKey() {
  return new TextEncoder().encode(getEnv().sessionSecret);
}

export type SupplierSession = {
  user: string;
  exp: number;
};

export async function createSession(user: string): Promise<void> {
  const token = await new SignJWT({ user })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${TTL_HOURS}h`)
    .sign(secretKey());

  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: TTL_HOURS * 60 * 60,
  });
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  jar.set(COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

export async function getSession(): Promise<SupplierSession | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey());
    const user = String(payload.user || "");
    if (!user) return null;
    return {
      user,
      exp: Number(payload.exp || 0),
    };
  } catch {
    return null;
  }
}

export async function requireSession(): Promise<SupplierSession> {
  const session = await getSession();
  if (!session) throw new Error("unauthorized");
  return session;
}
