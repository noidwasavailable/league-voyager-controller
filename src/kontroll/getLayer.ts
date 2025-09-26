import { $ } from "bun";

export const getLayer = async () => {
  return (await $`kontroll status --json`.json()).keyboard
    .current_layer as number;
};
