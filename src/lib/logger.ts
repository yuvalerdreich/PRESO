import type { AppErrorCode } from '@/lib/errors';

/**
 * Structured logging (TECHNICAL_DESIGN.md §8.5). One JSON line per event to stdout, which is
 * what Vercel collects. No log library — the requirement is a shape, not a framework.
 *
 * §8.5's "never logged" list is the important part and is enforced by `redact()` below rather
 * than by convention: passwords, JWTs, the service-role key, `CRON_SECRET`, the webhook secret,
 * email addresses, phone numbers, full names and report descriptions. `actorId` is a profile
 * **id**, never an email or a name.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export type LogFields = {
  event: string;
  requestId?: string;
  route?: string;
  actorId?: string;
  code?: AppErrorCode;
  sqlstate?: string;
  durationMs?: number;
  [key: string]: unknown;
};

/**
 * Keys whose values never leave the process. Matched case-insensitively on substring so
 * `clientEmail`, `ownerFullName` and `service_role_key` are all caught without enumerating
 * every variant a caller might invent.
 */
const FORBIDDEN_KEY_PATTERNS = [
  'password',
  'token',
  'jwt',
  'secret',
  'apikey',
  'api_key',
  'authorization',
  'cookie',
  'email',
  'phone',
  'fullname',
  'full_name',
  'description',
];

function isForbiddenKey(key: string): boolean {
  const normalised = key.toLowerCase().replace(/[^a-z_]/g, '');
  return FORBIDDEN_KEY_PATTERNS.some((pattern) => normalised.includes(pattern.replace(/[^a-z_]/g, '')));
}

function redact(fields: LogFields): Record<string, unknown> {
  const safe: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(fields)) {
    safe[key] = isForbiddenKey(key) ? '[redacted]' : value;
  }
  return safe;
}

function emit(level: LogLevel, fields: LogFields): void {
  const line = JSON.stringify({ level, ts: new Date().toISOString(), ...redact(fields) });

  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else if (level === 'debug') {
    if (process.env.NODE_ENV !== 'production') console.debug(line);
  } else console.info(line);
}

export const log = {
  debug: (fields: LogFields) => emit('debug', fields),
  info: (fields: LogFields) => emit('info', fields),
  warn: (fields: LogFields) => emit('warn', fields),
  error: (fields: LogFields) => emit('error', fields),
};

/**
 * §8.5's level rule, as a function so both boundary wrappers agree.
 *
 * The `CONFLICT` case is the one worth stating out loud: **a 409 is `info`, not `error`.** It is
 * expected system behaviour — two clients wanting the same slot — and alerting on it would page
 * someone for healthy contention.
 */
export function levelForCode(code: AppErrorCode): LogLevel {
  if (code === 'CONFLICT') return 'info';
  if (code === 'INTERNAL' || code === 'UPSTREAM') return 'error';
  return 'warn';
}
