import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { getEnv, shopChoices } from "./env";

const COOKIE = "vb_supplier_session";
const TTL_HOURS = 12;

function secretKey() {
  return new TextEncoder().encode(getEnv().sessionSecret);
}

export type SupplierSession = {
  user: string;
  shop: string;
  exp: number;
};

function allowedShop(shop?: string): string {
  const shops = shopChoices();
  const normalized = (shop || "").trim().toLowerCase();
  if (shops.includes(normalized)) return normalized;
  return shops[0] || "e-commerce-dev-v6yidmlw.myshopify.com";
}

export async function createSession(user: string, shop?: string): Promise<void> {
  const token = await new SignJWT({ user, shop: allowedShop(shop) })
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
      shop: allowedShop(typeof payload.shop === "string" ? payload.shop : ""),
      exp: Number(payload.exp || 0),
    };
  } catch {
    return null;
  }
}

export async function setSessionShop(shop: string): Promise<SupplierSession> {
  const current = await getSession();
  if (!current) throw new Error("unauthorized");
  const next = allowedShop(shop);
  await createSession(current.user, next);
  return { ...current, shop: next };
}

export async function requireSession(): Promise<SupplierSession> {
  const session = await getSession();
  if (!session) throw new Error("unauthorized");
  return session;
}
