// Public Discord Application ID, not a token or client secret.
export const DEFAULT_DISCORD_APPLICATION_ID = '1526867893508116620';

export function withDefaultApplication(settings) {
  return settings.discordClientId ? settings : {
    ...settings,
    discordClientId: DEFAULT_DISCORD_APPLICATION_ID,
    discordSource: 'bundled',
  };
}
