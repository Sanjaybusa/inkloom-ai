/**
 * Build-time environment validation
 * Runs during next build to catch missing/invalid env vars early
 */

import { validateSigningKey } from "./signing";

export function validateBuildEnv(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Validate PASSPORT_SIGNING_KEY
  const signingValidation = validateSigningKey();
  if (!signingValidation.valid) {
    errors.push(`PASSPORT_SIGNING_KEY: ${signingValidation.error}`);
  }

  // Validate Supabase config (warn but don't fail - demo mode is valid)
  const hasSupabaseUrl = !!process.env.SUPABASE_URL || !!process.env.NEXT_PUBLIC_SUPABASE_URL;
  const hasSupabaseKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
  const isDemoMode = process.env.DEMO_MODE === "true";

  if (!hasSupabaseUrl || !hasSupabaseKey) {
    if (!isDemoMode) {
      errors.push("Supabase not configured and DEMO_MODE not set. Either configure Supabase or set DEMO_MODE=true");
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// Run validation if this module is executed directly (e.g., during build)
if (import.meta.url === `file://${process.argv[1]}`) {
  const result = validateBuildEnv();
  if (!result.valid) {
    console.error("❌ Build environment validation failed:");
    result.errors.forEach(e => console.error(`  - ${e}`));
    process.exit(1);
  }
  console.log("✅ Build environment validation passed");
}
