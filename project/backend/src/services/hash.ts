import crypto from "crypto";

/**
 * Compute the SHA-256 hash of a string and return it as a 0x-prefixed hex bytes32.
 * Used for hashing announcement content before publishing on-chain.
 */
export function hashContent(content: string): `0x${string}` {
  const hex = crypto.createHash("sha256").update(content, "utf8").digest("hex");
  return `0x${hex}`;
}

/**
 * Compute the SHA-256 hash of a Buffer (file content).
 * Used for hashing uploaded documents before registering on-chain.
 */
export function hashBuffer(buffer: Buffer): `0x${string}` {
  const hex = crypto.createHash("sha256").update(buffer).digest("hex");
  return `0x${hex}`;
}