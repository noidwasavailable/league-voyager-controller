import { $, sleep, sleepSync } from "bun";
import kontroll from "./kontroll";

/**
 * kontroll --help
 Kontroll demonstates how to control the Keymapp API, making it easy to control your ZSA keyboard from the command line and scripts.

 Usage: kontroll [OPTIONS] <COMMAND>

 Commands:
   status               Get the status of the currently connected keyboard
   list                 List all available keyboards
   connect              Connect to a keyboard given the index returned by the list command
   connect-any          Connect to the first keyboard detected by keymapp
   set-layer            Set the layer of the currently connected keyboard
   set-rgb              Sets the RGB color of a LED
   set-rgb-all          Sets the RGB color of all LEDs
   restore-rgb-leds     Restores the RGB color of all LEDs to their default
   set-status-led       Set / Unset a status LED
   restore-status-leds  Restores the status of all status LEDs to their default
   increase-brightness  Increase the brightness of the keyboard's LEDs
   decrease-brightness  Decrease the brightness of the keyboard's LEDs
   disconnect           Disconnect from the currently connected keyboard
   help                 Print this message or the help of the given subcommand(s)

 Options:
   -p, --port <Server socket path or port on Windows>
   -h, --help                                          Print help
   -V, --version                                       Print version
 */

// Use Response as stdin.
await kontroll.restoreRgbLeds();

const res2 = await kontroll.setRgb({
  led: "left-3-0",
  color: "#ff0000",
});
// await kontroll.restoreRgbLeds();
await kontroll.setRgb({ led: "left-2-2", color: "#00ff00" });
console.log(res2);
