// Thin CLI entry — the full Presence Studio server implementation lives in
// ./studio-server.mjs so the Electron main process can start the same server
// in-process. Browser/CLI usage is unchanged:
//   node scripts/discord-presence-studio.mjs [--port=17345] [--no-open] [clientId]
import { startStudioServer } from './studio-server.mjs';

await startStudioServer({ argv: process.argv.slice(2) }).catch((error) => {
  console.error(String(error?.message || error));
  process.exit(1);
});
