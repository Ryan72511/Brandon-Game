// Email handling: address validation/normalization for signup, plus a tiny
// sender over Resend's HTTP API (no SDK dependency). Without RESEND_API_KEY
// the sender logs to the console and succeeds — dev keeps working with zero
// config, and every email link is copy-pasteable from the server log.

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

// Base URL for links we put in emails. APP_URL is the canonical HTTPS origin
// in production; the localhost fallback keeps dev links clickable.
export function appBaseUrl(): string {
  const url = process.env.APP_URL?.trim();
  return url ? url.replace(/\/+$/, "") : "http://localhost:3000";
}

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
}

// Send via Resend's plain HTTP API. Never throws: email is best-effort
// everywhere we use it (signup, resend, reset request), so failures are
// logged and reported as `false`, never bubbled into a 500.
export async function sendEmail(msg: EmailMessage): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log(
      `[email dev no-op] to=${msg.to} subject=${JSON.stringify(msg.subject)}\n${msg.text}`
    );
    return true;
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM ?? "Gasp <no-reply@gasp.app>",
        to: [msg.to],
        subject: msg.subject,
        text: msg.text,
      }),
    });
    if (!res.ok) {
      console.error(`[email] Resend rejected send (${res.status}): ${await res.text()}`);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[email] Resend request failed:", err);
    return false;
  }
}

// Templates — plain text, same voice as the app. The raw token only ever
// appears here, inside the link.
export function verificationEmail(to: string, token: string): EmailMessage {
  const link = `${appBaseUrl()}/verify?token=${token}`;
  return {
    to,
    subject: "Confirm your email for Gasp",
    text: [
      "Hi!",
      "",
      "Tap the link below to confirm this email address for your Gasp account:",
      "",
      link,
      "",
      "The link works for 24 hours. If you didn't sign up for Gasp, you can ignore this email.",
    ].join("\n"),
  };
}

export function resetEmail(to: string, token: string): EmailMessage {
  const link = `${appBaseUrl()}/reset/confirm?token=${token}`;
  return {
    to,
    subject: "Reset your Gasp password",
    text: [
      "Hi!",
      "",
      "Someone asked to reset the password for the Gasp account using this email. If that was you, tap the link below to pick a new password:",
      "",
      link,
      "",
      "The link works for 1 hour. If you didn't ask for this, you can ignore this email — your password stays as it is.",
    ].join("\n"),
  };
}
