---
status: superseded by ADR-0004
---

# Keep the Focus Calendar authoritative

Spotify Vibe's Focus Calendar will own the Member's Focus Plan. External calendars initially contribute read-only busy periods, while only Focus Blocks approved by the Member are written back through a Connection; unrestricted two-way synchronization and an external-calendar-owned model were rejected because conflicts, duplicate events, and destructive updates would undermine trust and expand the first release substantially.
