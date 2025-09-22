import { $ } from "bun";

// Use Response as stdin.
const res = await $`kontroll status`.text();

console.log(res);
