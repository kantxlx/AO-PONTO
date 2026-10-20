import { randomBytes, scrypt as callback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { ensure } from "../models/validation.js";
const scrypt = promisify(callback);
export async function hashPassword(password) {
  ensure(
    typeof password === "string" &&
      password.length >= 10 &&
      password.length <= 128,
    "A senha deve ter entre 10 e 128 caracteres.",
  );
  const salt = randomBytes(16).toString("hex");
  const key = await scrypt(password, salt, 64);
  return `scrypt:${salt}:${key.toString("hex")}`;
}
export async function verifyPassword(password, hash) {
  if (typeof password !== "string" || password.length > 128) return false;
  const [type, salt, value] = (hash || "").split(":");
  if (type !== "scrypt" || !salt || !value) return false;
  const key = await scrypt(password, salt, 64);
  const expected = Buffer.from(value, "hex");
  return key.length === expected.length && timingSafeEqual(key, expected);
}
