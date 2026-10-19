import { randomInt } from "node:crypto";

// No 0/O/1/I/L so codes are easy to read out and type.
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

// 12 random characters shown as XXXX-XXXX-XXXX (~59 bits of entropy).
export function generateCode() {
  const chars = Array.from({ length: 12 }, () => ALPHABET[randomInt(ALPHABET.length)]);
  return [0, 4, 8].map((i) => chars.slice(i, i + 4).join("")).join("-");
}
