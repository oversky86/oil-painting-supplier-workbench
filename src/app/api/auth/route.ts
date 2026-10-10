import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { getEnv, shopsForUser } from "@/lib/env";
import {
  clearLoginFailures,
  getLoginLock,
  LoginProtectionUnavailable,
  recordLoginFailure,
} from "@/lib/login-lock";
import { createSession, destroySession, getSession, setSessionShop } from "@/lib/session";

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
  const shops = session ? shopsForUser(session.user) : [];
  return NextResponse.json({
    ok: true,
    authenticated: Boolean(session),
    user: session?.user || null,
    shop: session?.shop || null,
    shops,
  });
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as {
    username?: string;
    password?: string;
    action?: "login" | "logout" | "switch-shop";
    shop?: string;
  };

  if (body.action === "switch-shop") {
    try {
      const session = await setSessionShop(body.shop || "");
      return NextResponse.json({
        ok: true,
        shop: session.shop,
        shops: shopsForUser(session.user),
      });
    } catch {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }
  }

  if (body.action === "logout") {
    await destroySession();
    return NextResponse.json({ ok: true });
  }

  try {
    return await login(request, body);
  } catch (err) {
    if (err instanceof LoginProtectionUnavailable) {
      console.error("[auth] login protection unavailable", err.message);
      return NextResponse.json(
        {
          ok: false,
          error: "登录保护不可用（Supabase 未配置或无法连接），暂时不能登录，请联系管理员。",
        },
        { status: 503 },
      );
    }
    throw err;
  }
}

function lockMessage(lockedUntil: string) {
  const time = new Date(lockedUntil).toLocaleTimeString("zh-CN", { hour12: false });
  return `连续输错次数过多，请在 ${time} 之后再试`;
}

async function login(
  request: NextRequest,
  body: { username?: string; password?: string },
) {
  const ip = clientIp(request);
  const lock = await getLoginLock(ip);
  if (lock.locked && lock.lockedUntil) {
    return NextResponse.json(
      { ok: false, error: lockMessage(lock.lockedUntil) },
      { status: 429 },
    );
  }

  const env = getEnv();
  const username = (body.username || "").trim();
  const password = body.password || "";
  const accounts = [
    { user: env.adminUser, password: env.adminPassword },
    ...(env.devAdminUser !== env.adminUser && env.devAdminPassword
      ? [{ user: env.devAdminUser, password: env.devAdminPassword }]
      : []),
  ];
  const matched = accounts.find(
    (account) => safeEqual(username, account.user) && safeEqual(password, account.password),
  );

  if (!matched) {
    const result = await recordLoginFailure(ip);
    return NextResponse.json(
      {
        ok: false,
        error: result.lockedUntil ? lockMessage(result.lockedUntil) : "用户名或密码错误",
        failCount: result.failCount,
      },
      { status: result.lockedUntil ? 429 : 401 },
    );
  }

  await clearLoginFailures(ip);
  await createSession(matched.user);
  return NextResponse.json({ ok: true, user: matched.user });
}
