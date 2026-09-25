import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { getEnv } from "@/lib/env";
import {
  clearLoginFailures,
  getLoginLock,
  recordLoginFailure,
} from "@/lib/login-lock";
import { createSession, destroySession, getSession } from "@/lib/session";

function clientIp(request: NextRequest) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

function safeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export async function GET() {
  const session = await getSession();
  return NextResponse.json({
    ok: true,
    authenticated: Boolean(session),
    user: session?.user || null,
  });
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as {
    username?: string;
    password?: string;
    action?: "login" | "logout";
  };

  if (body.action === "logout") {
    await destroySession();
    return NextResponse.json({ ok: true });
  }

  const ip = clientIp(request);
  const lock = await getLoginLock(ip);
  if (lock.locked) {
    return NextResponse.json(
      {
        ok: false,
        error: `Too many failed attempts. Try again after ${lock.lockedUntil}`,
      },
      { status: 429 },
    );
  }

  const env = getEnv();
  const username = (body.username || "").trim();
  const password = body.password || "";
  const userOk = safeEqual(username, env.adminUser);
  const passOk = safeEqual(password, env.adminPassword);

  if (!userOk || !passOk) {
    const result = await recordLoginFailure(ip);
    return NextResponse.json(
      {
        ok: false,
        error: result.lockedUntil
          ? `Locked until ${result.lockedUntil}`
          : "Invalid username or password",
        failCount: result.failCount,
      },
      { status: 401 },
    );
  }

  await clearLoginFailures(ip);
  await createSession(env.adminUser);
  return NextResponse.json({ ok: true, user: env.adminUser });
}
