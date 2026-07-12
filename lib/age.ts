// Declared-age helpers. We store only birth year (privacy-minimal) and treat
// it conservatively at year boundaries.
export const MIN_SIGNUP_AGE = 13; // COPPA floor
export const MATURE_MIN_AGE = 18;

export function ageFromBirthYear(birthYear: number, now = new Date()): number {
  return now.getUTCFullYear() - birthYear;
}

// Conservative: a null birth year (legacy accounts) is treated as under 18,
// so mature content stays hidden until they confirm their age.
export function isAdult(birthYear: number | null | undefined, now = new Date()): boolean {
  if (birthYear == null) return false;
  return ageFromBirthYear(birthYear, now) >= MATURE_MIN_AGE;
}

// Signed-out visitors are treated as under 18 too — no mature content
// without a confirmed adult account.
export function canSeeMature(birthYear: number | null | undefined): boolean {
  return isAdult(birthYear);
}

export function validBirthYear(year: unknown, now = new Date()): year is number {
  if (typeof year !== "number" || !Number.isInteger(year)) return false;
  const current = now.getUTCFullYear();
  return year >= current - 120 && year <= current;
}
