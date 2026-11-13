import test from "node:test";
import assert from "node:assert/strict";

import { createDemoUser, decodeSessionUser, encodeSessionUser, normalizeRole, isAllowedRole } from "./auth";

test("normalizeRole falls back to reviewer for unsupported values", () => {
  assert.equal(normalizeRole("guest"), "reviewer");
  assert.equal(normalizeRole("admin"), "admin");
});

test("createDemoUser preserves provided role and identity", () => {
  const user = createDemoUser({ email: "analyst@inkloom.ai", name: "Analyst", role: "brand_manager" });

  assert.equal(user.email, "analyst@inkloom.ai");
  assert.equal(user.name, "Analyst");
  assert.equal(user.role, "brand_manager");
});

test("session encode/decode round trip preserves identity", () => {
  const user = createDemoUser({ email: "ops@inkloom.ai", name: "Ops Lead", role: "admin" });
  const encoded = encodeSessionUser(user);
  const decoded = decodeSessionUser(encoded);

  assert.deepEqual(decoded, user);
});

test("role checks allow access only to permitted roles", () => {
  assert.equal(isAllowedRole("admin"), true);
  assert.equal(isAllowedRole("reviewer", ["admin"]), false);
  assert.equal(isAllowedRole("brand_manager", ["reviewer", "brand_manager"]), true);
});
