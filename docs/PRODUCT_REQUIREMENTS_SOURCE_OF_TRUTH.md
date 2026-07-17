# Music Identity Product Requirements — Source of Truth

> **Status:** Historical commercial proposal; superseded for current work by the [Personal Scheduled Presence Source of Truth](./PERSONAL_SCHEDULED_PRESENCE_SOURCE_OF_TRUTH.md)  
> **Last updated:** July 15, 2026  
> **Market:** English-first, international, Discord-native music fans  
> **Commercial scope:** Provider-neutral, Member-authored product that does not depend on Spotify OAuth

This document defines the recommended sellable product. It must be read with:

- [Personal Scheduled Presence Source of Truth](./PERSONAL_SCHEDULED_PRESENCE_SOURCE_OF_TRUTH.md) — current approved scope
- [Business Model Source of Truth](./BUSINESS_MODEL_SOURCE_OF_TRUTH.md)
- [Discord Integration Source of Truth](./DISCORD_INTEGRATION_SOURCE_OF_TRUTH.md)
- [Spotify Integration Source of Truth](./SPOTIFY_INTEGRATION_SOURCE_OF_TRUTH.md)
- [Vibe Wardrobe Premium Direction](./VIBE_WARDROBE_PREMIUM_SPEC.md) — parked future direction, not committed MVP scope
- [Domain Language](../CONTEXT.md)

Normative language:

- **MUST / MUST NOT** — required for the MVP, safety, or platform compliance.
- **SHOULD / SHOULD NOT** — recommended default.
- **MAY** — optional or later.

## 1. Product thesis

The product helps a Member create a visual, self-authored music identity and share it into Discord in one command.

> **Build your music identity. Drop it into Discord.**

The working product surface is a **Music Identity Page**. The Discord representation is a **Share Card**. These are proposed terms pending an update to the domain glossary.

The core job:

> “Help me make my music identity look like me and share it in Discord without turning my listening history into another statistics dashboard.”

The product MUST remain useful without Spotify, Apple Music, or any other provider API. Music-provider URLs are outbound references selected by the Member.

## 2. Differentiation

### Positioning

The product does not compete on knowing more about a listener. It competes on letting the listener express more with less friction.

It should feel like **a music-native profile builder launched from Discord**, not a Spotify clone, a scrobbling database, or a generic link-in-bio page.

### Five differentiators

1. **Human-authored, not algorithm-inferred**  
   Members decide what represents them. The service does not assign taste scores, personalities, compatibility, or inferred labels.

2. **Discord-first sharing**  
   A Member can turn the current version of their identity into a polished `/vibe` Share Card and hosted-page link without taking screenshots.

3. **Provider-neutral**  
   A single collection may link to Spotify, Apple Music, YouTube, SoundCloud, Bandcamp, or another allowlisted music destination.

4. **Visual storytelling, not only statistics**  
   A Member combines collections, notes, colors, layout, and a featured “Current Vibe” into a persistent identity.

5. **Explicit control and privacy**  
   Nothing is inferred or shared automatically. Members choose what is public, when to publish, and when to invoke the Discord command.

### Competitive position

| Alternative | Primary value | Gap this product addresses |
|---|---|---|
| Discord native Spotify connection | Free current-track activity | No persistent curated identity, story, or cross-provider page |
| .fmbot / Last.fm Pro | Listening history, statistics, commands, and power-user depth | This product emphasizes visual self-expression and deliberate curation rather than data depth |
| stats.fm / volt.fm | Spotify-oriented shareable profiles and analytics | This product is provider-neutral and Discord-first, with no required listening-history ingestion |
| Receiptify-style generators | One viral share artifact | This product is a living page with repeatable sharing and paid customization |
| Carrd / Linktree | Generic hosted identity and links | This product provides music-native collections and a first-class Discord command/card |

The combination is a positioning gap, not a technical moat. Defensibility must come from recognizable templates, the Share Card acquisition loop, community adoption, Member-created identities, and trusted privacy—not from exclusive access to music data.

## 3. Roles

### Member

A person who signs in, authors a Music Identity Page, and may share it through Discord. This reuses the existing domain term.

### Visitor

A person who views a published Music Identity Page without signing in. This reuses the existing domain term.

### Supporter

A Member with an active paid entitlement. Supporter is a commercial state, not a separate identity or role.

### Operator

The person maintaining invitations, moderation, billing support, and product operations. This is an implementation role and does not replace Member or Visitor in public product language.

## 4. Required MVP journeys

### Journey A — create and publish

1. Member selects **Sign in with Discord**.
2. Member accepts the Terms and Privacy Policy.
3. Member selects a unique public handle and basic page identity.
4. Member creates one collection and adds music links, labels, and notes.
5. Member previews the page.
6. Member selects public, unlisted, or private visibility.
7. Member publishes.

### Journey B — share into Discord

1. A participating Discord server installs the app.
2. The linked Member invokes `/vibe`.
3. The service verifies the Discord identity and published-page visibility.
4. Discord receives a Share Card built only from Member-authored, public fields.
5. The card includes a button linking to the hosted page.

### Journey C — visit and convert

1. Visitor sees the Share Card in Discord.
2. Visitor opens the hosted page without authentication.
3. Visitor follows official outbound music links or selects **Create yours**.
4. Visitor may become a Member through Discord sign-in.

### Journey D — upgrade

1. Member sees a Supporter preview only after creating or sharing a Free page.
2. Member selects monthly, annual, or the limited Founding first-year offer.
3. External checkout completes.
4. A signed payment webhook grants the Supporter entitlement.
5. Member can manage or cancel the subscription.

## 5. Functional requirements

### PR-01 — Discord authentication

- The MVP MUST use Discord OAuth2 as the primary Member sign-in.
- OAuth callbacks MUST validate `state` and use an exact registered redirect URI.
- The service MUST request only the minimum identity scope required for sign-in.
- The Closed Alpha MUST remain invite-only until public onboarding and abuse controls are ready.
- Visitors MUST NOT be required to sign in.

### PR-02 — Member identity

A Member MUST be able to manage:

- unique public handle;
- display name;
- short bio;
- optional Member-owned profile image or a permitted Discord avatar reference;
- page visibility;
- active visual theme.

Text and URLs MUST be sanitized. Public handles MUST be normalized, unique, reserved-word protected, and safe for URLs.

### PR-03 — music collections

A collection MUST support:

- Member-authored title and description;
- ordered music items;
- one featured item;
- draft/public state;
- manual reordering;
- removal without affecting another collection.

Each music item MUST support:

- provider URL;
- Member-authored title;
- Member-authored creator/artist label;
- optional short note;
- provider type detected from an allowlist;
- explicit outbound-link action.

Initial allowlisted providers SHOULD include Spotify, Apple Music, YouTube, SoundCloud, and Bandcamp. The MVP MUST NOT require provider OAuth, scrape restricted metadata, stream audio, or depend on provider artwork.

### PR-04 — Current Vibe

- A Member MUST be able to manually select one item or collection as their **Current Vibe**.
- Current Vibe MUST NOT be labeled Now Playing unless it reflects an approved live integration.
- Current Vibe MUST NOT change automatically in the commercial MVP.
- The Discord Share Card SHOULD emphasize Current Vibe when one is selected.

### PR-05 — editor, preview, and publishing

- Editing MUST save as a draft before affecting the published page.
- Member MUST be able to preview desktop and mobile presentation.
- Publishing MUST be an explicit action.
- Unpublishing MUST remove the page from public access without deleting the draft.
- Validation errors MUST identify the exact field and preserve the Member's work.

### PR-06 — public Music Identity Page

Every published page MUST:

- have a stable HTTPS URL;
- render correctly on mobile and desktop;
- show only public Member-authored fields;
- expose official outbound music links clearly;
- include a safe, service-generated social preview image;
- provide a **Create yours** acquisition link on the Free tier;
- avoid music-provider artwork unless separately permitted;
- meet baseline accessibility for keyboard navigation, contrast, semantics, and reduced motion.

Visibility states:

- **Public** — viewable by anyone and MAY be discoverable later.
- **Unlisted** — viewable only by exact URL and excluded from discovery.
- **Private** — viewable only by the Member while authenticated.

Search-engine indexing SHOULD be disabled for Unlisted and Private pages.

### PR-07 — Discord Share Card

- The Discord app MUST support a user-triggered `/vibe` command in participating servers.
- The command MUST resolve the invoking Discord identity to exactly one Member.
- The default card MUST include display name, Current Vibe or selected collection, a short Member-authored note, and a hosted-page button.
- A Member with more than one collection SHOULD be able to select a collection from command options.
- A preview action SHOULD respond ephemerally before a public post.
- The card MUST contain only fields already approved for public display.
- The app MUST NOT change custom status, claim hosted Rich Presence, send unsolicited direct messages, or post automatically in the MVP.
- Music-provider attribution and links MUST be included whenever provider content is displayed under an approved integration.

### PR-08 — privacy and account control

A Member MUST be able to:

- change visibility at any time;
- unpublish immediately;
- disconnect optional integrations;
- delete the account and public page;
- request export of Member-authored data;
- understand which fields a Discord Share Card will expose before sharing.

The service MUST collect only data required for authentication, publishing, billing, abuse prevention, and product operation. Private drafts MUST never appear in public APIs or Discord responses.

### PR-09 — Free and Supporter entitlements

Recommended MVP packaging:

| Capability | Free | Supporter |
|---|---:|---:|
| Published pages | 1 | 1 |
| Collections | 1 | Up to 5 |
| Items per collection | Up to 10 | Up to 25 |
| Visual themes | 1 standard | At least 3 premium themes plus standard |
| Discord Share Card | Standard | Premium layouts and color choices |
| Service branding | Present | Removable |
| Drafts | Basic draft | Multiple collection drafts |
| Page views and outbound clicks | No detailed view | Basic first-party counts |
| Supporter badge | No | Optional |

Limits are launch hypotheses and MAY be adjusted after observing actual use. Downgrading MUST NOT silently delete Member content; excess content SHOULD become read-only until the Member reduces it or upgrades again.

### PR-10 — billing

- The MVP SHOULD use a global Merchant of Record, subject to seller eligibility.
- Payment checkout MUST occur on the provider's hosted checkout.
- Entitlements MUST be granted and revoked from verified webhooks, not browser redirects alone.
- Member MUST be able to view plan, renewal date, and management/cancellation link.
- The Founding offer MUST say “first year,” state its limit, and disclose renewal behavior clearly.
- Genuine tips MUST NOT secretly unlock paid benefits.
- Refund, cancellation, tax, and failed-payment behavior MUST be documented before taking money.

For the first ten paying Members, the Operator MAY use a hosted payment link plus manually reviewed entitlement assignment, provided every payment is reconciled and no browser claim alone grants access.

### PR-11 — first-party product analytics

The service MAY measure:

- page views;
- outbound-link clicks;
- Discord Share Card invocations;
- create-to-publish activation;
- publish-to-share activation;
- Free-to-Supporter conversion;
- account and subscription retention.

The service MUST NOT derive taste profiles, compatibility, listener rankings, or advertising segments from music-provider data.

### PR-12 — admin and safety

The Operator MUST be able to:

- issue and revoke Closed Alpha invitations;
- find a Member by internal ID or linked Discord ID;
- suspend a malicious public page without deleting evidence immediately;
- review reported pages and outbound links;
- manually reconcile a Founding Supporter entitlement;
- see payment webhook failures and operational errors;
- revoke sessions when an account is compromised.

Public pages MUST provide a report mechanism before unrestricted signup. URLs MUST be checked against supported schemes, an allowlist where appropriate, and known abuse patterns.

## 6. Non-functional requirements

### Security

- OAuth tokens, payment secrets, and signing secrets MUST remain server-side.
- Member-owned records MUST be isolated by Member ID.
- State-changing requests MUST be protected against CSRF or use equivalent same-site protections.
- Public APIs MUST return explicit DTOs rather than database records.
- Authentication, publishing, and Discord commands MUST be rate-limited.

### Reliability

- Public pages SHOULD remain readable if Discord is temporarily unavailable.
- A Discord command failure MUST return a useful private error rather than silently failing.
- Payment webhook processing MUST be idempotent.
- Publishing MUST not expose a partially written page.

### Performance

- A cached public page SHOULD become usable within two seconds on a typical mobile connection.
- Static assets SHOULD use a CDN.
- Share Card generation SHOULD reuse cached page data rather than rebuild provider data.

### Accessibility and international baseline

- The MVP MUST be usable with keyboard navigation and screen readers.
- Color MUST NOT be the only signal of state.
- English is the only required launch language.
- All stored timestamps MUST use UTC; localized display MAY be added later.

## 7. Explicit non-goals for the sellable MVP

The commercial MVP MUST NOT include:

- required Spotify OAuth;
- automatic Spotify Now Playing;
- Spotify-derived taste scores, compatibility, personality, rankings, or recaps;
- listening-history import or analysis;
- AI-generated taste summaries from provider data;
- full music streaming or a custom audio player;
- backend-only, install-free, or permanent Discord status/Rich Presence;
- unsolicited Discord DMs;
- automatic server posting;
- social feed, chat, comments, or follower system;
- Discord Linked Roles;
- custom domains;
- server-wide paid plan;
- native mobile application;
- localization beyond English.

These exclusions protect time-to-market and separate the paid product from unresolved provider-policy dependencies.

## 8. Post-validation features

Only consider these after at least ten paying Members and evidence of 30-day retention:

1. Scheduled rotation of Member-authored Current Vibe
2. Custom domains
3. More themes and a controlled template marketplace
4. Server-branded cards and community directories
5. Discord user-install and direct-message contexts where officially supported and useful
6. Provider-compliant link previews or metadata after a separate policy review
7. Discord Linked Roles for participating communities
8. Native Discord billing if the seller becomes regionally eligible
9. Additional languages based on actual paying-market concentration
10. A Windows-first Vibe Presence companion if the first cohort explicitly values profile visibility enough to install it

An approved Spotify connector remains a separate research track. It MUST NOT enter the commercial roadmap merely because the technical prototype works.

### Optional hero feature — Vibe Presence companion

This is the closest feasible version of a customizable “Canvas Status” visible when another person inspects a Discord profile.

The expanded Nitro-member positioning, premium experience, hybrid monetization model, and resume criteria are preserved in the [Vibe Wardrobe Premium Direction](./VIBE_WARDROBE_PREMIUM_SPEC.md). That document is a parked future specification and does not expand the committed MVP scope.

The feature would require:

- a hosted Vibe Presence editor with predefined safe layouts;
- a service-generated 1024×1024 image or approved animated asset at a stable external URL;
- Member-authored `details`, `state`, hover text, and approved destination links;
- a signed-in local desktop companion using Discord Social SDK Direct Rich Presence;
- a running Discord desktop client and enabled Discord activity sharing;
- local auto-start as an explicit Member choice;
- asset moderation, cache invalidation, companion updates, crash reporting, and revocation.

Other people could inspect the Member's profile and see the presence without visiting the hosted page. The result would still use Discord's fixed Rich Presence layout; it would not be an arbitrary embedded HTML panel or permanent profile decoration.

Recommended validation path:

1. Prototype Windows only for up to ten invited testers.
2. Offer three fixed Vibe Presence layouts rather than a free-form canvas.
3. Use Member-authored Current Vibe, not automatic Spotify data.
4. Measure installation completion, seven-day companion uptime, profile views where measurable, and willingness to pay.
5. Do not add macOS or broader distribution until at least half of invited Windows testers keep the companion enabled for seven days.

The Vibe Presence companion MAY become a strong Supporter differentiator, but it SHOULD NOT replace the no-install web page and `/vibe` Share Card. Free custom Rich Presence utilities and installation friction make a presence-only business fragile.

## 9. MVP acceptance criteria

The sellable MVP is ready for the first Founding Supporter only when:

- [ ] An invited Member can sign in with Discord and create a draft without provider OAuth.
- [ ] A Member can add, reorder, edit, and remove allowlisted music links.
- [ ] Draft changes do not affect the published page until explicit publish.
- [ ] Public, Unlisted, and Private visibility work as defined.
- [ ] A Visitor can open the public page without authentication on mobile and desktop.
- [ ] `/vibe` shares only the invoking Member's published public fields.
- [ ] Discord preview can be private before the public response.
- [ ] Free and Supporter limits are enforced without data loss on downgrade.
- [ ] Checkout and payment webhook behavior are secure and auditable.
- [ ] A Member can unpublish and delete their account.
- [ ] Operator can revoke an invite, suspend a page, and review a report.
- [ ] No Spotify secret, refresh token, Discord secret, or payment secret is present in browser artifacts.
- [ ] Product analytics contain no derived music-provider profiles or metrics.
- [ ] Terms, Privacy Policy, refund behavior, and report contact are publicly accessible.

## 10. Product success tests

The MVP is differentiated only if actual behavior supports it.

Initial hypotheses:

- At least 40% of qualified invited Members publish a page.
- At least 25% share through Discord within seven days.
- At least five of the first 50 activated Members pay, or at least 5% of the first 100 activated Members pay.
- At least 20% return to edit or share within 30 days.
- Free Share Cards produce measurable Visitor-to-Member signup traffic.

If Members only request automatic Spotify status and do not author or share collections, the proposed differentiation has failed and the product should be reconsidered before further development.

## 11. Recommended implementation order

1. **Foundation:** server-side identity, database, sessions, invitation gate, security
2. **Authoring:** Member identity, collections, Current Vibe, draft/preview/publish
3. **Public surface:** responsive page, visibility, safe outbound links, social preview
4. **Discord:** installation, identity mapping, `/vibe` preview and share
5. **Safety:** deletion, reports, moderation, rate limits, operational tooling
6. **Supporter:** themes, entitlements, hosted checkout, verified webhooks
7. **Measurement:** activation, sharing, conversion, retention, acquisition loop

Billing MUST NOT be implemented before the provider-neutral authoring and sharing journey works end to end.

## 12. Decisions still requiring confirmation

1. Adopt **Music Identity Page** and **Share Card** as canonical domain terms.
2. Use Discord as the primary Member sign-in for the first release.
3. Keep the paid MVP independent of Spotify OAuth.
4. Launch with five outbound providers as links only.
5. Use the proposed Free/Supporter limits and USD 3.99/month or USD 29/year price.

Until confirmed, this document is a proposed baseline rather than an accepted ADR.
