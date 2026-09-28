# Presence update latency

The companion samples foreground windows every 200 ms and accepts a foreground
candidate after 200 ms of stability. It refreshes the process list and cached app
icons once per second (plus enumeration time), so launch/exit detection can take
longer than switching between known running apps. Running-app selection and
unmapped-foreground fallback are unchanged.

Studio refreshes runtime state every 500 ms while visible, with at most one
poll in flight; returning to the tab requests fresh state immediately. The
companion operates independently of the browser. Discord writes remain serialized
and deduplicated; sampling does not send an RPC on every tick.

On-device verification on 2026-09-06: 16 Windows watcher snapshots, intervals
204–581 ms, average 273 ms. These are local detection measurements, not Discord
rendering latency. Discord acknowledgement/display adds its own delay.

Codex session titles remain explicitly selected; faster detection does not track
the selected Codex task automatically. Elapsed time uses the saved start timestamp.
