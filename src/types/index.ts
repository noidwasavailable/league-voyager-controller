/**
 * Barrel file for all shared types & schemas.
 *
 * This aggregates exports from the domain-specific modules:
 *  - kontroll (device / LED / EasyName logic)
 *  - league (LCU / client integration)
 *
 * Typical usage after updating tsconfig paths:
 *   // tsconfig.json
 *   // "paths": { "@types": ["src/types/index.ts"], "@/*": ["src/*"] }
 *
 *   import { SetRgbOptions, LCUCredentials } from "@types";
 *   // or namespaced:
 *   import * as Types from "@types";
 *   import { kontroll, league } from "@types";
 *
 * You can also choose a namespaced style if you prefer to avoid symbol overlap:
 *   import { kontroll } from "@types";
 *   kontroll.parseEasyName(...)
 *
 * Both raw star exports and namespaced exports are provided below.
 */

/* Re-export all individual symbols (flat surface) */
export * from "./kontroll";
export * from "./league";

/* Optional namespaced aggregates for ergonomic grouped imports */
export * as kontroll from "./kontroll";
export * as league from "./league";
