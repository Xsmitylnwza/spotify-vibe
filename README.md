# Spotify Vibe / Vibe Dayline

Personal Windows utility that schedules customized **Discord Rich Presence** scenes from recurring local-time slots.

This is a local companion app, not a hosted website.

## Features

- Create, edit, duplicate, and delete Rich Presence **Scenes**
- Linear editor flow: **Choose a Scene → Personalize → Review and show on Discord**
- Assign scenes to repeating **Daily Time Slots** (`06:00`, `12:00`, …)
- Temporary **Manual Override** until the next enabled slot
- Local-only config + secrets (no cloud account)
- Bundled Discord Application ID — Presence connects out of the box, no Developer Portal setup
- Optional GIPHY search for scene artwork (a key is only needed for the GIF browser)
- **Advanced settings** in the Studio for key overrides
- Optional **Start with Windows** so Presence keeps running after reboot

### Presence Studio preview

*Screenshots show the pre-redesign Studio and will be refreshed.*

![Presence Studio overview](docs/images/studio-overview.png)

*Scene library, editor, Discord-style preview, and daily schedule in one local page.*

![API keys setup](docs/images/api-keys.png)

*The bundled Discord Application ID works out of the box — the Discord field is only an advanced override. A GIPHY key is only needed for the GIF browser. Credentials stay on this PC only.*

![GIF picker](docs/images/gif-picker.png)

*Browse or search GIFs for scene artwork after a GIPHY key is saved.*

![Start with Windows](docs/images/start-with-windows.png)

*Enable the companion to launch hidden after Windows sign-in so you do not need to run it manually every day.*

## Requirements

- Windows (autostart is Windows-only; Studio itself can run where Node runs)
- [Node.js](https://nodejs.org/) 20+ and npm
- Discord Desktop signed in, with activity sharing enabled:
  **User Settings → Activity Privacy**
- A bundled Discord Application ID is used by default — no Developer Portal setup needed
- Optional free GIPHY beta key from the [GIPHY Developer Dashboard](https://developers.giphy.com/dashboard/?create=true) (only needed for the **Find a GIF** browser)

## Quick start

```bash
npm install
npm run presence:studio
```

The companion starts and opens:

```text
http://127.0.0.1:17345
```

### First run — no keys required

A Discord Application ID is **bundled by default** (`1526867893508116620` — a public identifier, not a secret), so Presence connects as soon as Discord Desktop is running and signed in. **You do not need to enter anything.**

The **Advanced settings** dialog (Studio header → **ตั้งค่าขั้นสูง**) shows the Discord Application ID as *Configured* and is only for overrides:

- **Your own Discord Application ID** (advanced) — use an app you created in the [Discord Developer Portal](https://discord.com/developers/applications) instead of the bundled one.
- **GIPHY API key (optional)** — only needed for the **Find a GIF** browser. Without a key you can still paste any public HTTPS GIF/image URL as scene artwork.

Keys are stored only on your machine at:

```text
%APPDATA%\Spotify Vibe\app-secrets.json
```

(non-Windows: `~/.spotify-vibe/app-secrets.json`). The file is written with owner-only permissions and is never uploaded anywhere.

Scene and schedule data is stored separately at:

```text
%APPDATA%\Spotify Vibe\presence-config.json
```

You can reopen Advanced settings any time from the header. Override priority: CLI argument / environment variable → saved key in `app-secrets.json` → bundled default.

### Advanced overrides (optional)

Override the bundled Discord Application ID or preset keys via automation / power-user methods:

```bash
npm run presence:studio -- YOUR_APPLICATION_ID
```

Environment variables:

```bash
# PowerShell example
$env:DISCORD_CLIENT_ID="YOUR_APPLICATION_ID"
$env:GIPHY_API_KEY="YOUR_GIPHY_KEY"
npm run presence:studio
```

Clipboard / CLI GIPHY helper (optional):

```bash
# copy only the GIPHY key first, then:
npm run presence:giphy-setup

# or pass the key directly:
npm run presence:giphy-setup -- YOUR_GIPHY_KEY
```

## Keep it running all day (recommended)

Presence is owned by the **Background Companion** (a local Node process), not by the browser tab.

### What to leave open

| Component | Required? | Notes |
| --- | --- | --- |
| Discord Desktop | Yes | Must be signed in with activity sharing enabled |
| Background Companion | Yes | Applies Scenes and watches the clock |
| Presence Studio browser tab | No | Safe to close after setup |

Closing the Studio tab does **not** stop Presence.

### Enable Start with Windows

Do this once after first setup so you do not need to run `npm run presence:studio` every reboot:

1. Start the app once:
   ```bash
   npm run presence:studio
   ```
2. Confirm the Discord connection status shows connected (the bundled Application ID is already active).
3. In the right panel, open **Companion**.
4. Turn **Start with Windows** on.

After that:

- Windows sign-in starts the companion hidden (no Studio browser window).
- Daily Time Slots keep switching Scenes automatically.
- Open Studio later only when you want to edit Scenes:
  - visit `http://127.0.0.1:17345`, or
  - run `npm run presence:studio` again (if the companion is already running, it reopens Studio instead of starting a second scheduler)

The autostart launcher is created at:

```text
%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\Spotify Vibe Presence.vbs
```

### Stop or disable later

- **Pause schedule** — keeps current Presence visible, stops automatic Scene changes
- **Clear** — removes Rich Presence and pauses the schedule
- **Exit** — clears Presence and stops the companion for this session
- Turn **Start with Windows** off before Exit if you do not want it to return at the next sign-in

### Quick health checks

- Studio loads at `http://127.0.0.1:17345`
- Connection pill shows Discord connected
- Companion card shows **Start with Windows** enabled if you want reboot persistence

## Day-to-day use

1. Keep **Discord Desktop** running.
2. Keep the companion running (`npm run presence:studio`, or rely on Start with Windows).
3. Customize scenes and daily slots in the Studio when needed.
4. Leave the browser closed; the companion continues on its own.

### Controls

| Action | Effect |
| --- | --- |
| Show on Discord | Temporary manual override until the next enabled slot |
| Pause schedule | Stops automatic scene changes; current presence stays |
| Clear | Removes Rich Presence and pauses the schedule |
| Exit | Clears presence and stops the companion |

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run presence:studio` | Start Background Companion + Studio |
| `npm start` | Same as `presence:studio` |
| `npm run presence:giphy-setup` | Save GIPHY key from clipboard or argument |
| `npm test` | Run companion unit/integration tests |

## Security notes

- Never commit `.env`, `app-secrets.json`, refresh tokens, or API keys.
- Secrets live only in the local `app-secrets.json` file on this PC; they are never uploaded anywhere.
- Studio binds to `127.0.0.1` only.
- GIPHY and Discord credentials are not returned by public config endpoints.

## Code signing policy

Free code signing provided by [SignPath.io](https://about.signpath.io/), certificate by [SignPath Foundation](https://signpath.org/).

Windows installers are built from this repository by the [Release workflow](./.github/workflows/release.yml) on GitHub-hosted runners and submitted to SignPath from that same run. Every signing request is approved manually; nothing built outside GitHub Actions is signed. Each release carries `release-provenance.json` (source commit, build run, `codeSigning` state) and `SHA256SUMS.txt`.

| Role | Members |
| --- | --- |
| Committers and reviewers | [@Xsmitylnwza](https://github.com/Xsmitylnwza) |
| Approvers | [@Xsmitylnwza](https://github.com/Xsmitylnwza) |

All team members use multi-factor authentication for GitHub and SignPath.

### Privacy

Vibe Studio collects no telemetry and has no accounts or servers of its own. It talks only to:

- **Discord Desktop on this PC** (local RPC) to set your Rich Presence; the activity you configure is then visible to people who can see your Discord profile. Studio shows your Discord avatar from `cdn.discordapp.com`.
- **GitHub Releases** to check for and download updates, and `raw.githubusercontent.com` for the app-icon/artwork images that Discord displays.
- **GIPHY**, only if you add your own GIPHY key and search for a GIF.
- **IMG.GE**, only after you allow public icon uploads. Studio uploads paired or explicitly selected app icons as PNGs; app paths and secrets are not sent. These hosted images are public.

Configuration and secrets stay in local files on your PC. Uninstall from Windows Settings → Apps.

## Development checks

```bash
npm test
```

## Product docs

- [Personal Scheduled Discord Presence — Source of Truth](./docs/PERSONAL_SCHEDULED_PRESENCE_SOURCE_OF_TRUTH.md)
- [Discord Integration — Source of Truth](./docs/DISCORD_INTEGRATION_SOURCE_OF_TRUTH.md)
- [Domain language](./CONTEXT.md)
- [ADR 0004: Reduce to personal scheduled Presence](./docs/adr/0004-reduce-to-personal-scheduled-presence.md)

## Troubleshooting

**Studio says Discord is disconnected**
- Confirm Discord Desktop is open and signed in
- Confirm Activity Privacy allows activity sharing
- Confirm **Advanced settings** shows the Discord Application ID as *Configured* (a bundled ID is used by default; only an override you entered yourself can be wrong)

**Find a GIF is unavailable**
- Open **Advanced settings** (Studio header → **ตั้งค่าขั้นสูง**) and save a valid GIPHY key
- Or paste any public HTTPS GIF/image URL into the scene artwork field

**Companion did not start after reboot**
- Confirm **Start with Windows** is still enabled in Studio
- Confirm the Startup launcher still exists:
  `%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\Spotify Vibe Presence.vbs`
- Confirm Node.js is still installed and the repo path has not moved
- Start once manually with `npm run presence:studio`, then re-enable **Start with Windows**

**Port already in use**
- The companion is probably already running; it reopens `http://127.0.0.1:17345`
- Or start with another port: `npm run presence:studio -- --port=17346`

**Want a clean stop**
- Use **Exit** in Studio, or press `Ctrl+C` in the terminal that launched the companion

## License

Private / personal project unless you add an explicit license.
