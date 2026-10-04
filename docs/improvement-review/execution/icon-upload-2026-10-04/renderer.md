# Restored app-icon upload controls

The large and small image pickers now show Upload icon for missing public icons
and Retry upload for failed uploads. Missing local icons and an unavailable host
leave the action visible but disabled with an explanation. A verified public URL
is labeled Public icon ready, rather than claiming a live Discord render.

The renderer shows the actual provider name from the backend. Upload requests
require consent for that provider and send only the selected executable identity;
the backend supplies trusted catalog bytes. No Scene or pairing write occurs.
The selected upload may belong to a new unsaved Scene draft. Closing the image
picker cancels a pending permission action; declining permission never triggers
the explicit upload. Duplicate clicks share the existing busy guard.

Provider mismatch reloads metadata and requires another explicit Allow; revoked
permission similarly refreshes the disclosure and does not repeat rejected POSTs.
Upload errors retain the icon action and release busy state for an explicit retry.

Verified focused renderer checks: **53/53** across renderer-p3 and renderer-draft.
Final full local suite: **378/378**, zero failed/skipped/cancelled tests. The actual
Node createIconUploader adapter uploaded a generated 32px/158-byte PNG to
`https://img.ge/i/aR2Ul59.png`, after anonymous direct GET MIME and byte equality
verification. Only generated test artwork was uploaded; no owner icon/profile,
private key, account, cookie/token persistence or live Discord activity was used.
The independent reviewer verified that direct PNG response and its source hash.
Actual rendering through Discord's image proxy remains unverified.
