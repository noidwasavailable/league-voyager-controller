/**
kontroll set-rgb --help
Sets the RGB color of a LED

Usage: kontroll set-rgb [OPTIONS] --led <LED> --color <COLOR>

Options:
  -l, --led <LED>
  -c, --color <COLOR>
  -s, --sustain <SUSTAIN>  [default: 0]
  -h, --help               Print help
*/
import { $ } from "bun";
import { validateSetRgbOptions, parseEasyName } from "./types";
import type { EasyName, SetRgbOptions } from "./types";

export const setRgb = async (input: SetRgbOptions) => {
  // Runtime validation; will throw if invalid
  const { led, color } = validateSetRgbOptions(input);
  if (typeof led === "number") {
    return await $`kontroll set-rgb --led ${led} --color ${color}`.text();
  }
  const index = translateNameToNum(led);
  return await $`kontroll set-rgb --led ${index} --color ${color}`.text();
};

/**
 * The Voyager keyboard has two parts: left and right.
 * Each part has a grid of 6 * 4 keys + 2 thumb keys.
 *
 * Kontroll controlls the keyboard via numbered keys.
 * Keys are numbered starting from the left board, top-left at 0, going right, then down.
 * The leftmost key on the second from top row on the left board is 6.
 * The bottom-right key on the left board is 23.
 * The inner thumb key on the left board is 24 and the outer thumb key is 25.
 * The right board starts at 26 and goes up to 51, starting from the top-left key of the board,
 * to the outer thumb key at 51.
 *
 * The input string converts easy-to-read names into these indices. The name is formatted like:
 * "board-x-y" where board is either "left" or "right", x is either "thumb" or a number from 0 to 5,
 * and y is a number from 0 to 3.
 * @param name
 */

const translateNameToNum = (name: EasyName): number => {
  // Use Zod-based parsing to validate and extract components
  const { board, x, y } = parseEasyName(name);

  if (x === "thumb") {
    if (board === "left") {
      return y === 0 ? 24 : 25;
    } else {
      return y === 0 ? 50 : 51;
    }
  }

  // Regular grid keys
  if (board === "left") {
    return x + y * 6;
  } else {
    return 26 + x + y * 6;
  }
};
