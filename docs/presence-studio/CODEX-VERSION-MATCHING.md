# Codex package updates — 2026-09-08

Presence failed after Codex updated from 26.901.5003.0 to 26.901.6511.0:
Windows detected the new executable but the saved mapping used the old full path.
Discord was connected; no mapping was eligible.

Application identity now ignores only the four-part version in the Codex
WindowsApps package path. Installation root, architecture, publisher, and
app/ChatGPT.exe suffix remain part of identity. Other executables keep exact
normalized path matching. The Studio uses the same normalization for deduplication,
mapping edits, and icon lookup. Existing saved paths do not require migration.

A regression test failed before the fix and passed afterwards, covering running
and foreground selection, duplicate mappings across versions, and distinct
publishers/installations. All 46 tests passed. This does not add Codex chat tracking.
