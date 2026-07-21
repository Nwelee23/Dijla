/**
 * Auth constants shared between server actions and client components.
 *
 * Kept out of `actions.ts`: a `"use server"` file may only export async
 * functions, so exporting a plain value from there fails the build.
 */

/** Digits in the emailed sign-in code. Must match Supabase `mailer_otp_length`. */
export const EMAIL_OTP_LENGTH = 6;
