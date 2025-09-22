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
import type { EasyName, SetRgbOptions } from "./types";

export const setRgb = async ({ led, color }: SetRgbOptions) => {
  if (typeof led == "number")
    return await $`kontroll set-rgb --led ${led} --color ${color}`.text();

  return await $`kontroll set-rgb --led ${translateNameToNum(led)} --color ${color}`.text();
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
  const parts = name.split("-");

  // Validate board
  if (parts[0] !== "left" && parts[0] !== "right") {
    throw new Error(`Invalid board: ${parts[0]}`);
  }
  const board = parts[0] as "left" | "right";

  // Validate x
  let x: "thumb" | number;
  if (parts[1] === "thumb") {
    x = "thumb";
  } else {
    const xNum = parseInt(parts[1]);
    if (isNaN(xNum) || xNum < 0 || xNum > 5) {
      throw new Error(`Invalid x: ${parts[1]}`);
    }
    x = xNum;
  }

  // Validate y
  const y = parseInt(parts[2]);
  if (isNaN(y) || y < 0 || y > 3) {
    throw new Error(`Invalid y: ${parts[2]}`);
  }

  // Calculate key number
  if (x === "thumb") {
    // Thumb keys
    if (board === "left") {
      // left board: inner thumb is 24, outer thumb is 25
      return y === 0 ? 24 : 25;
    } else {
      // right board: inner thumb is 50, outer thumb is 51
      return y === 0 ? 50 : 51;
    }
  } else {
    // Regular grid keys
    if (board === "left") {
      return x + y * 6;
    } else {
      return 26 + x + y * 6;
    }
  }
};
