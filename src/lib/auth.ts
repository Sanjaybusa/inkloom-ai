export const APP_ROLES = ["admin", "reviewer", "brand_manager"] as const;

export type AppRole = (typeof APP_ROLES)[number];

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: AppRole;
}

export function normalizeRole(role?: string): AppRole {
  if (role && APP_ROLES.includes(role as AppRole)) {
    return role as AppRole;
  }

  return "reviewer";
}

export function createDemoUser(input?: { email?: string; name?: string; role?: string }): SessionUser {
  const role = normalizeRole(input?.role);

  return {
    id: "demo-user",
    email: input?.email ?? "demo@inkloom.ai",
    name: input?.name ?? "Demo Reviewer",
    role,
  };
}

export function encodeSessionUser(user: SessionUser): string {
  const text = JSON.stringify(user);

  if (typeof Buffer !== "undefined") {
    return Buffer.from(text, "utf-8").toString("base64url");
  }

  return btoa(unescape(encodeURIComponent(text)));
}

export function decodeSessionUser(raw: string | undefined): SessionUser | null {
  if (!raw) return null;

  try {
    let decodedText: string;

    if (typeof Buffer !== "undefined") {
      decodedText = Buffer.from(raw, "base64url").toString("utf-8");
    } else {
      const normalized = raw.replace(/-/g, "+").replace(/_/g, "/");
      const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
      const binary = atob(padded);
      const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
      decodedText = new TextDecoder().decode(bytes);
    }

    const parsed = JSON.parse(decodedText) as Partial<SessionUser>;

    if (!parsed.email || !parsed.name || !parsed.role) {
      return null;
    }

    return createDemoUser({
      email: parsed.email,
      name: parsed.name,
      role: parsed.role,
    });
  } catch {
    return null;
  }
}

export function isAllowedRole(role: string | undefined, allowedRoles: readonly AppRole[] = APP_ROLES): boolean {
  return allowedRoles.includes(normalizeRole(role));
}
