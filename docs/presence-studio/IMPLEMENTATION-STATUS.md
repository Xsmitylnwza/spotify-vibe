# Implementation status

## Update: application setup delivered

The owner-directed two-page app setup and preset editor are implemented. See [APP-SETUP-JOURNEY.md](APP-SETUP-JOURNEY.md) for current behavior and validation. Automatic app selection is connected to the companion. The published artwork URL is configured by default, but rendering in a separate Discord viewer/client remains unverified. The default Discord Application ID is bundled. Basic migration, write-queue recovery, activity timestamp stability and foreground app mapping are implemented.

## Delivered 2026-09-06

- Approved Court idle art copied into the repository; GIF and static poster.
- Fresh-config default plus look selection in the real local Studio.
- Orange/teal CI, prominent portrait stage, explicit motion preference and hidden-tab poster.
- Local asset routes and explicit public-URL boundary for Discord.
- Existing scene artwork preserved. No owner data or secrets migrated in this slice.
- First run opens the editor without forcing the API-key modal; connection setup remains available.
- Verification: 34 Node tests passed, Vite/TypeScript build passed (legacy frontend), local Studio Playwright smoke passed at 1440px and 768px with no page errors or horizontal overflow; bundled image loading, both look selections and motion toggle checked. CLI wrapper crashed on this Windows runtime, so the smoke used the installed Playwright Node library.

## Remaining work

- Complete preset draft/apply behavior and multi-tab revision checks.
- Add pin/pause/hide semantics, mood/outfit families, Personal Space editor and hosting, and tray support.
- Verify live Discord rendering in a separate viewer/client.
- Complete accessibility and responsive QA across the full product.

This does not claim completion of FINAL-PLAN-DRAFT.md. The approved art decision is authoritative in ART-DIRECTION.md; older pending lists in the full plan are historical and should be checked against APP-SETUP-JOURNEY.md.
