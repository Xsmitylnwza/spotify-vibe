# G-P1-S2b Review: Can config overlay resurrect deleted data?

**Summary:** The new overlayConfigDocument (presence-config.mjs:181-29) merges normalized updates into raw storage but does not resurrect deleted Scenes, mappings, or cleared optional fields. Deletions via full array replacement in UI requests are permanent. Clears are applied by overriding with empty values. GIPHY key (not in config) is unaffected.

**Analysis:**

- **Deletes a Scene:** No resurrection.  
  `studio-server.mjs:~600` (updateScenesAndSlots):  
  `scenes: body.scenes, slots: ...`  
  (body.scenes omits deleted id)  
  `presence-config.mjs:190-195` (retainedEntries): builds retained from raw, but returns `next.map(...)` so omitted ids not present in saved config or GET /api/config.

- **Removes a mapping:** No. Same as Scene deletion.  
  `presence-config.mjs:190-195` (retainedEntries for appMappings).

- **Clears optional text/art/button field:** No resurrection; clear applied.  
  E.g. `details: ''` or `buttons: []` in normalized overrides old value via `...item` spread (presence-config.mjs:192-193).

- **Clears a pin/override:** Cleared explicitly if scene deleted or cancelled.  
  `studio-server.mjs:600` (in updateScenesAndSlots):  
  `manualOverride: current.manualOverride && sceneIds.has(...) ? ... : null`  
  `studio-server.mjs:640` (cancelManualOverride): sets to null.

- **Clears a GIPHY key:** Not applicable to overlay (secrets separate).  
  GIPHY key omitted from publicConfig (studio-server.mjs:142: `delete settings.giphyApiKey`), updated via /api/settings (studio-server.mjs:869+).

The overlay preserves unspecified fields when present in update but does not restore deleted data from deletions/clears. No bug; behavior intentional for full replacement updates.