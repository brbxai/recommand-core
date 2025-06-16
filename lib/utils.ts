import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { randomBytes } from "crypto";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Generate cryptographically secure random token
export function generateSecureToken(): string {
  return randomBytes(32).toString("hex"); // 64 character hex string
}
