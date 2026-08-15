import { z } from 'zod';

/**
 * Identity schemas (TECHNICAL_DESIGN.md §9.1). One schema per payload, used identically as
 * the RHF resolver on the client and (where a payload ever reaches a server boundary) to
 * re-parse server-side — client validation is UX, these are the source of truth.
 */

const email = z.email('Enter a valid email address').max(254);

const password = z
  .string()
  .min(8, 'Password must be at least 8 characters and include a letter and a number')
  .max(72)
  .regex(/[A-Za-z]/, 'Password must be at least 8 characters and include a letter and a number')
  .regex(/[0-9]/, 'Password must be at least 8 characters and include a letter and a number');

const phone = z
  .string()
  .trim()
  .regex(/^\+?[0-9\-\s]{9,15}$/, 'Enter a valid phone number');

export const loginInput = z.object({
  email,
  password: z.string().min(1, 'Enter your password'),
});
export type LoginInput = z.infer<typeof loginInput>;

export const signupInput = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(2, 'Enter your full name')
      .max(80, 'Enter your full name'),
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
