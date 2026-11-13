import { NextResponse } from "next/server";
import { createDemoUser, encodeSessionUser, normalizeRole } from "@/lib/auth";
import { checkRateLimit, createRateLimitHeaders, getClientIp } from "@/lib/rate-limit";

const SESSION_COOKIE = "inkloom_session";

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const rateLimit = checkRateLimit(ip, { windowMs: 60_000, maxRequests: 10, keyPrefix: "auth-login" });
  if (!rateLimit.allowed) {
    return NextResponse.json({ ok: false, message: "Too many login attempts" }, { status: 429, headers: createRateLimitHeaders(rateLimit) });
  }

  try {
    const body = await request.json();
    const email = typeof body?.email === "string" ? body.email.trim() : "demo@inkloom.ai";
    const name = typeof body?.name === "string" && body.name.trim() ? body.name.trim() : "Demo Reviewer";
    const role = normalizeRole(typeof body?.role === "string" ? body.role : "reviewer");

    const user = createDemoUser({ email, name, role });
    const sessionValue = encodeSessionUser(user);

    const response = NextResponse.json({
      ok: true,
      user,
      message: "Signed in successfully",
    });

    response.headers.set(
      "Set-Cookie",
      `${SESSION_COOKIE}=${sessionValue}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400;`
    );

    return response;
  } catch (error) {
    console.error("Auth login failed", error);
    return NextResponse.json({ ok: false, message: "Login failed" }, { status: 500 });
  }
}
