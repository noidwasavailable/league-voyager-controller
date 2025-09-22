import { z } from "zod";

/**
 * League (LCU) related types & schemas
 *
 * These are separated from the kontroll domain types so that consumers can import:
 *   import { LCUCredentials } from "@/types/league";
 *
 * If you want a single unified import surface, create a barrel file:
 *   src/types/index.ts
 * that re-exports from "./kontroll" and "./league".
 */

/* -------------------------------------------------------------------------- */
/*  LCU Credentials                                                           */
/* -------------------------------------------------------------------------- */

/**
 * Raw credentials discovered from the running League Client (lockfile).
 */
export interface LCUCredentials {
  pid: number;
  port: number;
  password: string;
  protocol: string; // e.g. "https"
}

export const LCUCredentialsSchema = z.object({
  pid: z.number().int().nonnegative(),
  port: z.number().int().min(1).max(65535),
  password: z.string().min(1),
  protocol: z.enum(["http", "https"]),
});

export type LCUCredentialsParsed = z.infer<typeof LCUCredentialsSchema>;

/* -------------------------------------------------------------------------- */
/*  Fetch options                                                             */
/* -------------------------------------------------------------------------- */

/**
 * Extra fetch options for talking to the LCU API.
 *
 * Extends the standard RequestInit:
 *  - auth: if true (default), sets Authorization header with Basic riot:<password>
 *  - insecureTLS: if true (default), disables TLS verification (Bun / Node fetch agents)
 */
export interface FetchLCUOptions extends RequestInit {
  auth?: boolean;
  insecureTLS?: boolean;
}

/**
 * Only the extra (non-RequestInit) flags get a schema; RequestInit
 * is left to the runtime/library.
 */
export const FetchLCUExtraOptionsSchema = z.object({
  auth: z.boolean().default(true).optional(),
  insecureTLS: z.boolean().default(true).optional(),
});

export type FetchLCUExtraOptions = z.infer<typeof FetchLCUExtraOptionsSchema>;

/* -------------------------------------------------------------------------- */
/*  Credential polling options                                                */
/* -------------------------------------------------------------------------- */

/**
 * Options controlling how the system polls for League credentials.
 */
export interface GetCredentialsOptions {
  /**
   * Maximum time to wait (ms) while polling for credentials.
   *  - 0 or undefined => single attempt (no polling)
   *  - >0 => poll until timeout or success.
   */
  timeoutMs?: number;
  /**
   * Poll interval (ms) when timeoutMs > 0 (default: 500)
   */
  pollIntervalMs?: number;
}

export const GetCredentialsOptionsSchema = z.object({
  timeoutMs: z.number().int().min(0).optional(),
  pollIntervalMs: z.number().int().min(1).default(500).optional(),
});

export type GetCredentialsOptionsParsed = z.infer<
  typeof GetCredentialsOptionsSchema
>;

/* -------------------------------------------------------------------------- */
/*  Helper / utility parse functions                                          */
/* -------------------------------------------------------------------------- */

/**
 * Validate raw credentials object (e.g. parsed from a lockfile).
 */
export function parseLCUCredentials(input: unknown): LCUCredentialsParsed {
  return LCUCredentialsSchema.parse(input);
}

/**
 * Extract and validate only our extra fetch flags (auth, insecureTLS).
 * You can merge this with a user-provided RequestInit after parsing.
 */
export function parseFetchLCUExtraOptions(
  input: unknown,
): FetchLCUExtraOptions {
  return FetchLCUExtraOptionsSchema.parse(input);
}

/**
 * Validate polling configuration for credential acquisition.
 */
export function parseGetCredentialsOptions(
  input: unknown,
): GetCredentialsOptionsParsed {
  return GetCredentialsOptionsSchema.parse(input);
}

/* -------------------------------------------------------------------------- */
/*  Aggregated (barrel-friendly) exports                                      */
/* -------------------------------------------------------------------------- */

export const leagueSchemas = {
  LCUCredentialsSchema,
  FetchLCUExtraOptionsSchema,
  GetCredentialsOptionsSchema,
};

export const leagueParsers = {
  parseLCUCredentials,
  parseFetchLCUExtraOptions,
  parseGetCredentialsOptions,
};

/* Prefixed re-exports (optional pattern mirroring kontroll.ts) */
export type {
  LCUCredentials as LeagueLCUCredentials,
  FetchLCUOptions as LeagueFetchLCUOptions,
  GetCredentialsOptions as LeagueGetCredentialsOptions,
  LCUCredentialsParsed as LeagueLCUCredentialsParsed,
  FetchLCUExtraOptions as LeagueFetchLCUExtraOptions,
  GetCredentialsOptionsParsed as LeagueGetCredentialsOptionsParsed,
};
