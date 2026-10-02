# R-P4-1 — app-detector footprint reduction review

**Verdict: Accept with fixes — ต้องแก้ Major 2 จุดใน helper ก่อนรับ implementation.**

ตรวจบน branch `improve/flow-ux`, uncommitted tree วันที่ 2026-10-02; read-only บน source และเขียนเฉพาะรายงานนี้ ไม่แก้/commit source ไม่เปิดแอปหรือใช้ real Discord/PowerShell detector. Scope คือ `scripts/windows-apps.ps1`, `scripts/windows-apps.mjs`, diff ของ `scripts/studio-server.mjs`, และ tests สองไฟล์ที่ได้รับมอบหมาย; ไม่ review Electron หรือ renderer ของงานอื่น

## Intent / simpler alternative

เป้าหมายคือลดงาน background enumeration และ reconcile/RPC โดยรักษา running-app selection เดิม. การเพิ่มแค่ polling interval จะกระทบ launch/focus latency; cached asynchronous enumeration + change-only transport เป็นวิธีที่สอดคล้องกับเป้าหมาย โดยไม่ต้องเพิ่ม dependency/framework. Full catalog superset เป็น scope adjustment ที่ author report ระบุว่า coordinator อนุมัติแล้ว; ไม่ถือ mapped-only filtering เป็นข้อบังคับใหม่

## Findings

### F1 — Major: scan error สามารถตามด้วย false healthy recovery จาก catalog เก่า

- **Evidence:** `C:/letmecook-lab/spotify-vibe/scripts/windows-apps.ps1:30` ล้าง `pending` ก่อนเรียก `GetResult()` ที่อาจ throw; catch ที่ `:143–146` ส่ง empty/error snapshot และล้างเฉพาะ `$lastKey`. `$apps`, `$running`, `$catalogKey` ยังเป็นข้อมูลก่อน error (`:70–72`, `:89–130`). รอบถัดไปเริ่ม asynchronous scan ที่ `:78–81`; ถ้ายังไม่เสร็จ `PollScan()` ให้ null (`:29`, `:87`) แต่ `:134–138` ส่ง catalog เก่าโดยไม่มี error เพราะ `$lastKey` เป็น null
- **Concrete scenario:** เคยเห็น mapped A running; A ปิดระหว่าง scan ที่ fault. Helper ส่ง empty/error ทำให้ server clear A แล้วภายในรอบถัดไปประมาณ 200 ms ส่ง A running อีกครั้ง ทั้งที่ retry scan ยังไม่สำเร็จ. `windows-apps.mjs:7–10,51–53` มอง error→healthy เป็น transition และ `studio-server.mjs:978–997` reconcile กลับ A ได้ จึงโชว์ Scene ของ process ที่ปิดไปและเกิด clear/reapply RPC ไม่จำเป็น. หาก scan fault ซ้ำจะสลับ error/healthy ซ้ำ
- **Smallest fix:** หลัง bulk-scan error ให้ invalidate catalog และกั้น healthy emission จนกว่าจะได้รับผลจาก successful scan ใหม่; หรือออก helper ด้วย failure แล้วใช้ Node restart ที่มีอยู่. อย่าถือการ reset signature เพียงอย่างเดียวเป็น recovery
- **Status:** **Reasoned, source-traced; ไม่ reproduced ด้วย live helper.** Tests ปัจจุบันไม่มี failed scan ตามด้วย retry ที่ยัง pending: `scripts/tests/windows-apps.test.mjs:88–96` ป้อน timeout/exit จาก fake stream และทดสอบ Node restart แทน PowerShell recovery branch

### F2 — Major: bulk timeout ฆ่า task ที่เสร็จแล้วแต่ยังไม่ได้ collect

- **Evidence:** `C:/letmecook-lab/spotify-vibe/scripts/windows-apps.ps1:26` นิยาม `Pending` ว่า task reference ไม่เป็น null ไม่ได้หมายถึงยังทำงาน. `:83–85` ตรวจอายุแล้ว `exit 1` **ก่อน** `PollScan()` ที่ `:87` จะตรวจ `IsCompleted` และ collect ผล (`:28–30`)
- **Concrete scenario:** bulk scan เสร็จที่ 9,950 ms; main loop รอบก่อนอ่านตอน 9,900 ms แล้ว sleep 200 ms (`:148`). รอบถัดไปอ่านเวลา 10,100 ms, `Pending` ยัง true จึงทิ้งผลที่เสร็จใน deadlineและ restart helper. Main-thread scheduling delay บนเครื่องหนักทำให้เกิดกรณีเดียวกันได้แม้ scan เสร็จเร็วกว่านั้น. Node failure path clear running state (`windows-apps.mjs:28–35`), จึงกระทบ Scene ที่กำลังใช้อยู่โดยไม่จำเป็น
- **Smallest fix:** collect completed task ก่อนประเมิน timeout หรือเช็ค `!pending.IsCompleted` ใน timeout predicate; timeout ต้องใช้กับ unfinished task เท่านั้น. เก็บ watchdog ของ Node และ failure exit สำหรับ scan ที่ค้างจริงไว้
- **Status:** **Reasoned, source-traced; ไม่ reproduced บน heavy-load live helper.** `scripts/tests/windows-apps.test.mjs:88–96` ทดสอบ receipt/restart แต่ไม่ได้ทดสอบ completed-before-deadline/collected-after-deadline. เพิ่ม behavioural coverage ของ completion/deadline และ error recovery boundary โดยไม่ใช้ source-string assertions หรือ real-host scans ใน unit suite

## Coverage / conclusions

| Check | Evidence and result |
|---|---|
| Selection policy | **Verified by focused tests + source.** `scripts/app-presence.mjs:34–42` ยังเลือก enabled mapped executable จาก running โดย recent order แล้ว fallback mapping order. `studio-server.mjs:205–209,978–997` ใช้ policy เดิม; tests ที่ `scripts/tests/studio-apps.test.mjs:11` ผ่าน mapped focus, disabled/unmapped focus, transient focus, fallback และ closing all |
| Change-only / relaunch / PID reuse | **Source-traced.** Helper catalog key มี visible PID (`windows-apps.ps1:130`), Node key มี `processId` (`windows-apps.mjs:10`); visible same-exe/new-PID update ไม่ถูก dedupe. Missing-running observation ทำให้ fallback/clear; retained handle signal ทำให้ PID reuse ถูก reprobe (`windows-apps.ps1:41–58`). Same-exe relaunch ที่อยู่ระหว่าง scans หรือ invisible PID เปลี่ยนโดย executable set คงเดิมไม่มี process-instance transition ใน protocol; selection เป็น executable-level เหมือนเดิม ไม่ใช่ lifecycle tracker. Native PID reuse ไม่ได้ทดสอบสด |
| Helper liveness | **Verified at Node adapter boundary.** Injected child/clock tests ผ่าน heartbeat freshness, 15 s stall, crash+exit single retry, restart recovery, malformed output, old-child rejection และ shutdown. Bulk-scan failure/recovery มี F1/F2. Existing `footprint-raw/async-scan-probe.json` บันทึก forced 11 s scan, exit 1/recovery, 70 ms focus และ empty cleanup receipt; เป็น author artifact ที่อ่าน ไม่ใช่ probe ที่ reviewer รัน และไม่ครอบคลุม F1/F2 |
| Legacy mapping identity | **Source-traced.** `windows-apps.ps1:46–50` ใช้ `MainModule.FileName` ก่อน native fallback; cache ไม่ canonicalize/migrate path. Injected alias HTTP test ผ่าน แต่ไม่ได้พิสูจน์ actual Windows junction/loader parity รอบนี้ |
| Handles / privileges / memory | **Source-traced.** `OpenProcess(0x101000)` คือ limited-query + synchronize ไม่มี elevation request; successful scan close departed/replaced handles ที่ `windows-apps.ps1:58`. Published dictionaries ไม่ถูก mutate หลัง publish และ task มีได้ครั้งละหนึ่ง. ไม่พบ ordinary successful-scan path ที่สะสม exited handles. `$iconCache` เดิมและ `$nameCache` ใหม่เก็บ metadata ตาม unique executable path ตลอด helper lifetime (`:4–5,95–123`), ไม่มี eviction; จึงไม่อ้างว่า memory มี absolute bound. ไม่มี native resource stress test |
| Mapping/Scene edits with unchanged detector | **Source-traced.** Mapping PUT force reconcile ที่ `studio-server.mjs:834–839`; Scene save force reconcile ที่ `:595–604`, จึง apply live Scene edits แม้ detector ไม่มี transition. Pin/cancel และ pause/clear เป็น explicit paths ที่ `:615–629,639–645`; independent scheduler heartbeat/override expiry ยังอยู่ที่ `:448–460` |
| No needless detector RPC | **Verified by real-server fake-RPC test.** Duplicate/catalog-only/unmapped focus snapshots ไม่ reset scheduler หรือส่ง RPC. `applyScene` guards applied key ทั้งก่อน/ใน queue (`studio-server.mjs:311,317`). Explicit configuration saves ยังใช้ force ตามเดิม; ไม่อ้างว่า no-op HTTP saves ไม่ส่ง RPC |
| Behavioural / hermetic tests | **Verified by source and execution.** `windows-apps.test.mjs` injects child streams/clock; `studio-apps.test.mjs` ใช้ temp config/secrets, fake RPC/detector/clock และ `PRESENCE_APP_DETECTION_DISABLE=1` ปิด Start Menu scan. ไม่มี source-string assertions ในสองไฟล์นี้; tests ไม่ exercise native C#/PowerShell scanner ซึ่งเป็น proof limit ของ findings ข้างต้น |

## Validation

- **Reviewer executed:** `node --test C:/letmecook-lab/spotify-vibe/scripts/tests/windows-apps.test.mjs C:/letmecook-lab/spotify-vibe/scripts/tests/app-presence.test.mjs C:/letmecook-lab/spotify-vibe/scripts/tests/studio-apps.test.mjs C:/letmecook-lab/spotify-vibe/scripts/tests/studio-boundary.test.mjs` — **31 passed, 0 failed, 0 skipped**, exit 0, 10,436.8549 ms
- **Reviewer executed once:** `npm test` in `C:/letmecook-lab/spotify-vibe` — **138 passed, 0 failed, 0 skipped**, exit 0, 11,651.6289 ms. Whole-suite count รวม concurrent lane tests; ไม่ใช้ author report count 122 เป็นผลปัจจุบัน
- Test fixtures stopped their temporary HTTP servers and cleaned their temporary directories. Reviewer ไม่เปิด Studio/Electron, real RPC หรือ native detector
- CPU/latency เป็น evidence ที่ coordinator recompute แล้วตาม dispatch: S1 1.95→0.32%, focus 257–540 ms, launch 1.1–1.5 s; reviewer ไม่ rerun/recompute measurements จึงไม่ใช้ตัวเลขเหล่านี้รับรอง heavy-load timeout safety

**Acceptance gate:** แก้ F1/F2 และตรวจ behaviour ของ recovery/deadline boundaries; ผล tests ที่ผ่านปัจจุบันยังไม่พิสูจน์สอง boundary นี้. ไม่จำเป็นต้องเปลี่ยน selection policy หรือขยาย scope ไป Electron/renderer
