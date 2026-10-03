# Tier-1 application icon pack

55 PNGs, each 256 x 256. `manifest.json` is the machine-readable index of executable aliases, names, publisher hints, provenance, licences and SHA-256 hashes. Unlisted older assets in this directory are not pack entries.

- **21 installed application icons**: Start Menu catalog via `scripts/installed-apps.mjs` / `installed-apps.ps1`, plus installed Teams discovered through its Windows Appx registration using the same `ExtractAssociatedIcon` method. These are original application artwork; their publishers retain copyright and trademark rights. Extraction does not grant a redistribution licence. Native extraction is 48px (Teams 32px), resampled with Lanczos to the required 256px transparent PNG; this is not native high-resolution extraction.
- **34 Simple Icons glyphs**: pinned `simple-icons@11.15.0` from the official npm registry; official brand glyphs rendered with resvg 2.6.2 on their recorded brand colour tiles. 33 have CC0-1.0 recorded; Vivaldi retains the upstream CC-BY-4.0 attribution below. Repository CC0 text is in `LICENSE-SIMPLE-ICONS.md`. Every source URL, brand source and available guideline URL is recorded per entry. Trademark rights remain with the brand owners.
- **Vivaldi attribution**: Vivaldi Technologies AS; underlying brand glyph CC-BY-4.0 per Simple Icons metadata. Glyph distributed by Simple Icons 11.15.0 (CC0), transformed into a 256px brand-colour tile. Licence: https://creativecommons.org/licenses/by/4.0/ . Source and brand guideline URLs: see its manifest entry.

Runtime imports `scripts/app-icon-pack.mjs`; no network requests or scans are performed by the matcher. Exact executable aliases take priority over product/display aliases; aliases ignore case and whitespace. Updaters and uninstallers cannot inherit a parent app icon. Publisher hints disambiguate collisions, never select an app on publisher alone.

Public URL: `https://raw.githubusercontent.com/Xsmitylnwza/spotify-vibe/<ref>/public/art/apps/<slug>.png`. Default ref: `improve/flow-ux`; configure `PRESENCE_APP_ICON_REF` or pass `{ref}` to URL helpers. Use a pushed commit SHA to pin production assets. URLs must be checked after the owner's approved push; local files do not prove public availability.

```powershell
node scripts/app-icon-pack.mjs --check-urls --ref improve/flow-ux
# or pass the owner-pushed commit SHA
```

The checker prints each URL/status and exits nonzero for missing URLs, non-PNG responses or network errors. It performs bounded concurrent GETs; it never uploads. The live device catalog and publish proxy select **pack -> uploaded hash cache -> default artwork + imageFallback**. Pack entries require no consent and never trigger uploads; disabling consent prevents new uploads while preserving already uploaded cache URLs.

| Slug | Display name | Source | Licence |
| --- | --- | --- | --- |
| google-chrome | Google Chrome | installed-app | LicenseRef-Application-Artwork |
| microsoft-edge | Microsoft Edge | installed-app | LicenseRef-Application-Artwork |
| firefox | Mozilla Firefox | simple-icons | CC0-1.0 |
| brave | Brave | installed-app | LicenseRef-Application-Artwork |
| opera | Opera | simple-icons | CC0-1.0 |
| vivaldi | Vivaldi | simple-icons | CC-BY-4.0 |
| visual-studio-code | Visual Studio Code | installed-app | LicenseRef-Application-Artwork |
| visual-studio | Microsoft Visual Studio | simple-icons | CC0-1.0 |
| cursor | Cursor | installed-app | LicenseRef-Application-Artwork |
| zed | Zed | installed-app | LicenseRef-Application-Artwork |
| intellij-idea | IntelliJ IDEA | simple-icons | CC0-1.0 |
| pycharm | PyCharm | simple-icons | CC0-1.0 |
| webstorm | WebStorm | simple-icons | CC0-1.0 |
| android-studio | Android Studio | simple-icons | CC0-1.0 |
| sublime-text | Sublime Text | simple-icons | CC0-1.0 |
| notepad-plus-plus | Notepad++ | simple-icons | CC0-1.0 |
| discord | Discord | installed-app | LicenseRef-Application-Artwork |
| spotify | Spotify | simple-icons | CC0-1.0 |
| steam | Steam | installed-app | LicenseRef-Application-Artwork |
| epic-games | Epic Games | simple-icons | CC0-1.0 |
| battle-net | Battle.net | simple-icons | CC0-1.0 |
| riot-client | Riot Client | installed-app | LicenseRef-Application-Artwork |
| ubisoft-connect | Ubisoft Connect | simple-icons | CC0-1.0 |
| ea-app | EA app | simple-icons | CC0-1.0 |
| gog-galaxy | GOG Galaxy | simple-icons | CC0-1.0 |
| obs-studio | OBS Studio | installed-app | LicenseRef-Application-Artwork |
| figma | Figma | simple-icons | CC0-1.0 |
| notion | Notion | simple-icons | CC0-1.0 |
| slack | Slack | simple-icons | CC0-1.0 |
| microsoft-teams | Microsoft Teams | installed-app | LicenseRef-Application-Artwork |
| zoom | Zoom | simple-icons | CC0-1.0 |
| microsoft-word | Microsoft Word | installed-app | LicenseRef-Application-Artwork |
| microsoft-excel | Microsoft Excel | installed-app | LicenseRef-Application-Artwork |
| microsoft-powerpoint | Microsoft PowerPoint | installed-app | LicenseRef-Application-Artwork |
| microsoft-outlook | Microsoft Outlook | installed-app | LicenseRef-Application-Artwork |
| microsoft-onenote | Microsoft OneNote | installed-app | LicenseRef-Application-Artwork |
| microsoft-access | Microsoft Access | installed-app | LicenseRef-Application-Artwork |
| adobe-photoshop | Adobe Photoshop | simple-icons | CC0-1.0 |
| adobe-illustrator | Adobe Illustrator | simple-icons | CC0-1.0 |
| blender | Blender | simple-icons | CC0-1.0 |
| unity | Unity | simple-icons | CC0-1.0 |
| unreal-engine | Unreal Engine | simple-icons | CC0-1.0 |
| telegram | Telegram | simple-icons | CC0-1.0 |
| line | LINE | installed-app | LicenseRef-Application-Artwork |
| whatsapp | WhatsApp | simple-icons | CC0-1.0 |
| signal | Signal | simple-icons | CC0-1.0 |
| vlc | VLC | simple-icons | CC0-1.0 |
| 7-zip | 7-Zip | simple-icons | CC0-1.0 |
| docker-desktop | Docker Desktop | simple-icons | CC0-1.0 |
| postman | Postman | simple-icons | CC0-1.0 |
| github-desktop | GitHub Desktop | simple-icons | CC0-1.0 |
| obsidian | Obsidian | simple-icons | CC0-1.0 |
| roblox | Roblox | installed-app | LicenseRef-Application-Artwork |
| capcut | CapCut | installed-app | LicenseRef-Application-Artwork |
| claude | Claude | installed-app | LicenseRef-Application-Artwork |
