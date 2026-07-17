# Music Identity Business Model — Source of Truth

> **Status:** Historical research; no commercial product is in the current [Personal Scheduled Presence scope](./PERSONAL_SCHEDULED_PRESENCE_SOURCE_OF_TRUTH.md)  
> **Research last verified:** July 15, 2026  
> **Initial market:** English-speaking international Discord communities  
> **Commercial goal:** Cover operating costs and provide modest creator income, not maximize profit

This document separates verified platform facts from product hypotheses. Official platform rules override this document and MUST be checked again before launch.

The approved-but-parked Nitro-member premium direction, including Vibe Packs, companion automation, hybrid subscription and cosmetic-pack pricing, and validation gates, is preserved in the [Vibe Wardrobe Premium Specification](./VIBE_WARDROBE_PREMIUM_SPEC.md). It is not committed MVP scope.

Labels used below:

- **FACT** — supported by a cited first-party source.
- **PROPOSAL** — recommended product or business choice.
- **HYPOTHESIS** — must be validated with real Members and payments.

## 1. Executive recommendation

The original idea—charge Members for an automatically derived Spotify Taste Profile displayed in Discord—is **not a safe business foundation under Spotify's current rules**.

The recommended model is a **freemium, Member-authored Music Identity product**:

- A Member creates a hosted Music Identity Page and curates the tracks, playlists, links, notes, colors, and story they want to show.
- A Discord app posts a user-triggered Share Card and link through a slash command.
- The paid tier sells independent value: themes, layouts, clean branding, multiple collections, custom presentation, hosting, and Discord-sharing convenience.
- The commercial product does not require Spotify OAuth. It may link to official Spotify pages, as well as other music services.
- The existing Spotify OAuth integration remains a separate, free, non-commercial experiment with at most five allowlisted Members until written Spotify approval and appropriate production access are obtained.

**Recommended founding price:** USD 3.99 per month or USD 29 per year, with the annual plan emphasized. A limited first-year Founding Supporter offer MAY be tested at USD 19; it MUST NOT be marketed as lifetime access.

At the standard Merchant of Record fee of 5% + USD 0.50 per checkout, three annual Supporters cover an estimated USD 6.25 monthly fixed infrastructure baseline. Eight annual Supporters cover that baseline plus a USD 10 monthly creator allowance.

## 2. Hard platform constraints

### 2.1 Spotify

**FACT:** Spotify's February 2026 announcement says Development Mode supports learning, experimentation, and personal projects for non-commercial use. It says Development Mode should not be relied on to build or scale a business.

**FACT:** Development Mode currently allows at most five authorized Spotify users. Current Extended Quota eligibility includes an established organization, a launched service, at least 250,000 monthly active users, availability in key markets, and commercial viability.

**FACT:** Spotify policy prohibits analyzing Spotify Content or the Spotify Service to create derived listenership metrics, user metrics, or profiles of users. It also prohibits selling Spotify Content/data or offering Spotify metadata and artwork as a standalone product.

**FACT:** A compliant Non-Streaming SDA may be sold, but this does not override Development Mode, data-transfer, derived-profile, content-sale, or quota restrictions. Commercial Web Playback SDK use requires prior written approval.

**Business consequence:** The paid product MUST NOT promise or sell:

- Spotify-derived taste archetypes or personality labels;
- compatibility scores between Members;
- derived listening rankings, trends, recaps, or new metrics;
- AI summaries generated from Spotify data;
- raw Spotify history, metadata, or artwork as the paid value;
- full Spotify streaming;
- automated Spotify-derived Discord publishing without separate review and approval.

The phrase “Taste Profile” is itself ambiguous. Renaming does not create compliance, but a Member-authored **Music Identity Page** accurately reflects the safer proposed product.

### 2.2 Discord

**FACT:** A hosted Discord app can respond to slash commands with messages, embeds, links, and components.

**FACT:** Discord OAuth can link identity, but `activities.write` is unavailable. A hosted website cannot continuously change a Member's Discord custom status or Rich Presence.

**FACT:** Discord permits premium app functionality and external billing. Native Premium Apps are currently available only to developers based in the United States, United Kingdom, or European Union. A Thailand-based seller is currently exempt from Discord's native-purchase requirement while the region is unsupported.

**FACT:** If native Premium Apps later becomes available to the seller, equivalent supported paid benefits must also be offered through Discord at an equal or lower final Discord price. Current documented native fees include a 15% Growth Tier platform fee on the first USD 1 million in cumulative sales plus a 6% desktop/browser processing fee and possible additional deductions.

**Business consequence:** Begin with external website billing. Do not sell Discord API Data, promise Rich Presence, or use unsolicited direct-message upsells.

## 3. Customer and job to be done

### Initial customer segment

**PROPOSAL:** Start with English-speaking, Discord-native music fans who already use music as social identity:

- active members of music, gaming, artist, and friend-group servers;
- playlist curators and highly expressive listeners;
- micro-creators who want one attractive music-oriented public link;
- people who pay for cosmetic identity products but do not need professional analytics.

Do not begin with enterprise customers or unrestricted “everyone who uses Spotify.” The first segment should be narrow enough to reach through specific Discord communities.

### Core job

> “Help me make my music identity look like me and share it in Discord in one action.”

### Why the original feature is insufficient

Discord's native Spotify connection already displays a Member's current track and Spotify activity. Therefore, basic now-playing alone has low willingness to pay.

The independent value must be:

1. **Expression** — a distinctive visual identity rather than a raw status line.
2. **Curation** — Member-selected tracks, playlists, notes, eras, and moods.
3. **Portability** — one hosted page that can link to several music services.
4. **Discord convenience** — a polished, user-triggered card from a slash command.
5. **Control** — explicit privacy, drafts, and control over what is public.

## 4. What Members may pay for

### Strongest candidate paid value

- Premium page and Share Card themes
- Custom colors, typography, layout, and share image
- Removal of service branding
- Custom profile handle; custom domains only after support demand is proven
- Multiple Member-authored collections such as “Current Rotation,” “All-time Favorites,” or “Late-night Mix”
- Scheduled rotation of Member-authored featured content
- Multiple Discord Share Card layouts
- Page-view and click analytics generated by this service, without analyzing Spotify listening data
- Private drafts and unlisted pages
- Supporter badge and early access

### Weak or prohibited paid value

- Current Spotify song by itself—Discord already provides it
- Static profile hosting by itself—Carrd and Linktree create strong free/low-cost competition
- Derived Spotify taste scores, recaps, compatibility, or listening personality—policy blocker
- Spotify history, metadata, or cover art as the subscription product—policy blocker
- Hosted automatic Discord status or Rich Presence—not technically available through ordinary OAuth
- Advertising targeted from music-listening data—policy blocker and poor trust fit
- Unlimited lifetime access—recurring hosting and support make this structurally risky

## 5. Recommended offer and pricing

### Free

- One public Music Identity Page
- Member-authored music links, notes, and one collection
- One standard visual theme
- Standard Discord `/vibe` Share Card and hosted-profile link
- Privacy controls and deletion
- Small “Made with …” attribution

The Free tier creates the sharing loop. It MUST be useful enough that cards spread organically.

### Supporter — USD 3.99/month or USD 29/year

- All premium themes and Share Card layouts
- Multiple Member-authored collections
- Custom colors, typography, and layout
- Custom handle and enhanced share image
- Branding removal
- Scheduled rotation of Member-authored content
- First-party page-view/click analytics
- Private drafts and unlisted pages
- Supporter badge and early access

**PROPOSAL:** Make annual billing the default. USD 29/year sits between low-cost static profile hosting and music-power-user subscriptions while reducing fixed per-transaction fees and churn.

### Founding Supporter validation offer

- USD 19 for the first year
- Strictly limited to the first 20–50 paying Members
- Renews only with clear advance disclosure at the normal annual price
- No lifetime promise

The Founding offer is a willingness-to-pay experiment, not permanent pricing.

### Server plan — later, not MVP

**HYPOTHESIS:** USD 7.99/month or USD 59/year for a participating Discord community may be viable after consumer demand exists. Candidate value must use Member-authored/service-owned data: server branding, a community profile directory, card templates, role-based styling, and scheduled community prompts. Spotify-derived charts or recaps remain blocked.

## 6. Competitor and substitute evidence

Prices below were observed on first-party pages on July 15, 2026. They demonstrate price anchors, not this product's conversion rate.

The closest verified competitor is **.fmbot** on the Discord side. **stats.fm** and **volt.fm** are the closest shareable music-profile products on the web. Discord's native Spotify connection is the strongest free substitute for now-playing, while Carrd and Linktree substitute for the hosted-profile part.

No researched product was verified to combine every proposed element—Member-authored provider-neutral Music Identity Page, hosted customization, and a Discord slash-command Share Card—in exactly the same offer. This is a possible positioning gap, not proof that no such competitor exists and not proof of demand.

| Product | Observed price | Relevant paid value | Lesson |
|---|---:|---|---|
| Discord Spotify Connection | Included with Discord; Listen Along requires Spotify Premium | Native profile/status now-playing | Now-playing alone is a free baseline |
| Discord Nitro Basic / Nitro | USD 2.99 / 9.99 per month | Custom profiles, themes, icons, emoji, broader Discord benefits | Discord members pay for self-expression, but higher prices need a broad bundle |
| .fmbot Supporter | USD 4.99/month or 29.99/year | Personal customization, history import, stats, caching | Closest direct price anchor; its FAQ says supporter revenue funds hosting/development |
| .fmbot Premium Server | USD 8.99/month or 59.99/year | Scheduled server features, branding, filters | Evidence for a later server tier, not the consumer MVP |
| Last.fm Pro | USD 4.99/month or 49.99/year | History tools, advanced reports, profile customization, ad-free use | Music power users can pay around USD 5/month for repeated utility |
| stats.fm Plus | Public web price not shown | Extended history, charts, imports, custom timeframes, ad-free use | Successful pattern is free sharing plus paid depth; exact public price is unverified |
| volt.fm Pro | Paid plans exist; public amount requires sign-in | Shareable Spotify profile, themes, deeper timeframes, reports, and automation | Confirms the web-profile category, but its current public price cannot be used as an exact anchor |
| Receiptify | No paid tier found | Viral, receipt-style music artifact | A one-off share artifact is better used for free acquisition than as the entire subscription |
| Carrd Pro Standard | USD 19/year | Custom domain, no branding, forms, widgets, analytics | Static profile customization alone has a low price ceiling |
| Linktree Starter / Pro | USD 6 / 12 per month when billed annually | Customization, analytics, audience and monetization tools | Higher profile-page prices require creator/business utility |

Important: Competitors may use Last.fm, direct imports, legacy Spotify access, or separate permissions. Their features are market evidence, not proof that this project may copy their Spotify-data processing.

## 7. Acquisition loop

### Primary loop

```text
Member creates page
  -> invokes /vibe or shares page
  -> Visitors see a distinctive card
  -> Visitors open the profile
  -> some Visitors create their own free page
  -> expressive Members upgrade for customization
```

### Recommended channels

1. Partner with a small number of opt-in music and gaming Discord communities.
2. Publish theme previews and Member-authored “current rotation” cards on TikTok, X, Reddit, and music communities without spam.
3. Add a tasteful create-your-own link to Free cards.
4. Run seasonal, user-curated prompts such as “My Summer Rotation”; do not infer the answer from Spotify history.
5. Invite small playlist curators and micro-creators to co-design themes.

Do not spend on ads initially. The product needs evidence of organic sharing before paid acquisition can be justified.

### First 10 paying customers: founder-led playbook

**Goal:** Ten completed Founding Supporter payments, not ten email signups.  
**Cash budget:** USD 0–30 plus the founder's time.  
**Offer:** Concierge setup followed by the USD 19 first-year Founding Supporter offer; the prospect sees a working page and card before being asked to pay.

#### Narrow first-customer profile

Prioritize people who already perform the target behavior:

- an owner or moderator of a small, active music or gaming Discord community;
- a playlist curator or micro-creator who shares music every week;
- an expressive Discord member who already pays for Nitro, Last.fm Pro, bot supporter tiers, or profile customization;
- an English-speaking prospect who can give direct product feedback.

Avoid broad “Spotify users” lists. Existing sharing behavior is a stronger qualification signal than follower count.

#### Execution sequence

1. Create three polished demo identities: one music fan, one playlist curator, and one small Discord community moderator.
2. Record a 20–30 second screen capture showing page creation followed by `/vibe` posting the Share Card.
3. Build a list of 50 highly qualified prospects across approximately ten small communities. Use public collaboration channels, introductions, or moderator-approved contact paths.
4. Contact at most ten prospects per day with a manually personalized message referencing a real behavior or community. Do not automate Discord DMs.
5. Offer a 15-minute concierge session. The prospect supplies their own links, selections, and text; the founder helps publish the first page and card.
6. After the prospect has shared the working card, offer Founding Supporter for USD 19 for the first year. Do not lead with a feature list or ask for payment before demonstrating value.
7. Ask each satisfied customer for one warm introduction and permission to publish their page as a case study.
8. Feed the exact objections and words used by these customers back into the landing page.

#### Planning funnel

The following is an operating target, not a market benchmark:

```text
50 qualified, permission-based contacts
  -> 25 replies or short demos
  -> 15 activated pages shared in Discord
  -> 10 Founding Supporter payments
```

If fewer than five people pay after the first 50 qualified contacts, do not buy more traffic. Rework the target segment, offer, or onboarding first.

#### Outreach message

```text
Hi [name] — I noticed that you [specific music-sharing behavior].
I'm building a hosted music-identity page that turns a person's own
curation into a clean Discord /vibe card. It does not require Spotify login.
I can set up a private example for you or your server and show it in two minutes.
If it is genuinely useful, the first-year Founding Supporter price is $19.
Would you like to see the example?
```

The message MUST be individualized and sent only through a contact path where outreach is permitted. The bot MUST NOT send unsolicited direct messages, bulk promotions, or unrelated marketing.

#### Channel order

1. Warm introductions and communities the founder already participates in
2. Permission-based partnerships with small Discord server owners
3. Playlist curators and micro-creators with visible recurring sharing behavior
4. Moderator-approved Reddit or community “show and tell” posts
5. Bot directories and Discord App Directory only after activation and retention work
6. Product Hunt, broad SEO, paid influencers, and paid ads only after the first ten paying customers

Founder-led outreach is cheapest because it replaces ad spend with learning. The product's own branded Free Share Card should become the scalable acquisition channel after the first cohort.

## 8. Lean cost model

### Infrastructure assumptions

| Item | Validation | Base paid launch | Growth trigger |
|---|---:|---:|---:|
| Cloudflare Workers / Pages | Free plan | USD 5/month paid plan | 10 million requests/month included, then usage pricing |
| Cloudflare D1 | Free allowance | Included in Workers plan assumptions | Paid plan includes 25B rows read, 50M rows written, and 5 GB before overage |
| Transactional email | Resend Free | Resend Free | USD 20/month at the current 50,000-email Pro tier |
| Monitoring | Free tier assumption | Free tier assumption | Upgrade only after observed need |
| Domain | USD 15/year assumption | USD 15/year assumption | Registrar-dependent |
| Payment | None before sales | 5% + USD 0.50 per checkout | Additional method/currency/refund fees may apply |

Cloudflare currently includes 100,000 Worker requests per day on Free and charges a USD 5 monthly minimum for Paid with 10 million requests included. Resend currently includes 3,000 emails per month with a 100-email daily limit on Free.

Estimated fixed cost:

- **Validation:** approximately USD 1.25/month for a domain; infrastructure can remain free.
- **Base paid launch:** approximately USD 6.25/month: Workers Paid plus domain.
- **Growth:** approximately USD 26.25/month after Resend Pro, before unusual overages.

These estimates exclude taxes, refunds, chargebacks, legal/accounting costs, the creator's time, and Spotify Premium. Spotify Premium is required for the separate Development Mode experiment but is not part of the proposed paid product dependency.

### Checkout recommendation

**PROPOSAL:** Use a global Merchant of Record such as Paddle or Lemon Squeezy, subject to seller onboarding and country eligibility. Both currently advertise pay-as-you-go pricing of 5% + USD 0.50 per checkout and handle cross-border sales-tax compliance.

Stripe Thailand is a lower-level alternative. Its current published pricing includes 4.75% + THB 10 for foreign cards, an additional 2% when currency conversion is required, and 0.7% of Billing volume for recurring Billing. Direct Stripe use leaves more tax/compliance work with the seller.

Discord-native billing is not currently available to a Thailand-based seller and would carry materially higher documented platform and processing fees if it becomes required later.

## 9. Break-even model

The table uses the standard Merchant of Record fee of 5% + USD 0.50 and excludes income tax, refunds, and extra payment-method fees.

| Price | Net after standard fee | Covers USD 6.25/month fixed cost | Covers fixed cost + USD 10/month creator allowance | Covers USD 26.25/month growth cost |
|---|---:|---:|---:|---:|
| USD 3.99 monthly | USD 3.2905/month | 2 Supporters | 5 Supporters | 8 Supporters |
| USD 29 annual | USD 27.05/year = USD 2.254/month equivalent | 3 Supporters | 8 Supporters | 12 Supporters |

Annual-only examples at USD 29:

| Annual Supporters | Net annual receipts | Less USD 75 annual base cost | Approximate remainder per month |
|---:|---:|---:|---:|
| 3 | USD 81.15 | USD 6.15 | USD 0.51 |
| 8 | USD 216.40 | USD 141.40 | USD 11.78 |
| 10 | USD 270.50 | USD 195.50 | USD 16.29 |
| 20 | USD 541.00 | USD 466.00 | USD 38.83 |
| 50 | USD 1,352.50 | USD 1,277.50 | USD 106.46 |

**Conclusion:** This does not require a large paid audience to meet the creator's stated goal. Ten annual Supporters can cover the base stack and leave roughly USD 16/month before tax and exceptional costs. The main risk is product demand and platform policy, not raw server cost.

## 10. Validation plan and decision gates

All targets below are product hypotheses, not external benchmarks.

### Experiment 1 — value proposition

- Build three static examples of a Music Identity Page and Discord Share Card.
- Show “Create free” and “Supporter USD 29/year” calls to action.
- Recruit 30–50 international testers from opt-in Discord communities.
- Do not require Spotify OAuth.

**Pass:** At least 40% publish a page, and at least 25% share it in Discord within seven days.

### Experiment 2 — willingness to pay

- Show the Supporter upgrade after a Member has created and shared a Free page.
- Offer the limited USD 19 Founding first year.
- Measure completed payments, not survey answers.

**Pass:** At least five completed payments among the first 50 activated Members, or at least 5% paid conversion after 100 activated Members.

### Experiment 3 — retention

- Measure whether Members edit, rotate, or share their profile again.
- Do not manufacture engagement with spam notifications.

**Pass:** At least 20% of activated Members return or share again within 30 days.

### Kill or pivot conditions

- Members only want automatic Spotify now-playing and will not curate anything.
- Fewer than five of the first 100 activated Members pay after seeing a working Supporter preview.
- Discord shares do not bring new Visitors or Members.
- Platform review indicates that the chosen content or linking behavior is not compliant.

## 11. Phased business roadmap

### Phase A — free Spotify research alpha

- Maximum five allowlisted Spotify Members
- No billing and no commercial promises
- Test technical feasibility and privacy controls only
- No inferred profiles, scores, or AI analysis

### Phase B — independent paid product

- Member-authored Music Identity Page
- Provider-neutral outbound music links
- Discord `/vibe` Share Card
- Free + Supporter external billing
- No Spotify API dependency

### Phase C — expand proven value

- Additional themes and Member-authored collections
- Optional custom domains
- Server plan only after consumer adoption
- Localized pricing only after one English-first market converts

### Phase D — approved music integrations

- Seek written approval or a platform partnership for the exact Spotify use case
- Reassess Spotify quota eligibility and data-transfer policy
- Add only explicitly approved raw-data features
- Keep the product valuable if any provider integration disappears

## 12. Principal risks

| Risk | Severity | Mitigation |
|---|---:|---|
| Spotify access/policy blocks the original product | Critical | Do not make Spotify OAuth a paid-product dependency; obtain written approval before commercialization |
| Native Discord already provides now-playing | High | Sell curation, visual identity, portability, and sharing convenience |
| Consumer willingness to pay is low | High | Free sharing loop; payment experiment before building advanced features |
| Payment fixed fees consume low-price plans | Medium | Emphasize annual billing; avoid USD 1/month pricing |
| International tax/compliance overhead | Medium | Use a Merchant of Record, subject to onboarding eligibility |
| Product attracts minors | Medium | Start with an 18+ paid alpha and obtain privacy/legal review before broad launch |
| Discord billing rules or regions change | Medium | Recheck eligibility and price-parity rules before every paid Discord launch |
| Provider dependency removes the product's value | High | Make Member-authored content and hosted identity the durable source of value |

## 13. Sources

### Spotify official

1. [February 2026 platform access announcement](https://developer.spotify.com/blog/2026-02-06-update-on-developer-access-and-platform-security)
2. [Quota Modes](https://developer.spotify.com/documentation/web-api/concepts/quota-modes)
3. [Developer Policy](https://developer.spotify.com/policy)
4. [Developer Terms](https://developer.spotify.com/terms)
5. [Web Playback SDK](https://developer.spotify.com/documentation/web-playback-sdk)

### Discord official

6. [Discord Spotify Connection](https://support.discord.com/hc/en-us/articles/360000167212-Discord-Spotify-Connection)
7. [Discord OAuth2](https://docs.discord.com/developers/topics/oauth2)
8. [Create Message](https://docs.discord.com/developers/resources/message#create-message)
9. [Receiving and Responding to Interactions](https://docs.discord.com/developers/interactions/receiving-and-responding)
10. [Monetization Overview](https://docs.discord.com/developers/monetization/overview)
11. [Enabling Monetization](https://docs.discord.com/developers/monetization/enabling-monetization)
12. [Required Support for Monetizing Apps](https://support-dev.discord.com/hc/en-us/articles/23810643331735-Premium-Apps-Required-Support-for-Monetizing-Apps)
13. [Premium Apps Payout](https://support-dev.discord.com/hc/en-us/articles/17299902720919-Premium-Apps-Payout)
14. [Monetization Terms](https://support.discord.com/hc/en-us/articles/5330075836311-Monetization-Terms)
15. [Developer Policy](https://support-dev.discord.com/hc/en-us/articles/8563934450327-Discord-Developer-Policy)

### Competitors and substitutes

16. [Discord Nitro](https://discord.com/nitro)
17. [.fmbot Supporter](https://fmbot.xyz/supporter/)
18. [.fmbot Premium Server](https://fmbot.xyz/premium-server/)
19. [Last.fm Pro](https://www.last.fm/pro)
20. [stats.fm Plus](https://stats.fm/plus)
21. [volt.fm Pro](https://volt.fm/pro)
22. [Receiptify](https://receiptify.herokuapp.com/)
23. [Carrd Pro](https://carrd.co/pro)
24. [Linktree Pricing](https://linktr.ee/s/pricing/)

### Infrastructure and payments

25. [Cloudflare Workers Pricing](https://developers.cloudflare.com/workers/platform/pricing/)
26. [Cloudflare D1 Pricing](https://developers.cloudflare.com/d1/platform/pricing/)
27. [Resend Pricing](https://resend.com/pricing)
28. [Lemon Squeezy Pricing](https://www.lemonsqueezy.com/pricing)
29. [Paddle Pricing](https://www.paddle.com/pricing)
30. [Stripe Thailand Pricing](https://stripe.com/th/pricing)

## 14. Update policy

Review this document when Spotify or Discord changes platform access or monetization rules, a payment provider changes pricing, the seller's legal location changes, a paid experiment completes, or the product adopts a provider-data integration.
