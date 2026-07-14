// Regression tests for clientIp() — the per-IP limiter key must come from a
// trusted hop, not from the attacker-writable left end of X-Forwarded-For.
// Node 22 strips the types from the real module, so this pins lib/ratelimit.ts
// itself rather than a re-implementation.
import { test } from "node:test";
import assert from "node:assert/strict";
import { clientIp } from "../../lib/ratelimit.ts";

function reqWith(headers) {
  return new Request("http://localhost/api/test", { headers });
}

function withEnv(vars, fn) {
  const saved = {};
  for (const [k, v] of Object.entries(vars)) {
    saved[k] = process.env[k];
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  try {
    return fn();
  } finally {
    for (const [k, v] of Object.entries(saved)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  }
}

const noTrust = { TRUSTED_CLIENT_IP_HEADER: undefined, TRUSTED_PROXY_HOPS: undefined };

test("dev fallback (no trust config): left-most XFF, 'local' without one", () => {
  withEnv(noTrust, () => {
    assert.equal(clientIp(reqWith({ "x-forwarded-for": "9.9.9.9, 10.0.0.1" })), "9.9.9.9");
    assert.equal(clientIp(reqWith({})), "local");
  });
});

test("TRUSTED_PROXY_HOPS counts from the right (default hop = right-most)", () => {
  withEnv({ ...noTrust, TRUSTED_PROXY_HOPS: "1" }, () => {
    assert.equal(clientIp(reqWith({ "x-forwarded-for": "6.6.6.6, 5.5.5.5" })), "5.5.5.5");
  });
  withEnv({ ...noTrust, TRUSTED_PROXY_HOPS: "2" }, () => {
    assert.equal(
      clientIp(reqWith({ "x-forwarded-for": "6.6.6.6, 5.5.5.5, 10.0.0.1" })),
      "5.5.5.5"
    );
  });
});

test("spoofed left-most XFF entries cannot mint fresh IPs when hops are trusted", () => {
  withEnv({ ...noTrust, TRUSTED_PROXY_HOPS: "1" }, () => {
    // Same real connection (right-most, proxy-appended) with two different
    // client-forged prefixes must share one rate-limit key.
    const a = clientIp(reqWith({ "x-forwarded-for": "1.1.1.1, 5.5.5.5" }));
    const b = clientIp(reqWith({ "x-forwarded-for": "2.2.2.2, 5.5.5.5" }));
    assert.equal(a, "5.5.5.5");
    assert.equal(a, b);
  });
});

test("TRUSTED_PROXY_HOPS clamps and tolerates junk values", () => {
  // More trusted hops than entries: clamp to the left edge, never crash.
  withEnv({ ...noTrust, TRUSTED_PROXY_HOPS: "5" }, () => {
    assert.equal(clientIp(reqWith({ "x-forwarded-for": "6.6.6.6, 5.5.5.5" })), "6.6.6.6");
  });
  // Non-integer setting degrades to the safe default of 1 (right-most).
  withEnv({ ...noTrust, TRUSTED_PROXY_HOPS: "banana" }, () => {
    assert.equal(clientIp(reqWith({ "x-forwarded-for": "6.6.6.6, 5.5.5.5" })), "5.5.5.5");
  });
});

test("TRUSTED_CLIENT_IP_HEADER wins and X-Forwarded-For is ignored", () => {
  withEnv({ ...noTrust, TRUSTED_CLIENT_IP_HEADER: "cf-connecting-ip" }, () => {
    const ip = clientIp(
      reqWith({ "cf-connecting-ip": "5.5.5.5", "x-forwarded-for": "9.9.9.9" })
    );
    assert.equal(ip, "5.5.5.5");
    // Header configured but absent on the request: no XFF fallback (that
    // would reopen the spoof), just the local sentinel.
    assert.equal(clientIp(reqWith({ "x-forwarded-for": "9.9.9.9" })), "local");
  });
});
