# R-P1-S2 — Independent server review

**Verdict: Rework — 0 Blocker, 1 Major.**

ตรวจ `improve/flow-ux` working tree เทียบ HEAD `b401d34b523f8b1e219985d3cca6e54a7dfb8d8b` แบบ read-only บน source ตาม Task R-P1-S2; ไม่ตรวจหรือแก้ `electron/*` ของ lane อื่น
อ่าน AGENTS.md §1, §4–7, IMPROVEMENT-SPEC F02/F08/F14/F15 และ body/storage contracts, WORKFLOW P1-S2 และรายงานผู้เขียน P1-S2.md

เป้าหมายคือทำให้ mutation publish หลัง durable save, recovery ไม่ทำลายไฟล์เดิม, expiry retry ไม่หยุด และ HTTP body ไม่เสีย UTF-8/อ่านไม่จำกัด
พิจารณาทางเลือกที่เล็กกว่าแล้ว: shared atomic-write primitive และ process-local queue เหมาะกับขอบเขตนี้; ไม่จำเป็นต้องเพิ่ม database, lease หรือ infrastructure ที่ Parked

## Finding

### R-S2-01 — Major: successful unrelated saves discard unknown owner fields

**Reproduced**, เป็นข้อบกพร่องเดิมที่ยังไม่แก้ตาม acceptance contract มิใช่คำกล่าวว่าการเพิ่ม queue สร้าง regression นี้

- จุดใน diff: `scripts/local-config-store.mjs:66` / `:86` คืนเฉพาะ normalized config จาก load; `:45` save เฉพาะ normalized projection; `scripts/studio-server.mjs:436` validate projection ก่อนส่งไป store
- เส้นทาง validator ที่ไม่ได้แก้ใน diff: `scripts/presence-config.mjs:76` สร้าง Scene ใหม่เฉพาะ known fields, `:119` สร้าง slot ใหม่เฉพาะ known fields, `:169` สร้าง config และ `:175` settings ใหม่เฉพาะ known fields
- อีก surface ของกลไกเดียวกัน: `scripts/app-secrets.mjs:189` / `:195` อ่าน `existing` แล้วสร้าง payload ใหม่เพียง version + สอง known keys ก่อน atomic replacement

**Failure scenario / observed evidence:** ใช้ profile ชั่วคราว `%TEMP%\vibe-r-s2`, port 47396, ปิด host effects; เขียน valid version-2 default config พร้อม sentinel `ownerExtension` ที่ root, settings, Scene แรกและ slot แรก
หลัง start ไฟล์เดิมยังมี root sentinel แต่ GET `/api/config` ไม่มีแล้ว; ส่ง `POST /api/schedule` body `{"enabled":false}` ได้ HTTP 200 และไฟล์ที่อ่านกลับไม่มี sentinel ทั้งสี่ตำแหน่ง
Known slot values ยังคงอยู่ แต่ metadata ภายใน legacy slot หายโดยไม่มีการแก้ slots
แยก probe `saveAppSecrets({filePath, clearGiphyApiKey:true})` กับ valid version-1 file ที่สอง known keys ว่างและมี sentinel metadata; successful write ลบ metadata ทั้งที่ไม่มี key จริงให้เปลี่ยน

**Impact:** การ pause/resume, session/mapping save หรือ expiry cleanup สามารถลบข้อมูลของ owner ที่ UI/validator ไม่รู้จัก รวมถึงข้อมูลภายใน legacy slots
สำหรับ valid v2 file ไม่มี recovery/migration backup ในเส้นทางนี้ จึงไม่มี last-good copy ของ unknown fields หลัง successful save
Atomic rename และ queue ทำให้การเขียนปลอดภัยจาก partial failure แต่ยังเขียนข้อมูลที่ถูกตัดทิ้งแล้วสำเร็จ

**Smallest fix:** เก็บ raw committed representation สำหรับ supported schema แล้ว overlay เฉพาะ known fields ที่ validate แล้วก่อน publish/write; merge nested settings และ retained Scenes/slots/mappings ตาม stable identity เพื่อรักษา fields ที่ caller ไม่ได้แก้
อย่า merge array ตาม index และอย่า resurrect Scene/slot ที่ owner ลบโดยตั้งใจ
secret payload ให้เริ่มจาก `existing` แล้ว override version/known keys ที่ผ่าน validation
หากต้องแก้ shared validator ให้ coordinator มอบ ownership เพิ่ม; reviewer ไม่ได้แก้ source
เพิ่ม real temp-file + HTTP tests ที่ seed unknown fields แล้ว assert exact retained values หลัง load และ unrelated successful mutations รวมถึง omitted slots; fixture ปัจจุบันเริ่มจาก normalized default จึงไม่เจอกรณีนี้ (`scripts/tests/studio-boundary.test.mjs:23`, `scripts/tests/persistence-boundary.test.mjs:16`)

## Verification actually observed

| Command | Tests | Pass | Fail | Cancelled / skipped / todo |
| --- | ---: | ---: | ---: | --- |
| `node --test scripts/tests/persistence-boundary.test.mjs scripts/tests/studio-boundary.test.mjs scripts/tests/local-config-store.test.mjs scripts/tests/app-secrets.test.mjs scripts/tests/studio-server.test.mjs` | 46 | 46 | 0 | 0 / 0 / 0 |
| `npm test` (once) | 107 | 107 | 0 | 0 / 0 / 0 |

ทั้งสองคำสั่ง exit 0; focused duration 10,381 ms, full 12,513 ms
จำนวน full เป็น working tree ที่สังเกตจริง รวม concurrent desktop tests มากกว่ารายงานผู้เขียนที่ระบุ 99; ไม่ถือว่าเป็น independent acceptance ของ Electron lane

**Verified through real boundaries in supplied tests and source trace:**

- F02: injected rename failure leaves GET config and original disk bytes unchanged; subsequent command succeeds; blocked save + overlapping session command builds from latest committed config, reads during pending save expose old state (`scripts/studio-server.mjs:431`)
- F08: replacement never unlinks destination; temp-only cleanup, fsync/rename failure, read I/O failure, future-version refusal, byte-exact verified backups and v1-backup failure tested on temp files (`scripts/local-config-store.mjs:18`, `:30`, `:51`; `scripts/app-secrets.mjs:147`, `:208`)
- F14: eight expiry write failures leave one fake-clock timer, bounded retry and ineffective expired override; restoring writes clears durable override (`scripts/studio-server.mjs:449`, `:470`)
- F15: real chunked HTTP splits inside every Thai/emoji codepoint, invalid UTF-8/JSON/object shape, >1 MiB, exactly 1 MiB, stalled stream timeout, malformed Host/target and disconnect tests pass (`scripts/studio-server.mjs:533`, `:751`)
- Extra reviewer probe: send whitespace every 500 ms after `{` without ending body; HTTP 408 / BODY_TIMEOUT at 5,079 ms and exact disk bytes unchanged. This confirms a total deadline under ongoing slow drip, beyond supplied stalled-body coverage
- Maximum supported 20 Scenes / 24 slots / 100 mappings and known hidden timer fields round-trip; omitted slots preserve known data. This does not establish unknown-field preservation
- Host hooks: quit response arrives before supplied onQuit; requireOwnership returns STUDIO_PORT_IN_USE and leaves occupied listener responsive; double stop shares one promise, closes HTTP, stops watcher, aborts active fake scan and force-destroys hung RPC transport at about 3 seconds (`scripts/studio-server.mjs:714`, `:928`, `:953`)
- Supplied new boundary tests exercise real HTTP/temp-file I/O with narrow failure seams, not source-string assertions

## Limits / remaining work

- ไม่พบอีก confirmed finding ใน command save/publish ordering, delete-before-rename, backup/future-version guard, timer rescheduling หรือ byte reader
- Source-confirmed cancellation guards exist before scan, after async cache read and immediately after spawn (`scripts/installed-apps.mjs:28`, `:44`, `:61`, `:82`); active fake-child abort is runtime-tested. Stop during async startup and abort occurring inside spawn are not independently stress-tested here
- Content-Length framing lies rely on Node's HTTP parser; supplied tests use chunked transfer and this review did not add raw-socket framing probes
- Real Discord, real PowerShell termination timing, physical disk-full/power-loss and packaged/manual Electron lifecycle remain unverified. No Electron launch, real profile/secrets access, dependency change, source edit or commit was made
- All test commands and reviewer Node probe exited; reviewer server was stopped and no listener remained on 47396. Scratch directory `%TEMP%\vibe-r-s2` was removed after verification
- Remaining: fix R-S2-01, add unknown-field round-trip boundary coverage and rerun the focused/full gates before Accept
