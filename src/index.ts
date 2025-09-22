import {
  LEAGUE_LAYER,
  SPELL_1_SLOT,
  SPELL_2_SLOT,
  SpellEnums,
} from "./CONSTANTS";
import kontroll from "./kontroll";
import { createLCUClient, getLCUCredentials } from "./league/LcuClient";

const resolveSpellColor = (id: number) =>
  SpellEnums.find((el) => el.spellId === id)?.color ?? "#FFFFFF";

const initLeagueMode = async ({
  spell1Id,
  spell2Id,
}: {
  spell1Id: number;
  spell2Id: number;
}) => {
  kontroll.setLayer(LEAGUE_LAYER);
  // --- Set up Defaults -------------------------------------------------------
  const qwe = ["left-1-1", "left-2-1", "left-3-1"];
  const r = "left-4-1";
  const RETURN_TO_BASE_LAYER = "right-5-3";

  qwe.forEach((led) =>
    kontroll.setRgb({
      led: led,
      color: "#15BBF2", //cyan-blue-ish
    }),
  );

  [r, RETURN_TO_BASE_LAYER].forEach((led) => {
    kontroll.setRgb({
      led: led,
      color: "#F50A4E", //magenta-red-ish
    });
  });
  // ---------------------------------------------------------------------------
  // Set up spells
  kontroll.setRgb({
    led: SPELL_1_SLOT,
    color: resolveSpellColor(spell1Id),
  });

  kontroll.setRgb({
    led: SPELL_2_SLOT,
    color: resolveSpellColor(spell2Id),
  });
};

const endLeagueMode = async () => {
  kontroll.restoreRgbLeds();
  kontroll.setLayer(0);
};

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

  let champSelectInit = false;
  let gameInProgress = false;
  let spell1Id = 0;
  let spell2Id = 0;
  client.on("/lol-gameflow/v1/session", async (data, type, raw) => {
    if (!gameInProgress && data.phase === "InProgress") {
      gameInProgress = true;
      console.log("[gameflow] Game started");
      initLeagueMode({
        spell1Id,
        spell2Id,
      });
      return;
    }

    if (gameInProgress && data.phase !== "InProgress") {
      gameInProgress = false;
      console.log("[gameflow] Game ended");
      endLeagueMode();
      return;
    }
  });

  // Listen specifically to champion select session updates
  client.on("/lol-champ-select/v1/session", async (data, type, raw) => {
    if (!data.gameId) {
      champSelectInit = false;
      return;
    }
    if (!champSelectInit && data) {
      console.log("[champ-select] session initialized");
      champSelectInit = true;
    }
    const res: any = await client.json(
      "/lol-champ-select/v1/session/my-selection",
    );
    spell1Id = res.spell1Id;
    spell2Id = res.spell2Id;
    console.log(`spell1Id: ${spell1Id}, spell2Id: ${spell2Id}`);
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
