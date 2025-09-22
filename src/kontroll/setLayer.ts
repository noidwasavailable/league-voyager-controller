/**
kontroll set-layer --help
Set the layer of the currently connected keyboard

Usage: kontroll set-layer --index <INDEX>

Options:
  -i, --index <INDEX>
  -h, --help           Print help
 */

import { $ } from "bun";

export const setLayer = async (index: number) => {
  return await $`kontroll set-layer --index ${index}`.text();
};
