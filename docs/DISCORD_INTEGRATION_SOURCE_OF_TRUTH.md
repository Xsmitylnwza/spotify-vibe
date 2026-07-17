# Discord Integration — Source of Truth

> **Status:** Research baseline; product experience pending a Member decision  
> **Discord documentation last verified:** July 15, 2026  
> **Scope:** A hosted multi-member service in which a Member may link Discord and share a Member-controlled music-identity page without cloning or deploying this project

This document records what Discord's official platform supports for the product. If it conflicts with current official Discord documentation, the official documentation wins and this file MUST be updated.

## 1. Executive verdict

The hosted product model is feasible:

1. A Member creates or signs in to an account on this website.
2. The Member connects Spotify through Spotify OAuth.
3. The Member may link their Discord identity through Discord OAuth2.
4. The service publishes the Member's configured Taste Profile and may expose it in Discord through an installed app/bot.

However, **linking a Discord account does not grant a hosted website permission to arbitrarily edit that person's Discord profile, custom status, or live activity**.

Discord's ability to render a card does not grant permission to transfer Spotify data into Discord. Unless Spotify separately permits the exact disclosure, Discord cards MUST use Member-authored content, service-owned presentation, and official outbound links rather than derived Spotify profiles or analytics.

| Intended Discord experience | Hosted web service only? | Verdict |
|---|---:|---|
| Link a Member's Discord identity | Yes | Use Discord OAuth2, normally with the minimal `identify` scope |
| Post a Taste Profile card and hosted-profile link through a bot or slash command | Yes | Recommended first integration |
| Verify Taste Profile attributes for a server role | Yes | Use Linked Roles; this is guild-specific |
| Continuously show Taste Profile data as Rich Presence on the Member's Discord profile | No | Requires a user-side Discord-connected runtime, Discord Activity, or another supported Rich Presence integration |
| Change a Member's arbitrary custom status or global Discord profile from the backend | No | Discord does not expose this as a general hosted-app capability |

Discord documents the `activities.write` OAuth2 scope as not currently available for applications. A backend MUST NOT treat Discord OAuth as permission to impersonate the Member or set arbitrary presence.

## 2. Supported product paths

### Path A — Discord Share Card and Music Identity Page link (recommended for the alpha)

- The Member links Discord to their account on this service.
- A Discord app/bot is installed in a participating server.
- A slash command such as `/vibe` returns an embed containing approved Member-authored music-identity data and a link to the hosted public page.
- The hosted service remains the source of truth; Discord is a sharing surface.

This path works without a local companion application and matches the hosted SaaS model.

### Path B — Discord Linked Role

- The Member authorizes the `role_connections.write` scope.
- The service publishes supported metadata about that Member's Music Identity Page.
- Administrators of participating Discord servers may configure role requirements using that metadata.

Linked Roles are useful for community membership or badges inside a guild. They are **not** a general-purpose global profile showcase and do not replace Rich Presence.

### Path C — profile-visible Vibe Presence

Discord Rich Presence can display an app-defined activity when another person inspects the Member's profile. Discord documents visibility in user profiles, friend lists, and server member lists when activity sharing is enabled.

A Rich Presence uses Discord's fixed layout rather than an arbitrary HTML canvas. Supported data includes:

- application/activity name;
- `details` and `state` text;
- elapsed or remaining timestamps;
- large and small artwork;
- hover text and clickable field/image URLs;
- up to two buttons visible to other people; current Activity button labels are limited to 1–32 characters and URLs to 1–512 characters.

Discord currently recommends 1024×1024 Rich Presence assets. An app may use uploaded application assets or external image URLs with the required dimensions and size; current documentation also permits GIF, animated WebP, and AVIF for external assets. This means the service can generate a Member-specific visual image, but Discord controls its final size, crop, surrounding layout, and visibility.

#### Hosted backend only — not feasible

Ordinary Discord OAuth does not let the backend set this presence. The `activities.write` scope is documented as unavailable for apps. Account linking or a running bot is therefore insufficient.

#### Local companion — feasible

A small Member-installed desktop companion can use Discord Social SDK Direct Rich Presence through local RPC:

1. Member designs a Vibe Presence on the hosted editor.
2. The service stores the approved text, links, theme, and generated external asset URL.
3. The local companion signs in to this service and reads that configuration.
4. While both the companion and Discord desktop client are running, the companion calls Discord Rich Presence locally.
5. Other people may see the result directly when inspecting the Member's Discord profile; they do not need to open this website.

Discord documents that the direct, unauthenticated RPC path requires a registered Discord Application ID and a running Discord desktop client. It does not work through Discord mobile, console, or web clients. Distribution and tester/approval requirements MUST be verified in the Developer Portal before public release; Discord's RPC documentation currently describes a 50-tester allowance for unapproved RPC apps.

The presence disappears or becomes stale when the required user-side runtime is not running. Discord privacy/activity-sharing settings and Discord's activity ordering remain outside this service's control.

#### Discord Activity — feasible only while opened

A Discord Activity is a web app running in an iframe inside Discord on desktop, mobile, and web. It can render a true interactive canvas and call `setActivity()` to show Rich Presence after the Member launches and joins the Activity. It is not a persistent profile widget: the Activity must be launched, and its Rich Presence represents what the Member is doing in that running Activity.

#### Unsupported promise

The service MUST NOT promise a permanent custom profile panel, banner, avatar decoration, or install-free Canvas Status controlled by the backend. Choosing Vibe Presence adds a separate client product, installers and updates, platform support, runtime availability, moderation of Member-generated assets, and Discord distribution review.

## 3. Security and privacy baseline

- Discord OAuth callbacks MUST validate `state` and use an exact registered redirect URI.
- Discord access and refresh tokens MUST remain server-side and be encrypted at rest.
- The service MUST request only the scopes needed by the enabled Discord feature.
- Linking Discord MUST be optional unless Discord becomes the selected sign-in method.
- A Member MUST be able to unlink Discord and remove Discord-derived account data.
- Public cards and presence MUST contain only Music Identity fields that the Member has enabled for public sharing.
- Bot commands, Linked Role updates, and local-companion configuration MUST verify that the Discord identity is linked to the same Member whose Music Identity Page is being accessed.

## 4. Product decision still required

“Connect to Discord Profile” is ambiguous and MUST be resolved to one primary outcome:

1. Share Card + hosted Music Identity Page link
2. Guild-specific Linked Role
3. Vibe Presence through a local companion or a launched Discord Activity

The recommended core remains **Share Card + hosted music-identity link** because it requires no install. A Windows-first Vibe Presence companion MAY be tested as a separate hero-feature experiment for up to ten invited Members. It is not a capability of ordinary Discord OAuth and MUST NOT replace the no-install fallback.

## 5. Monetization constraints

Discord permits apps and bots to sell premium functionality through recurring user subscriptions, guild subscriptions, and supported one-time purchases. Discord also permits external billing through a website or services such as Patreon or Ko-fi.

### Thailand-based seller baseline

- Discord Premium Apps are currently available only to developers based in the United States, United Kingdom, or European Union.
- A Thailand-based developer or entity therefore cannot currently use Discord-native checkout and is exempt from the native-purchase requirement while the region remains unsupported.
- External website billing is the approved initial path. Seller eligibility MUST be rechecked if the legal entity or team-owner location changes.

### If native Premium Apps becomes available

- The app must be verified and team-owned; the team owner must satisfy age, email, two-factor authentication, payout, public Terms of Service, Privacy Policy, and other eligibility requirements.
- Equivalent paid digital benefits that Discord Premium Apps can support must also be sold through Discord, and the final Discord price must be no higher than the equivalent external price.
- Genuine donations remain distinct from paid benefits; a “tip” MUST NOT secretly unlock premium functionality.
- Discord documents a 15% Growth Tier platform fee on the first USD 1 million in cumulative Premium Apps sales, followed by a 30% Standard Tier fee, plus a documented 6% desktop/browser processing fee and possible tax, foreign-exchange, refund, dispute, and other deductions.
- The first payout requires at least USD 100 in eligible earnings and manual review; later payouts have a USD 25 minimum.

### Product rules

- Premium value MUST be independent application functionality such as Member-authored presentation, themes, hosting, profile URLs, and Discord card layouts.
- The service MUST NOT sell or commercialize Discord API Data.
- The service MUST NOT promise hosted Rich Presence or automatic custom-status changes; `activities.write` remains unavailable.
- Upsells in Discord MUST be contextual and MUST NOT use unsolicited direct messages or spam.

For a low-margin Thailand-based alpha, external billing through a global Merchant of Record is the recommended approach. Native Discord billing should be reconsidered only when regional eligibility changes or the seller uses an eligible legal entity.

## 6. Official sources

1. [Discord OAuth2](https://docs.discord.com/developers/topics/oauth2)
2. [Application Role Connection Metadata](https://docs.discord.com/developers/resources/application-role-connection-metadata)
3. [Configuring App Metadata for Linked Roles](https://docs.discord.com/developers/tutorials/configuring-app-metadata-for-linked-roles)
4. [Setting Rich Presence with the Discord Social SDK](https://docs.discord.com/developers/discord-social-sdk/development-guides/setting-rich-presence)
5. [Discord Monetization Overview](https://docs.discord.com/developers/monetization/overview)
6. [Enabling Monetization](https://docs.discord.com/developers/monetization/enabling-monetization)
7. [Implementing App Subscriptions](https://docs.discord.com/developers/monetization/implementing-app-subscriptions)
8. [Required Support for Monetizing Apps](https://support-dev.discord.com/hc/en-us/articles/23810643331735-Premium-Apps-Required-Support-for-Monetizing-Apps)
9. [Premium Apps Payout](https://support-dev.discord.com/hc/en-us/articles/17299902720919-Premium-Apps-Payout)
10. [Discord Monetization Terms](https://support.discord.com/hc/en-us/articles/5330075836311-Monetization-Terms)
11. [Discord Developer Policy](https://support-dev.discord.com/hc/en-us/articles/8563934450327-Discord-Developer-Policy)
12. [Create Message](https://docs.discord.com/developers/resources/message#create-message)
13. [Interaction Responses](https://docs.discord.com/developers/interactions/receiving-and-responding)
14. [Rich Presence Overview](https://docs.discord.com/developers/platform/rich-presence)
15. [Setting Rich Presence with the Discord Social SDK](https://docs.discord.com/developers/discord-social-sdk/development-guides/setting-rich-presence)
16. [Setting Rich Presence with the Embedded App SDK](https://docs.discord.com/developers/rich-presence/using-with-the-embedded-app-sdk)
17. [How Discord Activities Work](https://docs.discord.com/developers/activities/how-activities-work)
18. [Discord RPC](https://docs.discord.com/developers/topics/rpc)

## 7. Update policy

Review this document when Discord changes OAuth scopes, Linked Roles, Rich Presence, Social SDK availability, app installation behavior, or when the product selects a different Discord experience.
