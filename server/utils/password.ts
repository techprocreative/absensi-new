import bcrypt from "bcryptjs";

const SALT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || "10", 10);

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function comparePassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

export function validatePassword(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push("Password harus minimal 8 karakter");
  }

  if (!/[A-Z]/.test(password)) {
    errors.push("Password harus mengandung minimal 1 huruf besar");
  }

  if (!/[a-z]/.test(password)) {
    errors.push("Password harus mengandung minimal 1 huruf kecil");
  }

  if (!/[0-9]/.test(password)) {
    errors.push("Password harus mengandung minimal 1 angka");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
