import { createLCUClient, getLCUCredentials } from "./league/LcuClient";

const SpellEnums = [
  {
    name: "Cleanse",
    spellId: 1,
    color: "#00FFFF",
  },
  {
    name: "Exhaust",
    spellId: 3,
    color: "#d3891b",
  },
  {
    name: "Flash",
    spellId: 4,
    color: "#FF00FF",
  },
  {
    name: "Ghost",
    spellId: 6,
    color: "#0000FF",
  },
  {
    name: "Heal",
    spellId: 7,
    color: "#00FF00",
  },
  {
    name: "Smite",
    spellId: 11,
    color: "#f7bb25",
  },
  {
    name: "Teleport",
    spellId: 12,
    color: "#6119a0",
  },
  {
    name: "Ignite",
    spellId: 14,
    color: "#FF0000",
  },
  {
    name: "Barrier",
    spellId: 21,
    color: "#f2c31a",
  },
];
const main = async () => {
  const creds = await getLCUCredentials({ timeoutMs: 5000 });
  if (!creds) {
    console.error(
      "League Client not detected (timed out waiting for credentials).",
    );
    return;
  }

  const client = createLCUClient(creds);

  // --- LCU Event Stream ------------------------------------------------------
  await client.connectEvents();
  client.on("connect", () => console.log("[events] connected"));
  client.on("disconnect", () => console.log("[events] disconnected"));

  let init = false;
  let inProgress = false;
  client.on("/lol-gameflow/v1/session", async (data, type, raw) => {
    if (!inProgress && data.phase === "InProgress") {
      inProgress = true;
      console.log("[gameflow] Game started");
      return;
    }

    if (inProgress && data.phase !== "InProgress") {
      inProgress = false;
      console.log("[gameflow] Game ended");
      return;
    }
  });

  // Listen specifically to champion select session updates
  client.on("/lol-champ-select/v1/session", async (data, type, raw) => {
    if (!data.gameId) {
      init = false;
      return;
    }
    if (!init && data) {
      console.log("[champ-select] session initialized");
      init = true;
    }
    const res: any = await client.json(
      "/lol-champ-select/v1/session/my-selection",
    );
    console.log(`[my-selection] Spell 1: ${res.spell1Id}`);
  });
  // ---------------------------------------------------------------------------
};
await main();
// const insecureAgent = new https.Agent({
//   rejectUnauthorized: false,
// });

// const getActivePlayer = async () => {
//   const response = await fetch(
//     `https://127.0.0.1:2999/liveclientdata/activeplayer`,
//     {
//       tls: {
//         rejectUnauthorized: false,
//       },
//     },
//   );
//   console.log(response);
//   const data = await response.json();

//   return data;
// };

// console.log(await getActivePlayer());

// // Use Response as stdin.
// await kontroll.restoreRgbLeds();

// const res2 = await kontroll.setRgb({
//   led: "left-3-0",
//   color: "#ff0000",
// });
// // await kontroll.restoreRgbLeds();
// await kontroll.setRgb({ led: "left-2-2", color: "#00ff00" });
// console.log(res2);
