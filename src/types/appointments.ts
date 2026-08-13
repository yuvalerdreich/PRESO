/** Typecheck-only placeholder shape — the real client appointments model isn't built yet. */
export type ClientAppointment = { id: string; status: string } & Record<string, unknown>;
export type ClientWaitlistEntry = { id: string } & Record<string, unknown>;
