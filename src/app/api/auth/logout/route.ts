import { NextResponse } from "next/server";
import { checkRateLimit, createRateLimitHeaders, getClientIp } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const rateLimit = checkRateLimit(ip, { windowMs: 60_000, maxRequests: 20, keyPrefix: "auth-logout" });
  if (!rateLimit.allowed) {
    return NextResponse.json({ ok: false, message: "Too many requests" }, { status: 429, headers: createRateLimitHeaders(rateLimit) });
  }

  const response = NextResponse.json({ ok: true, message: "Signed out successfully" });
  response.headers.set(
    "Set-Cookie",
    "inkloom_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0;"
  );

  return response;
}
