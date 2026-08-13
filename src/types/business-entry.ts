/** Typecheck-only placeholder shape — the real business-entry model isn't built yet. */
export type BusinessCategory = { id: string; name: string } & Record<string, unknown>;
export type BusinessArea = { id: string; name: string } & Record<string, unknown>;
export type JoinableBusiness = { id: string; name: string } & Record<string, unknown>;
