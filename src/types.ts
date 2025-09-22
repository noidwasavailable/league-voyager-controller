import { z } from "zod";

/**
 * Zod schemas and inferred types replacing the previous pure TypeScript types.
 *
 * EasyName format: `${board}-${x}-${y}`
 *   board: "left" | "right"
 *   x: 0-5 (column index) OR "thumb"
 *   y: 0-3 (row index) — for thumb keys, 0 means "inner", any other value (commonly 1) means "outer"
 */

/* -------------------------------------------------------------------------- */
/*  Primitive component schemas                                               */
/* -------------------------------------------------------------------------- */

export const EasyNameBoardSchema = z.enum(["left", "right"]);

/**
 * Column index (0-5) OR the literal "thumb".
 */
export const EasyNameXSchema = z.union([
  z.literal("thumb"),
  z.number().int().min(0).max(5),
]);

/**
 * Row index (0-3). (For thumb usage: 0 => inner, anything else => outer.)
 */
export const EasyNameYSchema = z.number().int().min(0).max(3);

/* -------------------------------------------------------------------------- */
/*  EasyName string schema                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Validates the string form and also exposes a helper to parse it into parts.
 *
 * We keep the public type as the original template literal shape for ergonomic usage
 * while enforcing validation at runtime.
 */
export const EasyNameSchema = z
  .string()
  .regex(/^(left|right)-(thumb|[0-5])-[0-3]$/, "Invalid EasyName format");
// removed brand to allow plain string literal assignment

/**
 * Parsed representation of an EasyName.
 */
export const ParsedEasyNameSchema = z.object({
  board: EasyNameBoardSchema,
  x: EasyNameXSchema,
  y: EasyNameYSchema,
});

/* -------------------------------------------------------------------------- */
/*  Color schema                                                              */
/* -------------------------------------------------------------------------- */

/**
 * Color must be a hex string beginning with '#'.
 * Supports #RGB, #RRGGBB, or #RRGGBBAA (you can relax/tighten as desired).
 */
export const HexColorSchema = z
  .string()
  .regex(
    /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/,
    "Color must be a hex value (#RGB, #RRGGBB, or #RRGGBBAA)",
  );

/* -------------------------------------------------------------------------- */
/*  SetRgbOptions schema                                                      */
/* -------------------------------------------------------------------------- */

/**
 * LED can be either a direct numeric index (0-51) or an EasyName string.
 */
export const LedIndexSchema = z.number().int().min(0).max(51);

export const SetRgbOptionsSchema = z.object({
  led: z.union([LedIndexSchema, EasyNameSchema]),
  color: HexColorSchema,
  sustain: z.number().int().min(0).default(0).optional(),
});

export const SetRgbAllOptionsSchema = SetRgbOptionsSchema.omit({ led: true });

export type EasyNameBoard = z.infer<typeof EasyNameBoardSchema>;
export type EasyNameX = z.infer<typeof EasyNameXSchema>;
export type EasyNameY = z.infer<typeof EasyNameYSchema>;
export type EasyName = `${EasyNameBoard}-${EasyNameX}-${EasyNameY}`; // template literal for ergonomics
export type ParsedEasyName = z.infer<typeof ParsedEasyNameSchema>;
export type SetRgbOptions = z.infer<typeof SetRgbOptionsSchema>;
export type SetRgbAllOptions = z.infer<typeof SetRgbAllOptionsSchema>;

/* -------------------------------------------------------------------------- */
/*  Helper functions                                                          */
/* -------------------------------------------------------------------------- */

/**
 * Parses an EasyName string into structured parts (board, x, y) with validation.
 */
export function parseEasyName(name: unknown): ParsedEasyName {
  const str = EasyNameSchema.parse(name); // validates the string pattern first
  const [boardStr, xStr, yStr] = str.split("-");

  const board = EasyNameBoardSchema.parse(boardStr);

  let x: EasyNameX;
  if (xStr === "thumb") {
    x = "thumb";
  } else {
    x = EasyNameXSchema.parse(Number(xStr));
  }

  const y = EasyNameYSchema.parse(Number(yStr));

  return { board, x, y };
}

/**
 * Validates SetRgbOptions and returns the parsed, strongly typed data.
 */
export function validateSetRgbOptions(input: unknown): SetRgbOptions {
  return SetRgbOptionsSchema.parse(input);
}

/**
 * Utility to determine if a value is a validated EasyName (type guard).
 * Note: This still performs a parse (so it can throw); wrap in try/catch if needed.
 */
export function isEasyName(value: unknown): value is EasyName {
  try {
    EasyNameSchema.parse(value);
    return true;
  } catch {
    return false;
  }
}

export interface LCUCredentials {
  pid: number;
  port: number;
  password: string;
  protocol: string;
}

export interface FetchLCUOptions extends RequestInit {
  /**
   * If true (default), sets Authorization header with Basic riot:<password>
   */
  auth?: boolean;
  /**
   * If true (default), sets tls.rejectUnauthorized = false (Bun specific)
   * for local self-signed certificate.
   */
  insecureTLS?: boolean;
}

export interface GetCredentialsOptions {
  /**
   * Maximum time to wait (ms) while polling for credentials.
   *  - 0 or undefined means single attempt (no polling).
   *  - >0 => poll until timeout or success.
   */
  timeoutMs?: number;
  /**
   * Poll interval (ms) when timeoutMs > 0 (default: 500)
   */
  pollIntervalMs?: number;
}
