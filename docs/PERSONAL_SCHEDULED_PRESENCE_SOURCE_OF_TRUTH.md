# Personal Scheduled Discord Presence — Source of Truth

> **Status:** Implemented current scope
>
> **Decision date:** July 16, 2026
>
> **Implementation verified:** July 16, 2026
>
> **Audience:** One app owner using one Windows computer and one Discord account
>
> **Implementation baseline:** Extend the existing local Discord Presence Studio

This document is the authoritative product scope for current work. It supersedes the earlier commercial Music Identity, Vibe Wardrobe, and Focus Coach directions. Those documents remain historical research only.

## 1. Product statement

Build a personal Windows app that lets its owner customize Discord Rich Presence Scenes and automatically selects the correct Scene from recurring daily time slots.

Example:

| Local time | Active Scene |
|---|---|
| 06:00 | Good Morning |
| 12:00 | Afternoon Vibe |
| 18:00 | Evening Gaming |
| 23:00 | Sleep Mode |

This is a local hobby utility. It is not a hosted service, commercial product, productivity app, calendar, or multi-user platform.

## 2. Required runtime

The result is Discord Rich Presence, not Discord Custom Status and not an arbitrary profile canvas.

Rich Presence is available only while:

1. Discord Desktop is running;
2. the local Spotify Vibe companion is running;
3. Discord activity sharing is enabled.

The app cannot provide persistent Rich Presence from a hosted website alone.

## 3. Product surfaces

### Local Presence Studio

A local web interface used to create Scenes, assign daily time slots, preview the Discord output, and control the scheduler.

Scene customization MUST follow one clear journey:

1. **Choose a Scene** from the Scene library.
2. **Personalize the essentials** that people will see first.
3. **Review the editing preview and show or update the Scene on Discord.**

Daily Time Slots, scheduler health, and Background Companion controls remain available, but they are secondary to this customization journey.

### Background Companion

A local Windows process that stores configuration, watches the system clock, connects to Discord Desktop, and applies the correct Scene even when the Studio browser tab is closed.

### Discord Rich Presence

The constrained Discord-rendered activity card visible according to the owner's Discord privacy and activity-sharing settings.

## 4. Functional requirements

### PR-01 — Scene library

The owner MUST be able to create, edit, duplicate, and delete Scenes.

A Scene MAY configure the Discord fields already proven by the prototype:

- activity type;
- displayed activity name;
- details and state text;
- supported field URLs;
- large and small image or GIF assets;
- asset hover text and supported asset URLs;
- elapsed or remaining timestamp;
- up to two supported buttons.

The owner MUST be able to preview a Scene and apply it manually.

The Studio MUST distinguish these states without relying on color alone:

- the **Editing Scene** represented by the current form and editing preview;
- the **Live Scene** currently selected for Discord;
- whether the two are the same Scene;
- whether the Live Scene comes from a Manual Override or the daily schedule.

Scene buttons MUST expose a clear selected state to sighted and assistive-technology users. The default editor MUST keep Scene identity, activity identity, visible text, and primary artwork immediately available. Optional field links, artwork metadata and small artwork, timers, and buttons MUST use progressive disclosure with a nearby summary of whether each option is off or configured.

The Studio MUST render the selected Scene in a Discord-style profile-card mockup from the current form state. The mockup MUST:

- be labelled as an **Editing Preview**, not as proof that the current form is already live on Discord;
- update immediately when a previewable Scene field changes, without waiting for the debounced local autosave or a manual **Save now** action;
- reflect the Scene name, activity label, details, state, artwork, timer, and supported button labels;
- highlight the related preview element while an editor field has focus;
- remain visible in a sticky right-side rail while the editor scrolls on wide desktop layouts;
- reflow after the Scene library and editor at narrower widths without placing content beyond the CSS viewport.

The editor MUST provide a sticky action area containing explicit local-save feedback and one dominant **Show on Discord** or **Update on Discord** action. Autosave feedback MUST distinguish unsaved, saving, saved, invalid, and failed states. Validation MUST appear beside the affected field with a recovery instruction. When an invalid field is inside a closed disclosure, the Studio MUST open that disclosure and move focus to the first invalid field after a manual save or Discord action.

The mockup is an editing aid rather than a pixel-perfect promise of Discord output. Discord retains control of final text truncation, media cropping, animation, and profile-card layout.

### PR-02 — Daily Time Slots

The owner MUST be able to assign a local start time and one Scene to each Daily Time Slot.

Daily Time Slots:

- repeat identically every day;
- use the Windows system's current local time;
- do not contain dates, events, appointments, or calendar records;
- MUST have unique start times;
- MUST be displayed in chronological order;
- MAY be enabled or disabled individually.

A Scene remains active from its slot's start time until the next enabled slot begins. The last slot of a day remains active through midnight until the first enabled slot of the next day.

This continuous start-time model means there are no schedule gaps and no separate end-time field.

### PR-03 — Clock-based scheduler

The Background Companion MUST:

- determine the active slot when it starts;
- apply the correct Scene immediately after connecting to Discord;
- wait until the next slot boundary;
- apply the next Scene at that boundary;
- recompute the active and next slots when the configuration or Windows clock changes;
- avoid periodic rapid Scene rotation.

The existing interval-based rotation is a prototype feature and is not part of the approved experience. The clock-based scheduler SHOULD replace it in the primary UI.

### PR-04 — Local persistence

Scenes, Daily Time Slots, scheduler state, and settings MUST be stored on the local computer.

The scheduler MUST NOT depend on browser localStorage because it must recover configuration before the Studio page opens.

Configuration MUST survive:

- closing the browser;
- restarting the companion;
- restarting Discord;
- restarting Windows.

No cloud database or online account is required.

### PR-05 — Windows automatic startup

The companion MUST support launching automatically when the owner signs in to Windows.

Automatic startup is the approved default. The owner SHOULD be able to disable it from settings.

The companion MUST continue running in the background after the Studio browser tab is closed.

### PR-06 — Discord reconnection

If Discord is unavailable or restarts, the companion MUST:

- remain running;
- retry the local Discord connection using bounded backoff;
- show a disconnected state rather than silently failing;
- apply the currently correct Scene after reconnection.

### PR-07 — Manual override

The owner MUST be able to apply any Scene as a temporary Manual Override.

The default override behavior is:

- activate immediately;
- remain active until the next enabled Daily Time Slot begins;
- then return automatically to the daily schedule.

The owner MUST also be able to cancel the override early and resume the schedule.

**Show on Discord** MUST save the Editing Scene and activate it as the Manual Override. When the Editing Scene is already the Live Scene, the action MUST be labelled **Update on Discord**. Both actions retain the same next-slot expiry contract; they do not create a permanent override. Local autosave and Discord activation MUST remain conceptually distinct in the interface even though saving the currently Live Scene may refresh its Rich Presence output.

### PR-08 — Scheduler controls and health

The Studio MUST show:

- Discord connection state;
- scheduler running or paused state;
- current active Scene;
- whether a Manual Override is active;
- next scheduled Scene and switch time;
- last successful update or latest actionable error.

The owner MUST be able to:

- pause or resume scheduling;
- apply a Scene manually;
- cancel a Manual Override;
- clear Rich Presence;
- enable or disable Windows automatic startup.

Runtime controls MUST remain visually secondary to Scene customization. The Studio MUST continue to show the Editing Scene and Live Scene names near the editor so the owner does not need to infer the relationship from the scheduler panel. Discord actions MUST expose progress, prevent accidental duplicate submission while pending, and report a nearby actionable error without discarding locally edited values.

### PR-09 — Asset handling

The prototype's support for Discord application asset keys and stable public HTTPS image or GIF URLs MAY be retained.

Local image files cannot be sent directly through Discord Rich Presence. Building an upload, image hosting, or asset-generation service is out of scope.

### PR-10 — In-Studio GIF browser and search

The owner MUST be able to browse and search for GIFs inside the Studio instead of finding and copying a URL manually.

The implemented provider uses the official GIPHY Trending and Search APIs. The Studio MUST:

- expose **Find GIF** beside both the large and small artwork fields;
- open directly into a populated trending feed without asking the user for an API key or requiring an initial query;
- update results automatically after the user pauses typing;
- request paginated result batches and append the next page when the result grid is scrolled near its end;
- keep a visible **Load more GIFs** control as an accessible fallback;
- preserve previously loaded results and deduplicate appended items by GIPHY ID;
- restore the trending feed when the search query is cleared;
- show animated search results with visible **Powered by GIPHY** attribution;
- insert the selected result's public HTTPS URL into the intended artwork field;
- preserve existing hover text, or use the GIF title only when that hover field is empty;
- update the local preview and save the Scene after selection;
- report missing or rejected keys, provider rate limits, timeouts, and network failures clearly.

The picker MUST behave as an accessible modal dialog: it receives initial focus, keeps keyboard focus inside while open, makes the Studio background inert, closes with **Escape** or its visible close controls, restores focus to the originating **Find a GIF** control, and announces loading or provider errors through nearby status content.

The local companion owns the GIPHY request so the key is not placed in browser code. The app owner performs one-time setup outside the user-facing picker. The setup command reads the copied key from the Windows clipboard, stores it in `%APPDATA%\Spotify Vibe\app-secrets.json`, and clears the copied key from the clipboard after a successful save.

The app-owned secret:

- MUST remain separate from `presence-config.json`;
- MUST NOT be retrievable, replaceable, or removable through browser endpoints;
- MAY be supplied through `GIPHY_API_KEY` as an environment fallback;
- MUST NOT be bundled with the repository;
- SHOULD use short-lived query-and-page caching to protect the shared provider quota.

GIPHY beta keys are currently free and limited to 100 searches/API calls per hour. A future hosted multi-user version would keep the key in its server secret store and own provider rate limiting; users would still receive the same keyless picker experience.

GIF search requires an internet connection and does not change Discord's asset constraints. The selected result is still a stable public HTTPS media URL sent through Discord Rich Presence; Spotify Vibe does not upload or host the media.

## 5. Approved default behavior

- Time format: local 24-hour time in stored configuration.
- Recurrence: the same slots every day.
- Time zone: current Windows local time zone.
- Daylight-saving or manual clock change: recompute the active slot.
- Before the first slot: use the previous day's last enabled slot.
- Scheduler with no enabled slots: remain paused and do not invent a Scene.
- Manual override: expires at the next enabled slot boundary.
- Companion restart: recover the schedule and apply the currently correct Scene.
- Discord reconnect: apply the currently correct Scene.

## 6. Explicit non-goals

The approved scope excludes:

- calendar UI;
- calendar dates or appointments;
- weekday-specific or date-specific schedules;
- Google Calendar or any third-party calendar integration;
- AI agents, coaching, or life management;
- projects, backlogs, tasks, habits, or productivity tracking;
- Pomodoro and application or website blocking;
- Spotify Web API or Spotify account connection;
- music analytics or taste profiles;
- public dashboards or public profile pages;
- Discord bots, server features, or group focus rooms;
- account registration, login, OAuth, or multiple users;
- cloud synchronization or multi-device support;
- subscriptions, billing, paid plans, or a marketplace;
- mobile, macOS, or Linux support;
- automatic Discord avatar, banner, bio, or Custom Status modification;
- arbitrary HTML, CSS, or interactive canvas content inside a Discord profile.

## 7. Existing prototype reuse

The existing Presence Studio already demonstrates:

- real local Discord RPC connection;
- Scene creation and editing;
- Discord-supported text, images, GIFs, timers, links, and buttons;
- live preview and manual apply;
- browser-local Scene persistence;
- interval-based rotation.

Current work should extend this prototype rather than rebuild the website showcase.

The required implementation delta is:

1. replace interval rotation with recurring Daily Time Slots;
2. move authoritative configuration from browser storage to local companion storage;
3. add Windows automatic startup and background operation;
4. add Discord reconnect and Scene reapplication;
5. add Manual Override behavior;
6. add scheduler health and next-switch information;
7. add app-owned GIPHY search with a keyless user-facing picker;
8. keep the current form preview visible as a sticky desktop profile-card dock with responsive reflow;
9. refine the Studio into the guided Choose → Personalize → Review and show journey with progressive disclosure, Editing-versus-Live context, inline recovery, and accessible modal focus behavior.

## 8. Acceptance criteria

The personal app is complete when all of the following are true:

- [x] The owner can create at least four customized Scenes.
- [x] The owner can assign each Scene to a different daily start time.
- [x] Starting the companion at any time applies the correct Scene.
- [x] Reaching a slot boundary changes Discord Rich Presence without opening the Studio.
- [x] Closing the browser does not stop scheduling.
- [x] Configuration survives a Windows restart.
- [x] The companion starts automatically after Windows sign-in.
- [x] Restarting Discord triggers automatic reconnection and correct Scene reapplication.
- [x] A Manual Override activates immediately and returns to the schedule at the next boundary.
- [x] Scene edits update the Discord-style profile-card mockup immediately, and the preview remains usable across wide and narrow Studio layouts.
- [x] The Studio presents the Choose → Personalize → Review and show journey and clearly distinguishes the Editing Scene from the Live Scene.
- [x] Optional links, artwork details, timers, and buttons use progressive disclosure with configured-state summaries.
- [x] Autosave and Show/Update on Discord provide separate, nearby progress and recovery feedback.
- [x] Invalid fields receive inline guidance, and a hidden invalid field reopens its disclosure and receives focus.
- [x] Scene selection and GIF browsing remain keyboard-operable, including selected-state semantics, modal focus containment, Escape close, and opener-focus restoration.
- [x] Narrow Studio layouts render the Scene library before the editor and the editing preview after it, without horizontal overflow.
- [x] The Studio reports current Scene, next switch, connection state, and actionable failures.
- [x] The owner can search GIPHY and select a GIF for either large or small Scene artwork.
- [x] The GIF picker opens with trending results and appends deduplicated pages while the owner scrolls.
- [x] A saved GIPHY key stays local and is omitted from normal Studio configuration responses.
- [x] No calendar, productivity, account, cloud, or commercial feature is required.

Verification on July 16, 2026 included 28 passing automated tests, passing companion-script lint, a passing production build, real Studio interaction checks, a live `12:00` slot boundary with the browser closed, and a real Discord Desktop restart followed by automatic reconnection and Scene reapplication. The GIF picker was verified with deterministic provider responses for app-secret privacy, owner-managed unconfigured behavior, search-as-you-type, large/small target selection, preview updates, and autosave. A live provider-backed run then verified the installed app-owned beta key, 16 automatically loaded GIPHY results without pressing Search, large-artwork selection, preview parity, preserved hover text, autosave and reload persistence, restoration of the original Scene, a keyless small-artwork picker, visible attribution, zero browser console errors, and a no-horizontal-overflow layout at `320 × 568`. Local configuration reload and the actual Windows Startup launcher were verified; a Windows sign-out or reboot was not forced during the verification session.

Pagination verification opened the picker with an empty query and received a scrollable 16-item trending feed, then scrolled near the end and observed 32 retained results with 32 unique GIPHY IDs. The same live-provider check searched for `focus`, observed 16 results, scrolled to 32 retained unique IDs, and cleared the query to restore the trending feed. A keyboard-accessible load-more fallback remained available, the modal fit a `320 × 568` CSS viewport with a two-column result grid and no horizontal overflow, and the final Studio console contained zero errors.

Live-preview verification changed the Scene name, activity type, details, state, and first button label individually and observed the matching mockup output after each edit. Every original value was restored, the `650 ms` debounced save completed, and a reload confirmed that both form and preview retained the restored values. At a `1434 px` CSS viewport, `.day-panel` computed to `position: sticky`, `top: 64px`, and its own vertical scrolling; responsive checks confirmed the three-column rail at `1180 px`, the stacked layout at `760 px`, and no content extending beyond a `320 × 568` CSS viewport. The final Studio console contained zero errors.

The credential-handling audit revoked the initial verification key after it appeared in an automation DOM snapshot. Its replacement was copied and installed without reading or displaying its value, the setup command confirmed clipboard clearing, an exact-key scan found zero workspace matches, normal browser responses contained no credential, and browser credential-management endpoints remained unavailable. A fresh uncached provider query and a second keyless Studio search both passed after the companion restarted with the replacement app secret.

Customization-journey verification on July 16, 2026 confirmed the Choose → Personalize → Review and show navigation, explicit Editing-versus-Live Scene names, dynamic Show/Update on Discord labels, and `aria-pressed` Scene selection. Focus on activity and artwork fields highlighted the matching preview elements. A deliberately invalid HTTP field link was placed inside a closed disclosure; **Save now** reopened the disclosure, focused the field, and showed an HTTPS recovery message beside it. The original empty value was then restored, autosaved, and confirmed through the local configuration API. The GIF picker opened with 16 trending results and search focus, made the Studio background inert, contained backward keyboard focus, closed with **Escape**, and restored focus to **Find a GIF**. Browser-client checks at `375`, `768`, `1024`, and `1440` CSS-pixel widths found no horizontal overflow; the narrow layout ordered Scene library → editor → preview and operations, the intermediate rails used two or three columns as intended, and the wide operations rail remained sticky. The final browser console contained zero errors. The automated gates remained 28 passing tests, passing `npx eslint scripts`, and a passing production build.

## 9. Recommended implementation order

1. Define the local Scene, Daily Time Slot, and Settings configuration file.
2. Implement active-slot and next-boundary calculation with midnight coverage.
3. Replace interval rotation endpoints and controls with daily scheduling.
4. Add local persistence and startup recovery.
5. Add Discord reconnect with correct Scene reapplication.
6. Add Manual Override.
7. Add Windows automatic startup.
8. Add app-owned GIPHY search and a keyless Studio picker.
9. Add health information and final end-to-end tests.
10. Refine the customization journey, progressive disclosure, validation recovery, responsive order, and keyboard focus behavior.

## 10. Related technical source

Discord platform limitations and verified Rich Presence behavior remain documented in the [Discord Integration Source of Truth](./DISCORD_INTEGRATION_SOURCE_OF_TRUTH.md).

If a future request conflicts with this file, ask whether the owner is explicitly changing the approved personal-app scope before adding the conflicting feature.
