export const isValidEgn = (egn: string): boolean => /^\d{10}$/.test(egn.trim());

export const isValidPhone = (phone: string): boolean => /^\d{10}$/.test(phone.replace(/[\s-]/g, ''));

export const isValidEmail = (email: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

const EGN_WEIGHTS = [2, 4, 8, 5, 10, 9, 7, 3, 6];

// Full Bulgarian EGN check: real calendar date (month offset 20/40 encodes the
// century) and the modulo-11 control digit. Used for a soft warning only,
// because demo/test data legitimately contains made-up numbers.
export function hasValidEgnChecksum(egn: string): boolean {
  const value = egn.trim();
  if (!/^\d{10}$/.test(value)) return false;

  const digits = [...value].map(Number);
  const yy = Number(value.slice(0, 2));
  let month = Number(value.slice(2, 4));
  const day = Number(value.slice(4, 6));

  let century = 1900;
  if (month > 40) {
    month -= 40;
    century = 2000;
  } else if (month > 20) {
    month -= 20;
    century = 1800;
  }

  const date = new Date(Date.UTC(century + yy, month - 1, day));
  const dateOk =
    date.getUTCFullYear() === century + yy && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
  if (!dateOk) return false;

  const sum = EGN_WEIGHTS.reduce((acc, weight, i) => acc + weight * digits[i], 0);
  const control = sum % 11 === 10 ? 0 : sum % 11;
  return control === digits[9];
}

export const normalizeEmail = (email: string): string => email.trim().toLowerCase();

export const clampNote = (note: string, max: number): string => note.trim().slice(0, max);
