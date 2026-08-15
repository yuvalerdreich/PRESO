import { describe, expect, it } from 'vitest';

import {
  forgotPasswordInput,
  loginInput,
  resetPasswordInput,
  signupInput,
} from '@/lib/validation/identity';

const validSignup = {
  fullName: 'Jane Doe',
  email: 'jane@example.com',
  phone: '+972501234567',
  password: 'abc12345',
  confirmPassword: 'abc12345',
  accountType: 'CLIENT' as const,
};

describe('loginInput', () => {
  it('accepts a valid email and non-empty password', () => {
    expect(loginInput.safeParse({ email: 'jane@example.com', password: 'x' }).success).toBe(true);
  });

  it('rejects an invalid email', () => {
    expect(loginInput.safeParse({ email: 'not-an-email', password: 'x' }).success).toBe(false);
  });
});

describe('signupInput', () => {
  it('accepts a fully valid payload', () => {
    expect(signupInput.safeParse(validSignup).success).toBe(true);
  });

  it('rejects a password without a digit', () => {
    const result = signupInput.safeParse({ ...validSignup, password: 'abcdefgh', confirmPassword: 'abcdefgh' });
    expect(result.success).toBe(false);
  });

  it('rejects a password without a letter', () => {
    const result = signupInput.safeParse({ ...validSignup, password: '12345678', confirmPassword: '12345678' });
    expect(result.success).toBe(false);
  });

  it('rejects a password shorter than 8 characters', () => {
    const result = signupInput.safeParse({ ...validSignup, password: 'ab1', confirmPassword: 'ab1' });
    expect(result.success).toBe(false);
  });

  it('rejects a mismatched confirmPassword', () => {
    const result = signupInput.safeParse({ ...validSignup, confirmPassword: 'different1' });
    expect(result.success).toBe(false);
  });

  it('rejects accountType: ADMIN — structurally unreachable via signup', () => {
    const result = signupInput.safeParse({ ...validSignup, accountType: 'ADMIN' });
    expect(result.success).toBe(false);
  });

  it('accepts an omitted phone number', () => {
    const withoutPhone: Record<string, unknown> = { ...validSignup };
    delete withoutPhone.phone;
    expect(signupInput.safeParse(withoutPhone).success).toBe(true);
  });
});

describe('forgotPasswordInput', () => {
  it('requires a valid email', () => {
    expect(forgotPasswordInput.safeParse({ email: 'jane@example.com' }).success).toBe(true);
    expect(forgotPasswordInput.safeParse({ email: 'nope' }).success).toBe(false);
  });
});

describe('resetPasswordInput', () => {
  it('accepts matching, valid passwords', () => {
    expect(
      resetPasswordInput.safeParse({ password: 'abc12345', confirmPassword: 'abc12345' }).success,
    ).toBe(true);
  });

  it('rejects mismatched passwords', () => {
    expect(
      resetPasswordInput.safeParse({ password: 'abc12345', confirmPassword: 'abc99999' }).success,
    ).toBe(false);
  });
});
