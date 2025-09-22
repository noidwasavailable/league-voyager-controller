/**
 * Root types shim (deprecated).
 *
 * @deprecated This file is kept temporarily for backward compatibility.
 * Prefer importing from the modular structure:
 *
 *   // Barrel (recommended)
 *   import { EasyName, parseEasyName, LCUCredentials } from "@types";
 *
 *   // Domain-specific
 *   import { EasyName, parseEasyName } from "@/types/kontroll";
 *   import { LCUCredentials } from "@/types/league";
 *
 * Rationale:
 * - The project now separates keyboard/LED (kontroll) concerns from League (LCU) concerns.
 * - A barrel file lives at: src/types/index.ts (aliased by @types in tsconfig paths).
 *
 * This shim re-exports everything so existing relative imports like:
 *   import { SetRgbOptions } from "./types";
 * continue to work while you migrate.
 *
 * Remove this file once all such relative imports are updated.
 */

/* -------------------------------------------------------------------------- */
/*  Re-exports                                                                */
/* -------------------------------------------------------------------------- */

export * from "./types/index";

/**
 * Namespaced convenience (if you prefer grouped access):
 *
 *   import { kontroll, league } from "@types";
 *   kontroll.parseEasyName(...);
 *   league.parseLCUCredentials(...);
 */
export * as kontroll from "./types/kontroll";
export * as league from "./types/league";

/* -------------------------------------------------------------------------- */
/*  One-time development warning                                              */
/* -------------------------------------------------------------------------- */

declare const process: any; // Avoids type issues in non-Node environments

(function warnOnce() {
  const g = (globalThis as any) || {};
  const already = g.__LEGACY_TYPES_TS_WARNED__;
  if (already) return;
  const isProd =
    typeof process !== "undefined" &&
    process &&
    process.env &&
    process.env.NODE_ENV === "production";

  if (!isProd && typeof console !== "undefined" && console.warn) {
    console.warn(
      "[league-voyager-controller] Deprecated import from 'src/types.ts'. Use '@types' (barrel) or '@/types/<domain>' instead.",
    );
  }
  g.__LEGACY_TYPES_TS_WARNED__ = true;
})();
