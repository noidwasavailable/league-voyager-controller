import https from "https";
import { $ } from "bun";
import { createLCUClient, getLCUCredentials } from "./league/LcuClient";

const main = async () => {
  const creds = await getLCUCredentials({ timeoutMs: 5000 });
  if (!creds) {
    console.error(
      "League Client not detected (timed out waiting for credentials).",
    );
    return;
  }

  console.log(creds);

  const client = createLCUClient(creds);

  const res = await client.json("/lol-champ-select/v1/session/my-selection");
  console.log(res);
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
