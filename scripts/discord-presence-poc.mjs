import DiscordRPC from 'discord-rpc';

const [argumentClientId, argumentDetails, argumentState] = process.argv.slice(2);
const clientId = argumentClientId?.trim() || process.env.DISCORD_CLIENT_ID?.trim();
const details = argumentDetails?.trim()
  || process.env.DISCORD_DETAILS?.trim()
  || 'Rich Presence proof of concept';
const state = argumentState?.trim()
  || process.env.DISCORD_STATE?.trim()
  || 'Connected from spotify-vibe';

if (!clientId || !/^\d{17,20}$/.test(clientId)) {
  console.error('\nMissing a valid Discord Application ID.');
  console.error('Run: npm run presence:poc -- YOUR_APPLICATION_ID\n');
  process.exit(1);
}

for (const [label, value] of [['details', details], ['state', state]]) {
  if (value.length < 2 || value.length > 128) {
    console.error(`Discord ${label} must contain 2–128 characters.`);
    process.exit(1);
  }
}

const client = new DiscordRPC.Client({ transport: 'ipc' });
let presenceIsActive = false;
let isStopping = false;

async function stop(exitCode = 0) {
  if (isStopping) return;
  isStopping = true;

  if (presenceIsActive) {
    await client.clearActivity().catch(() => undefined);
  }
  await client.destroy().catch(() => undefined);
  console.log('\nRich Presence stopped.');
  process.exit(exitCode);
}

client.once('ready', async () => {
  try {
    await client.setActivity({
      details,
      state,
      startTimestamp: new Date(),
      instance: false,
    });
    presenceIsActive = true;

    console.log('\nDiscord Rich Presence is LIVE.');
    console.log(`Details: ${details}`);
    console.log(`State:   ${state}`);
    console.log('\nInspect your Discord profile to verify it.');
    console.log('Keep this terminal open. Press Ctrl+C to stop.\n');
  } catch (error) {
    console.error('\nConnected to Discord, but setting Rich Presence failed.');
    console.error(error instanceof Error ? error.message : String(error));
    await stop(1);
  }
});

client.on('disconnected', () => {
  if (!isStopping) {
    console.error('\nDiscord disconnected. Rich Presence is no longer active.');
    process.exit(1);
  }
});

process.once('SIGINT', () => void stop());
process.once('SIGTERM', () => void stop());

console.log('Connecting to Discord Desktop...');

try {
  await client.login({ clientId });
} catch (error) {
  console.error('\nCould not connect to Discord Rich Presence.');
  console.error('Confirm that Discord Desktop is running and the Application ID is correct.');
  console.error(error instanceof Error ? error.message : String(error));
  await stop(1);
}
