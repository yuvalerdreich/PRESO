import { z } from 'zod';

import { fullName, phone } from '@/lib/validation/common';

/**
 * Identity schemas (TECHNICAL_DESIGN.md §9.1). One schema per payload, used identically as
 * the RHF resolver on the client and (where a payload ever reaches a server boundary) to
 * re-parse server-side — client validation is UX, these are the source of truth.
 *
 * `fullName` and `phone` moved to `common.ts` once business details needed the same two rules;
 * `email` and `password` stay local because nothing outside authentication takes them.
 */

const email = z.email('Enter a valid email address').max(254);

const password = z
  .string()
  .min(8, 'Password must be at least 8 characters and include a letter and a number')
  .max(72)
  .regex(/[A-Za-z]/, 'Password must be at least 8 characters and include a letter and a number')
  .regex(/[0-9]/, 'Password must be at least 8 characters and include a letter and a number');

export const loginInput = z.object({
  email,
  password: z.string().min(1, 'Enter your password'),
});
export type LoginInput = z.infer<typeof loginInput>;

export const signupInput = z
  .object({
    fullName,
    email,
    phone: z.union([phone, z.literal('')]).optional(),
    password,
    confirmPassword: z.string(),
    accountType: z.enum(['CLIENT', 'BUSINESS'], { message: 'Choose an account type' }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });
export type SignupInput = z.infer<typeof signupInput>;

export const completeProfileInput = z.object({
  fullName,
  accountType: z.enum(['CLIENT', 'BUSINESS'], { message: 'Choose an account type' }),
});
export type CompleteProfileInput = z.infer<typeof completeProfileInput>;

export const profileSettingsInput = z.object({
  location: z.union([z.string().trim().min(2).max(100), z.literal('')]),
  dateOfBirth: z.union([
    z.iso.date().refine((value) => value <= new Date().toISOString().slice(0, 10), {
      message: 'Date of birth must be in the past',
    }),
    z.literal(''),
  ]),
});
export type ProfileSettingsInput = z.infer<typeof profileSettingsInput>;

export const forgotPasswordInput = z.object({
  email,
});
export type ForgotPasswordInput = z.infer<typeof forgotPasswordInput>;

export const resetPasswordInput = z
  .object({
    password,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });
export type ResetPasswordInput = z.infer<typeof resetPasswordInput>;

/**
 * `updateProfile` (§5.5, Identity module) — the two columns a user may change about themselves.
 * `account_type` and `status` are deliberately absent: `0010`'s
 * `protect_profile_privileged_columns()` trigger rejects them for any self-service caller, so
 * accepting them here would only produce a confusing 403 (§12.34).
 */
export const profileInput = z.object({
  fullName,
  phone: z.union([phone, z.literal('')]).optional(),
});
export type ProfileInput = z.infer<typeof profileInput>;
