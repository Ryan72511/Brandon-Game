import { randomInt, scryptSync, timingSafeEqual, randomBytes } from "node:crypto";

// A friendly recovery code: three short words + two digits, e.g.
// "sunny-otter-glow-47". Easy to write down, hard to guess (~10^15 space).
const WORDS = [
  "sunny", "otter", "glow", "maple", "river", "cloud", "tiger", "pine", "wave",
  "ember", "misty", "cocoa", "lunar", "fox", "reef", "clover", "aspen", "dune",
  "willow", "flint", "harbor", "meadow", "quartz", "raven", "sage", "thistle",
  "violet", "wren", "zephyr", "birch", "coral", "delta", "frost", "ivy", "juno",
];

export function generateRecoveryCode(): string {
  const w = () => WORDS[randomInt(WORDS.length)];
  return `${w()}-${w()}-${w()}-${randomInt(10, 100)}`;
}

export function hashRecoveryCode(code: string): string {
  const normalized = code.trim().toLowerCase();
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(normalized, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyRecoveryCode(code: string, stored: string): boolean {
  if (!stored) return false;
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const candidate = scryptSync(code.trim().toLowerCase(), salt, 64);
  const expected = Buffer.from(hash, "hex");
  return candidate.length === expected.length && timingSafeEqual(candidate, expected);
}
