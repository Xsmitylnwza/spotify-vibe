# R-P1-S2b — Persistence overlay re-review

**Verdict: Accept — 0 Blocker, 0 Major; no new confirmed finding.**

**R-S2-01: Fixed**, verified at real HTTP/disk boundaries.

ตรวจ working tree `improve/flow-ux` เทียบ HEAD `b401d34b523f8b1e219985d3cca6e54a7dfb8d8b`; source read-only, ไม่ตรวจหรือแก้ Electron lane
อ่าน AGENTS.md §1, §4–7, previous P1-S2-review.md, author P1-S2.md รวม P1-S2b fixes และ F02/F08/F14/F15
เป้าหมายคือรักษา owner extensions ใน supported committed document โดยให้ validated known fields และ durable publication เป็น authoritative
Simpler-alternative pass: แยก raw storage representation จาก runtime projection แล้ว overlay ใน store queue เป็นการแก้ที่เล็กและตรง boundary; ไม่จำเป็นต้องขยาย HTTP shapes หรือเพิ่ม storage infrastructure

## R-S2-01 evidence

- **Verified source:** `scripts/local-config-store.mjs:43`, `:47`, `:58`, `:60`, `:106` เก็บ raw document, เลือก latest committed raw ภายใน write chain, atomic save ก่อนเปลี่ยน committedDocument; direct save ก่อน load อ่านและ validate existing document
- **Verified source:** `scripts/presence-config.mjs:185`, `:191`, `:196`, `:197`, `:198` overlay normalized root/settings และ retained records ตาม trimmed Scene/slot id กับ canonical mapping appKey; array output มาจาก next array จึงไม่ resurrect removed entries หรือ merge ตาม index
- **Verified source:** `scripts/presence-config.mjs:199`, `scripts/studio-server.mjs:431`, `:599`, `:601` omitted slots เก็บ raw array ทั้ง value/order/metadata; explicit slots write ใช้ validated slots ตาม identity
- **Verified runtime:** supplied owner-field HTTP tests seed nested root/settings/Scene/slot/mapping sentinels แล้ว pause, edit/reorder Scenes, เปลี่ยน executable case, session, pin และ fake-clock expiry; disk เก็บ exact unknown values และ GET ยังเป็น normalized projection (`scripts/tests/studio-boundary.test.mjs:265`, `:299`, `:323`)
- **Verified runtime:** explicit slot write, new slot และ Scene deletion รักษา metadata ตาม id; deleted Scene ไม่กลับมาในการ save ถัดไป
- **Verified runtime:** store replacement failure ไม่เปลี่ยน bytes; retry และ direct save-before-load รักษา unknown data (`scripts/tests/persistence-boundary.test.mjs:148`, `:183`)
- **Verified source/runtime:** `scripts/app-secrets.mjs:189`, `:192`, `:193`, `:208` เริ่ม payload จาก existing document แล้ว override validated keys ใน per-path queue; unknown metadata อยู่หลัง partial update/clear (`scripts/tests/persistence-boundary.test.mjs:167`)

## Independent adversarial HTTP/disk probe

Reviewer Node process ใช้ `%TEMP%\vibe-r-s2b`, port **47396**, isolated config/secrets, disable host effects และ PRESENCE_AUTOSTART/DISCORD/APP_DETECTION_DISABLE=1
Probe exit 0: **REVIEWER_PROBE_PASS checks=25**; ทุก assertion อ่าน HTTP response/GET หรือไฟล์จริง ไม่ใช้ source-string assertions

- **Verified:** omit existing largeImage/smallImage/largeImageText และส่ง buttons=[] ผ่าน PUT config; disk เป็น empty strings/empty array ตาม validator ไม่คืน art/buttons เดิม (`scripts/presence-config.mjs:76`, `:191`)
- **Verified:** Scene rename ด้วย id เดิมยังเก็บ metadata ของ Scene นั้น; เปลี่ยน id และลบ Scene พร้อม slots=[] ไม่รับ metadata ของ old id และไม่เก็บ Scene ที่ลบ
- **Verified:** raw timerMinutes เป็น string และ invalid selectionMode/null scheduleEnabled ที่ validator normalize ได้ ถูกแทนด้วย number/schedule/true เมื่อ save; raw ไม่ทับ validated known keys ส่วน omitted raw slots คงเดิมตาม contract (`scripts/presence-config.mjs:175`, `:196`, `:199`)
- **Verified:** DELETE override, empty session title และ mappings=[] ทำให้ disk override/session=null และ mappings=[]; subsequent queued writes ไม่คืนค่าเก่า (`scripts/studio-server.mjs:627`, `:816`, `:835`)
- **Verified:** duplicate Scene id และ duplicate canonical executable identity ตอบ HTTP 400 และ exact disk bytes ไม่เปลี่ยน (`scripts/presence-config.mjs:151`, `scripts/app-presence.mjs:7`)
- **Verified:** block first rename, enqueue second session mutation และ GET ระหว่าง pending save; GET ยังเห็น committed state, release แล้ว disk รวมสอง changes และ unknown root metadata; raw overlay จึงไม่ stale ใน server command path (`scripts/local-config-store.mjs:47`, `scripts/studio-server.mjs:431`, `:442`)
- **Verified:** injected EPERM ใน overlay save ตอบ 500, exact disk bytes/GET ไม่เปลี่ยน, subsequent retry สำเร็จ
- **Verified:** seed synthetic nonempty Discord/GIPHY keys แล้ว PUT settings ด้วย empty strings ทั้งสอง; disk known keys ว่างจริงและ unknown secret metadata อยู่ครบ ไม่มี secret values ใน log/report (`scripts/studio-server.mjs:683`, `scripts/app-secrets.mjs:174`, `:179`)

## Required verification

| Command | Tests | Pass | Fail | Cancelled / skipped / todo |
| --- | ---: | ---: | ---: | --- |
| `node --test scripts/tests/persistence-boundary.test.mjs scripts/tests/studio-boundary.test.mjs scripts/tests/local-config-store.test.mjs scripts/tests/app-secrets.test.mjs scripts/tests/studio-server.test.mjs scripts/tests/presence-config.test.mjs` | 58 | 58 | 0 | 0 / 0 / 0 |
| `npm test` — once | 115 | 115 | 0 | 0 / 0 / 0 |

ทั้งสอง exit 0; focused duration 10,386 ms, full duration 12,048 ms
Logs retained outside scratch profile: `%TEMP%\vibe-r-s2b-focused.log`, `%TEMP%\vibe-r-s2b-full.log`, `%TEMP%\vibe-r-s2b-probe.log`
Full count เป็น working tree ปัจจุบันรวม concurrent desktop tests; ไม่มี failure ใน electron-* tests และไม่ถือเป็น independent desktop acceptance

**Earlier guarantees remain verified through supplied boundary tests and source trace:**

- F02: save failure leaves committed GET/disk intact; blocked write preserves command ordering (`scripts/studio-server.mjs:431`)
- F08: no delete-first replacement, temp cleanup only, fsync/rename/read failures, verified byte-exact backups, future-version refusal และ concurrent partial secret updates (`scripts/local-config-store.mjs:19`, `:31`, `scripts/app-secrets.mjs:155`, `:208`)
- F14: fake-clock repeated expiry failures retain one bounded-retry timer; expired override ineffective before durable cleanup; writes recover (`scripts/studio-server.mjs:449`, `:474`, `:490`)
- F15: split Thai/emoji, fatal UTF-8, malformed JSON/body/Host/target, disconnect, 5-second deadline, >1 MiB rejection และ exactly 1 MiB acceptance; maximum Scene/slot/mapping fixture passes (`scripts/studio-server.mjs:533`, `:557`)
- **Source-confirmed performance scope:** overlay builds Maps and traverses bounded known arrays; request byte cap/deadline unchanged. No new polling/timer/child process in overlay. No benchmark or upper bound on pre-existing unknown metadata size was claimed

## Limits and cleanup

- ไม่มี confirmed new finding; hypothesis เรื่อง clear resurrection/stale raw/type conflict ไม่เกิดใน scenarios ที่ทดสอบข้างต้น
- Unsupported/invalid whole documents remain backup/refusal-gated; preserving malformed known values was not the contract. External-process writes remain outside process-local queue, unchanged Parked scope
- Real Discord, packaged Electron, real PowerShell cancellation, physical disk-full/power-loss และ directory-metadata durability ยัง unverified
- All reviewer/test commands exited; reviewer server stopped in finally and no LISTEN listener remained on 47396. Cleanup remains: automatic approval review rejected both verified-path recursive cleanup and explicit-file/empty-directory cleanup with `blocked by policy`; `%TEMP%\vibe-r-s2b` retains only presence-config.json and secrets.json containing synthetic test data, no real credentials
- Changed only this report; no source edits, commits, dependency changes, real owner profile/secrets access or Electron actions
- Remaining: coordinator removes the isolated scratch directory and performs integration/owner gates for other tasks; no further P1-S2b source correction required by this review
