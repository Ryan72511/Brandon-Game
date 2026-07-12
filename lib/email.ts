// Email handling for signup. We collect and store a contact address but do
// not send mail yet (no provider is configured), so validation here is about
// catching obvious typos and normalizing for uniqueness — not proving the
// address is deliverable. Real verification switches on when a provider is
// added; see emailVerifiedAt on the User model.

export const EMAIL_MAX_LEN = 120;

// Pragmatic single-@ check: local part, one @, a dotted domain with a 2+ char
// TLD. Deliberately not RFC-5322-exhaustive — that rejects real addresses and
// accepts junk; we just want a sane, typo-catching gate.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// Trim and lowercase so "A@X.com" and "a@x.com" are the same account. Returns
// "" for anything that isn't a plausible address.
export function normalizeEmail(raw: unknown): string {
  if (typeof raw !== "string") return "";
  const email = raw.trim().toLowerCase();
  if (email.length < 3 || email.length > EMAIL_MAX_LEN) return "";
  return EMAIL_RE.test(email) ? email : "";
}

export function isValidEmail(raw: unknown): boolean {
  return normalizeEmail(raw) !== "";
}
