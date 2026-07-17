# Vibe Wardrobe Premium Direction — Parked Product Specification

> **Status:** Historical parked direction; not part of the current [Personal Scheduled Presence scope](./PERSONAL_SCHEDULED_PRESENCE_SOURCE_OF_TRUTH.md)
>
> **Decision date:** July 15, 2026
>
> **Primary market:** English-first international Discord Nitro members
>
> **Product mode:** Hosted editor plus an optional Member-installed desktop companion
>
> **Commercial dependency:** Paid value must remain useful without Spotify OAuth

This document preserves a future premium product direction so that a later human or AI contributor can resume it without reconstructing the product reasoning. It complements, but does not replace, the current [Music Identity Product Requirements](./PRODUCT_REQUIREMENTS_SOURCE_OF_TRUTH.md).

Until this direction is explicitly resumed, the current MVP and platform constraints remain authoritative. No item in this document should be treated as committed scope merely because it is described here.

## 1. Decision summary

The current Discord Rich Presence Studio proves that a Member can edit and apply Discord Rich Presence fields. That editor alone is not a defensible paid product: free tools can expose the same Discord fields, and adding more form controls does not create a premium outcome.

The preserved direction is to reposition the experience from a **Spotify status editor** to a **programmable Discord identity wardrobe**:

> **Give your Discord identity an outfit for every vibe.**

Working product name: **Vibe Wardrobe**.

The product should let a Member choose a professionally designed identity set, personalize it, and have a local companion switch among approved Scenes according to the Member's schedule, mood, or local activity. Spotify may later be an optional, policy-compliant input, but it must not be the commercial foundation.

## 2. Initial paying segment

### Primary segment

Start with Discord Nitro members who already spend time or money on profile expression, especially people who:

- use animated avatars, banners, profile effects, or decorations;
- change their Discord identity for moods, seasons, fandoms, games, or music eras;
- participate frequently in music, gaming, anime, or aesthetic-focused communities;
- care about how their profile looks when friends or server members inspect it;
- are comfortable installing a small desktop companion for a visibly better result.

Do not target every Nitro subscriber. The useful beachhead is the identity-conscious subset with demonstrated customization behavior.

### Why creators and streamers are not the first segment

Rich Presence has limited and inconsistent promotional reach. It is visible mainly to friends and people who share a server, Discord controls its placement, and a viewer must notice the activity or inspect the profile. The product cannot safely promise impressions, follower growth, sales, or attributable return on investment.

Creators and streamers may still use the product, but creator acquisition should not be the first positioning or the basis of premium pricing unless a broader promotion and analytics product is later validated.

### Core job to be done

> “Make my Discord identity look intentionally designed and let it change with my mood or routine without rebuilding it every time.”

The Member pays for expression, convenience, exclusivity, continuity, and automation—not for access to raw Discord Rich Presence fields.

## 3. Product promise and boundaries

### Product promise

Vibe Wardrobe combines five kinds of value:

1. **Designed identity** — cohesive visuals created from curated Vibe Packs rather than developer-style configuration.
2. **Personalization** — Member-controlled art, text, links, timing, and presentation.
3. **Automation** — safe Scene changes based on explicit Member rules.
4. **Continuity** — cloud backup, synchronization, and reusable identity collections.
5. **Presence plus depth** — Rich Presence attracts attention; a hosted Music Identity Page and Discord Share Card provide the unrestricted canvas that Discord does not.

### Product boundaries

The product MUST NOT promise:

- an arbitrary HTML canvas embedded in a Discord profile;
- a permanent profile decoration or presence controlled only by the backend;
- Rich Presence while the companion or Discord desktop client is not running;
- automatic mutation of a Member's Discord avatar, banner, bio, or custom status;
- guaranteed profile views, clicks, reach, or creator revenue;
- per-second text or image replacement through Discord RPC;
- commercial value based on derived Spotify listening metrics, personality labels, compatibility scores, or inferred taste profiles.

## 4. Product surfaces

### 4.1 Hosted Wardrobe Studio

The website is the source of truth for the Member's Vibe Packs, Scenes, Rules, entitlement, and public identity. It should provide:

- Discord sign-in;
- a visual Vibe Pack gallery;
- guided personalization rather than raw URL-first forms;
- a realistic Discord Rich Presence preview;
- an automation timeline and Rule editor;
- a companion connection and health indicator;
- cloud storage and synchronization;
- a Music Identity Page and Discord Share Card preview;
- subscription and cosmetic-pack management.

### 4.2 Desktop Companion

The companion is required for profile-visible Direct Rich Presence. The first supported platform should be Windows. It should provide:

- secure sign-in and device authorization;
- Discord desktop detection and RPC connection health;
- explicit launch-at-startup control;
- Scene synchronization and local caching;
- a tray-based mood/Scene switcher;
- optional keyboard shortcuts;
- local evaluation of Member-approved Rules;
- pause, privacy, sign-out, and emergency clear controls;
- signed updates, crash recovery, and understandable diagnostics.

The companion MUST default to collecting no local activity history. Any active-application trigger must be opt-in, evaluated locally where feasible, and explain exactly what is read.

### 4.3 Discord Rich Presence

Discord Rich Presence is a constrained output surface. A Scene may configure only supported fields such as:

- activity type and displayed activity name where supported;
- details and state text;
- approved field URLs;
- large and small image assets, hover text, and supported URLs;
- elapsed or remaining timestamp;
- up to two supported buttons.

Discord controls final layout, cropping, caching, ordering, and visibility. External assets require stable public HTTPS delivery and must follow Discord's current format, dimension, and moderation requirements.

### 4.4 Music Identity Page and Share Card

The hosted page and `/vibe` Discord Share Card remain the no-install fallback and the place for richer self-expression. They may show only Member-authored, public content and service-owned analytics. They must remain useful when the companion is offline.

## 5. Premium value pillars

### 5.1 Designer Vibe Packs

A Vibe Pack is a cohesive, reusable identity set rather than a single GIF. Example launch themes may include:

- Y2K Player;
- Cyberpunk Night;
- Cozy Study;
- Anime Ending;
- Vinyl Collector;
- Dreamcore;
- Minimal Mono.

A pack may contain:

- one or more Rich Presence artwork treatments;
- large- and small-image compositions;
- motion presets;
- suggested copy and timer treatments;
- a matching hosted-page theme;
- a matching Discord Share Card style;
- downloadable avatar and banner exports for the Member to upload manually.

The service must own or license every distributed design asset. Member uploads require moderation, takedown, and storage controls.

### 5.2 Animated Identity Composer

The Member should be able to upload an authorized image and apply controlled motion presets such as:

- pulse or equalizer movement;
- floating particles;
- glitch;
- vinyl rotation;
- marquee text;
- countdown treatment;
- pixel movement;
- restrained color cycling.

The composer should generate a Discord-compatible asset and host it at a stable URL. It must not depend on copyrighted provider artwork unless use is separately authorized.

### 5.3 Smart Scenes and Rules

A **Scene** is one publishable Rich Presence configuration plus its matching identity treatment. A **Rule** selects a Scene based on an explicit Member condition.

Candidate Rules include:

- time of day;
- day of week;
- a calendar-like schedule authored inside the service;
- focus or countdown session state;
- a Member-selected mood;
- keyboard shortcut or tray action;
- an allow-listed local application being active;
- manual temporary override.

Rule evaluation must respect Discord rate limits and use conservative transition intervals. Smooth movement belongs inside an animated asset; Discord's native timestamp should handle elapsed or countdown motion.

### 5.4 Cloud Wardrobe

Premium continuity may include:

- multiple or unlimited Scenes subject to fair-use limits;
- multi-device synchronization;
- version history and restore;
- reusable Rule sets;
- private drafts;
- duplicate and remix flows;
- stable hosted assets;
- periodic premium pack drops;
- early access to new composer effects.

### 5.5 Fast daily control

The daily experience should not require reopening a complex editor. The Member should be able to:

- switch mood or Scene from the system tray;
- pause all Presence activity immediately;
- apply a temporary Scene for a chosen duration;
- see whether Discord and the companion are connected;
- return to the scheduled wardrobe with one action.

## 6. Experience direction

The current raw-field editor is an engineering tool and should remain available only as an optional advanced mode. The primary experience should use the wardrobe metaphor:

1. **Choose a Vibe Pack.**
2. **Personalize the artwork and words.**
3. **Create Day, Night, Gaming, Focus, or custom Scenes.**
4. **Choose when each Scene is worn.**
5. **Preview the exact supported Discord output.**
6. **Start Vibe and verify companion health.**

The interface should emphasize a large live identity preview, a visual Pack gallery, and a readable automation timeline. It should hide asset URLs, RPC field names, and implementation details from the default flow.

Premium must be visible as a better finished identity and an easier routine—not as disabled form controls with lock icons.

## 7. Commercial model

Use a hybrid model because cosmetic buyers may prefer one-time purchases while automation, hosting, and synchronization create recurring cost.

### Free

- Up to two Scenes;
- a small starter-pack catalog;
- manual Scene application;
- basic hosted identity page and standard Share Card;
- local-only or limited cloud persistence;
- visible service attribution.

Free must produce a result worth showing. It is the sharing and acquisition loop, not a broken trial.

### Vibe+ subscription — pricing hypothesis

- **USD 3.99/month**, or
- **USD 29/year**, with annual billing emphasized.

Candidate entitlements:

- expanded Scene and Rule limits;
- scheduled and local-context automation;
- cloud synchronization and version history;
- Animated Identity Composer;
- premium Vibe Pack library and periodic drops;
- matching profile and Share Card themes;
- private drafts;
- branding removal;
- early access and optional supporter marker.

### Founding Supporter validation offer

- **USD 19 for the first year**;
- limited to the first 20–50 paying Members;
- no lifetime promise;
- renewal terms disclosed before checkout.

### Cosmetic Pack store — later hypothesis

- One-time price target: **USD 4.99–9.99 per pack**;
- purchased packs remain usable after subscription cancellation, except for separately disclosed hosted or automation functionality;
- a creator marketplace should not launch until licensing, moderation, refunds, payouts, and demand are validated.

The product must never charge merely to expose raw Discord fields or basic current-song display. Discord already supplies native Spotify now-playing, and free Rich Presence utilities create a strong substitute.

## 8. Premium prototype slice

If this direction is resumed, do not begin by adding more fields to the current Studio. Build one end-to-end premium demonstration:

1. Present three highly finished Vibe Packs.
2. Let the Member upload one authorized image.
3. Generate one animated Rich Presence asset from a controlled preset.
4. Let the Member create Day, Night, and Gaming Scenes.
5. Configure one time Rule and one allow-listed local-application Rule.
6. Synchronize the configuration to the Windows companion.
7. Apply it to real Discord and expose connection health.
8. Show the matching hosted profile and `/vibe` Share Card.

This slice should demonstrate the paid outcome: a coordinated identity that changes automatically. It should not attempt a full marketplace, macOS support, or unrestricted free-form animation.

## 9. Validation plan and gates

### Concierge validation before full build

Recruit ten international Discord Nitro members who changed at least one profile visual recently. Manually help each person create a three-Scene wardrobe, then offer the Founding Supporter checkout before investing in broad automation.

Collect:

- installation completion;
- time to first real Presence;
- number of Scenes created;
- seven-day companion enablement;
- automation usage;
- whether the Member shows or shares the result;
- exact purchase objections;
- willingness to pay USD 19 for the first year.

### Minimum evidence to continue

Treat these as hypotheses, not guaranteed targets:

- at least 8 of 10 testers reach a real Discord Presence;
- at least 5 keep the companion enabled for seven days;
- at least 5 create or use more than one Scene;
- at least 3 pay the Founding Supporter price without a lifetime-access promise;
- privacy or installation concerns do not dominate the value feedback.

If fewer than three testers pay, investigate whether the problem is design quality, installation friction, weak automation value, or the underlying market before building more packs.

## 10. Technical and policy constraints

The following remain non-negotiable unless official platform rules change:

- Ordinary Discord OAuth cannot set a Member's Rich Presence; the local companion and Discord desktop client are required.
- The experience does not work as a persistent presence through Discord mobile, console, or web alone.
- Discord owns the Rich Presence layout and may crop, cache, reorder, or suppress fields.
- Activity sharing and privacy settings remain under the Member's control.
- The app must provide a clear Presence-off control and remove stale Presence on sign-out where technically possible.
- External animated assets require public HTTPS hosting, cache strategy, moderation, and deletion behavior.
- Any Discord RPC distribution, tester limit, approval, or Social SDK requirement must be rechecked immediately before public distribution.
- Spotify Development Mode is not a commercial foundation. Spotify-derived profiles, inferred metrics, and commercialized Spotify content remain out of scope without separate written authorization and policy review.
- Avatar and banner exports are files for manual Member upload; the product must not imply it can automatically change those Discord profile fields.

Read this section with the [Discord Integration Source of Truth](./DISCORD_INTEGRATION_SOURCE_OF_TRUTH.md) and [Spotify Integration Source of Truth](./SPOTIFY_INTEGRATION_SOURCE_OF_TRUTH.md).

## 11. Explicit non-goals for the first paid experiment

- A general-purpose no-code Rich Presence builder;
- arbitrary HTML or CSS inside Discord;
- automatic Spotify listening analysis;
- per-second Scene rotation;
- a mobile companion;
- macOS and Linux support before Windows retention is proven;
- a public theme marketplace;
- creator ROI dashboards;
- server administration or B2B community plans;
- automatic avatar, banner, or custom-status mutation;
- lifetime pricing.

## 12. Open decisions when work resumes

Before implementation, the product owner must decide:

1. Whether **Vibe Wardrobe** is the final public name or only the internal concept name.
2. Which three Vibe Packs best represent the first target cohort.
3. Whether the companion uses the currently proven RPC library or Discord's then-current recommended Social SDK path.
4. Exact fair-use limits for generated and hosted animated assets.
5. Whether Vibe+ includes all premium packs or provides a monthly pack credit.
6. Which local application triggers are valuable enough to justify privacy and support complexity.
7. Whether the hosted Music Identity Page remains the primary product or becomes a supporting surface.
8. Which country, tax, and billing provider constraints apply at launch time.

## 13. Resume checklist for a future contributor

When asked to resume this direction:

1. Re-read this specification and all linked source-of-truth documents.
2. Recheck current Discord RPC, Social SDK, monetization, asset, and distribution documentation.
3. Recheck Spotify platform and commercial-use rules before adding any Spotify dependency.
4. Inspect the existing Presence Studio and companion prototype before proposing architecture.
5. Validate the target cohort and three launch packs with real Nitro members.
6. Build only the premium prototype slice in Section 8.
7. Record new evidence and product-owner decisions in the source-of-truth documents.

## 14. Relationship to the current roadmap

This direction is a candidate post-validation evolution of the optional Vibe Presence companion. It does not replace the current provider-neutral Music Identity Page and `/vibe` Share Card plan unless the product owner explicitly approves that pivot after payment validation.

Review this specification when the product direction is resumed, Discord changes Rich Presence capabilities, a paid validation test completes, or the target segment changes.
