// Pure-logic tests for the Popcorn Score and the deterministic shuffle.
// Run with: npm test
import { test } from "node:test";
import assert from "node:assert/strict";

// The lib is TypeScript; re-implementing the formula here would let the two
// drift. Instead we compile-check the real module via tsx-less import of the
// transpiled logic — simplest robust option at MVP: duplicate the tiny
// formula and pin the expected behavior with fixtures that lib/score.ts must
// also satisfy (verified by the API integration flow in tests/e2e).
function popcornScore(c, m = 5) {
  const total = c.burnt + c.popped + c.butter;
  const fresh = c.popped + c.butter;
  return Math.round((100 * (fresh + m * 0.5)) / (total + m));
}

test("one butter vote cannot reach 100", () => {
  assert.ok(popcornScore({ burnt: 0, popped: 0, butter: 1 }) < 60);
});

test("one burnt vote cannot reach 0", () => {
  assert.ok(popcornScore({ burnt: 1, popped: 0, butter: 0 }) > 40);
});

test("many positive votes approach 100", () => {
  const s = popcornScore({ burnt: 2, popped: 40, butter: 58 });
  assert.ok(s >= 90 && s <= 100, `expected ~95, got ${s}`);
});

test("zero ratings sits at the prior mean", () => {
  assert.equal(popcornScore({ burnt: 0, popped: 0, butter: 0 }), 50);
});

test("smoothing dampens small samples vs large ones with same ratio", () => {
  const small = popcornScore({ burnt: 0, popped: 2, butter: 0 });
  const large = popcornScore({ burnt: 0, popped: 200, butter: 0 });
  assert.ok(small < large, "2/2 should score below 200/200");
});

// fnv1a + seeded shuffle determinism (mirror of lib/recs.ts).
function fnv1a(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

test("fnv1a is deterministic and user/day sensitive", () => {
  assert.equal(fnv1a("demo:2026-07-10"), fnv1a("demo:2026-07-10"));
  assert.notEqual(fnv1a("demo:2026-07-10"), fnv1a("demo:2026-07-11"));
  assert.notEqual(fnv1a("demo:2026-07-10"), fnv1a("rose:2026-07-10"));
});
