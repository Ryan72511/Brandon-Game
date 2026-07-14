// One-time token helpers: random generation, deterministic SHA-256 at rest
// (so a presented token can be looked up by hash), constant-time compare,
// and expiry. Imports the real lib via Node's type stripping.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  generateToken,
  hashToken,
  tokensEqual,
  expiry,
  expired,
  VERIFY_TOKEN_TTL_MS,
  RESET_TOKEN_TTL_MS,
} from "../../lib/tokens.ts";

test("generateToken: 64 hex chars (256 bits), unique per call", () => {
  const a = generateToken();
  const b = generateToken();
  assert.match(a, /^[0-9a-f]{64}$/);
  assert.notEqual(a, b);
});

test("hashToken is deterministic and never stores the raw token", () => {
  const token = generateToken();
  assert.equal(hashToken(token), hashToken(token));
  assert.match(hashToken(token), /^[0-9a-f]{64}$/);
  assert.notEqual(hashToken(token), token);
  assert.notEqual(hashToken(token), hashToken(generateToken()));
});

test("tokensEqual: equal hashes match, everything else is false (no throw)", () => {
  const h = hashToken(generateToken());
  assert.equal(tokensEqual(h, h), true);
  assert.equal(tokensEqual(h, hashToken(generateToken())), false);
  assert.equal(tokensEqual(h, h.slice(0, 32)), false); // length mismatch
  assert.equal(tokensEqual("", ""), false); // empty never matches
});

test("expiry/expired: future dates live, past and missing dates are dead", () => {
  assert.equal(expired(expiry(VERIFY_TOKEN_TTL_MS)), false);
  assert.equal(expired(expiry(RESET_TOKEN_TTL_MS)), false);
  assert.equal(expired(new Date(Date.now() - 1000)), true);
  assert.equal(expired(null), true);
  assert.equal(expired(undefined), true);
});
