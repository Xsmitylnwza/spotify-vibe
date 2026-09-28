# Public artwork delivery — 2026-09-06

Published only the approved GIF and PNG to the public repository's presence-assets branch. Immutable revision: 24fc4306fbd545200a0525aba360b07e64ba5f68. Runtime uses the raw.githubusercontent.com directory at that revision by default; PRESENCE_ART_BASE_URL remains an optional override. No local config, secrets, or application source was published.

Both public files returned HTTP 200 with image/gif and image/png respectively and matched local bytes. Studio now resolves builtin art without owner hosting setup. Earlier documentation stating public hosting is missing is superseded by this record. Discord rendering still depends on its media fetch/client behavior; RPC acknowledgement alone does not prove viewer rendering.
