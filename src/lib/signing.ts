import * as ed25519 from "@noble/ed25519";
import { sha512 } from "@noble/hashes/sha2.js";

/**
 * Ed25519 signing for Trust Passport integrity.
 * Private key: set in Vercel env (PASSPORT_SIGNING_KEY)
 * Public key: embedded in verify page for client-side verification
 */

// Ed25519 requires sha512 for pre-hashing
ed25519.hashes.sha512 = sha512;

export interface KeyPair {
  privateKey: Uint8Array;
  publicKey: Uint8Array;
}

export interface SignedPassport {
  passport: Record<string, unknown>;
  signature: string; // hex-encoded 64-byte signature
  publicKey: string; // hex-encoded 32-byte public key
  algorithm: "ed25519";
  signedAt: string;
}

/**
 * Generate a new Ed25519 keypair (run once, store private key securely)
 */
export function generateKeyPair(): KeyPair {
  const privateKey = ed25519.utils.randomSecretKey();
  const publicKey = ed25519.getPublicKey(privateKey);
  return { privateKey, publicKey };
}

/**
 * Load signing key from environment (hex-encoded 32-byte private key)
 */
export function getSigningKey(): Uint8Array {
  const hexKey = process.env.PASSPORT_SIGNING_KEY;
  if (!hexKey) {
    throw new Error("PASSPORT_SIGNING_KEY not set in environment");
  }
  if (hexKey.length !== 64) {
    throw new Error("PASSPORT_SIGNING_KEY must be 64 hex characters (32 bytes)");
  }
  return new Uint8Array(Buffer.from(hexKey, "hex"));
}

/**
 * Get public key from private key (hex-encoded)
 */
export function getPublicKeyHex(privateKey: Uint8Array): string {
  return Buffer.from(ed25519.getPublicKey(privateKey)).toString("hex");
}

/**
 * Sign a passport object (canonical JSON → Ed25519 signature)
 */
export function signPassport(passport: Record<string, unknown>): SignedPassport {
  const privateKey = getSigningKey();
  const publicKey = ed25519.getPublicKey(privateKey);

  // Canonical JSON: sorted keys, no whitespace
  const canonical = JSON.stringify(passport, Object.keys(passport).sort());
  const message = new TextEncoder().encode(canonical);

  const signature = ed25519.sign(message, privateKey);

  return {
    passport,
    signature: Buffer.from(signature).toString("hex"),
    publicKey: Buffer.from(publicKey).toString("hex"),
    algorithm: "ed25519",
    signedAt: new Date().toISOString(),
  };
}

/**
 * Verify a signed passport (client-side or server-side)
 */
export function verifyPassport(signed: SignedPassport): boolean {
  try {
    const publicKey = new Uint8Array(Buffer.from(signed.publicKey, "hex"));
    const signature = new Uint8Array(Buffer.from(signed.signature, "hex"));

    // Recreate canonical JSON
    const canonical = JSON.stringify(signed.passport, Object.keys(signed.passport).sort());
    const message = new TextEncoder().encode(canonical);

    return ed25519.verify(signature, message, publicKey);
  } catch {
    return false;
  }
}

/**
 * Verify using a known public key (for client-side verification with embedded key)
 */
export function verifyPassportWithPublicKey(
  passport: Record<string, unknown>,
  signatureHex: string,
  publicKeyHex: string
): boolean {
  try {
    const publicKey = new Uint8Array(Buffer.from(publicKeyHex, "hex"));
    const signature = new Uint8Array(Buffer.from(signatureHex, "hex"));

    const canonical = JSON.stringify(passport, Object.keys(passport).sort());
    const message = new TextEncoder().encode(canonical);

    return ed25519.verify(signature, message, publicKey);
  } catch {
    return false;
  }
}