import {
  COLOR_BASIC_ABILITIES,
  COLOR_ULT,
  LEAGUE_LAYER,
  RETURN_TO_BASE_LAYER,
  SLOT_E,
  SLOT_Q,
  SLOT_R,
  SLOT_SPELL_1,
  SLOT_SPELL_2,
  SLOT_W,
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

  [SLOT_Q, SLOT_W, SLOT_E].forEach((led) =>
    kontroll.setRgb({
      led: led,
      color: COLOR_BASIC_ABILITIES,
    }),
  );

  [SLOT_R, RETURN_TO_BASE_LAYER].forEach((led) => {
    kontroll.setRgb({
      led: led,
      color: COLOR_ULT,
    });
  });
  // ---------------------------------------------------------------------------
  // Set up spells
  kontroll.setRgb({
    led: SLOT_SPELL_1,
    color: resolveSpellColor(spell1Id),
  });

  kontroll.setRgb({
    led: SLOT_SPELL_2,
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
