import { $ } from "bun";

export const restoreRgbLeds = async () => {
  return await $`kontroll restore-rgb-leds`.text();
};
