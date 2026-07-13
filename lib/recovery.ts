import { randomInt, scryptSync, timingSafeEqual, randomBytes } from "node:crypto";

// A friendly recovery code: four short words + a three-digit number, e.g.
// "sunny-otter-glow-maple-472". Easy to write down and read back, but drawn
// from a ~180-word list so the space is ~180^4 * 900 ≈ 9.4e11 (~40 bits).
// With login/reset throttled to a few failed tries a minute per account,
// online grinding is infeasible (millennia), and the code is scrypt-hashed
// at rest so a DB leak still can't reveal it cheaply.
const WORDS = [
  "sunny", "otter", "glow", "maple", "river", "cloud", "tiger", "pine", "wave",
  "ember", "misty", "cocoa", "lunar", "fox", "reef", "clover", "aspen", "dune",
  "willow", "flint", "harbor", "meadow", "quartz", "raven", "sage", "thistle",
  "violet", "wren", "zephyr", "birch", "coral", "delta", "frost", "ivy", "juno",
  "amber", "brook", "cedar", "daisy", "eagle", "fern", "grove", "hazel", "iris",
  "jade", "kite", "lily", "moss", "nova", "oak", "peach", "quill", "robin",
  "storm", "teal", "umber", "vale", "wolf", "yarn", "zinc", "acorn", "bloom",
  "cove", "drift", "echo", "fable", "glade", "heron", "inlet", "juniper", "koala",
  "lotus", "marsh", "nectar", "opal", "petal", "reed", "spruce", "tulip", "vine",
  "wisp", "arbor", "basil", "comet", "dawn", "elm", "fjord", "gale", "hollow",
  "isle", "jolt", "kelp", "larch", "mint", "north", "orbit", "prism", "quest",
  "ridge", "sable", "tide", "ulan", "verve", "wheat", "yew", "azure", "brisk",
  "crest", "dell", "emberly", "flare", "gust", "hush", "ionic", "jetty", "knoll",
  "lark", "mica", "nook", "onyx", "plume", "quartzy", "rill", "spire", "trove",
  "unity", "vista", "wharf", "yonder", "amberly", "beacon", "cinder", "dapple",
  "estuary", "falcon", "granite", "harvest", "island", "jasper", "kindle", "lagoon",
  "mallow", "nimbus", "olive", "pebble", "quiver", "russet", "summit", "timber",
  "upland", "velvet", "willowy", "yellow", "aurora", "bramble", "canyon", "dewdrop",
  "everest", "fennel", "glacier", "hazelnut", "indigo", "jubilee", "kestrel", "lantern",
  "marigold", "nutmeg", "orchid", "poppy", "quince", "ripple", "saffron", "thicket",
];

export function generateRecoveryCode(): string {
  const w = () => WORDS[randomInt(WORDS.length)];
  return `${w()}-${w()}-${w()}-${w()}-${randomInt(100, 1000)}`;
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

// Run a throwaway scrypt for reset attempts on a missing account, so an
// unknown username costs the same as a wrong code — no enumeration oracle.
const DUMMY_RECOVERY_HASH = hashRecoveryCode("gasp-nonexistent-recovery-sentinel");
export function dummyVerifyRecovery(code: string): void {
  verifyRecoveryCode(code, DUMMY_RECOVERY_HASH);
}
