# R-P4-2 — Renderer release review

**Verdict: Accept with fixes.** พบ 1 Major ด้าน pending autosave และ 1 Minor ด้านหลักฐาน route test; ไม่มี Blocker ที่พิสูจน์ได้ในการตรวจครั้งนี้ ต้องแก้ Major ก่อนรับ P4-2 ตาม release contract ของ Task

Reviewer: Codex; read-only source, branch `improve/flow-ux`, HEAD `0748b44f939b1a2a26b8d2e913d5a64a0be9f376` plus uncommitted P4-2 files. ตรวจ `electron/main.js`, `electron/tray-window.mjs`, focused test files, author report และ renderer save/navigation paths ที่เกี่ยวข้อง ไม่ review หรือแก้ P4-1 files

เป้าหมายคือคืน memory ของ renderer ที่สะอาดหลังซ่อน 30 วินาที โดย companion ยังทำงานและเปิด Studio กลับได้ ทางเลือกที่เล็กกว่าคือ retain renderer ต่อไปเมื่อ pending save ไม่สามารถพิสูจน์ว่า settled ได้; การคืน memory ต้องอยู่หลัง proof นี้ ไม่จำเป็นต้องเปลี่ยน server lifecycle

## Findings

### Major R-P4-2-M1 — Probe ไม่ตรวจ pending debounce และคืน clean ก่อน autosave ถัดไปเริ่ม

**Evidence:** `electron/tray-window.mjs:8`, `:10`, `:17`, `:31`, `:64`; renderer `scripts/discord-presence-studio.html:1813`, `:2812`, `:2824`, `:2832`, `:2839`. Test fixture `scripts/tests/electron-tray-window.test.mjs:66` และ queued-save case `:89` ไม่มี pending `scheduleSave()` ที่ยังไม่เข้า `saveChain`

**Concrete scenario:** Save A กำลังรอ response; ผู้ใช้แก้ค่าที่ผ่าน validation แต่ normalize กลับเป็นค่าเดิม เช่นเติม whitespace รอบชื่อ Scene (`formScene` ใช้ `.trim()`). Input handler `:3108–:3112` sync และ `scheduleSave()` ตั้ง dirty พร้อม timer 650 ms. ผู้ใช้ hide; Save A สำเร็จหลังจากนั้นและตั้ง `_lastSave.state = 'saved'`, ปลด `saveButton.disabled`, และ settle chain ก่อน debounce ถัดไปยิง. หาก response มาถึงใกล้ grace/retry boundary หลังซ่อน 30 วินาที probe จะเห็น form/config/persisted เท่ากันและคืน clean โดย timer ยัง pending อยู่ การอ่าน state ข้าม process ยังเปิดโอกาสให้ timer เริ่ม PUT ระหว่าง clean reply กับ main `destroy()` เพราะ main generation ใช้ invalidate hide/show/quit ไม่ได้ invalidate renderer save activity

**Reproduced, in-memory source harness:** ใช้ `node --input-type=module` ผ่าน PowerShell stdin อ่านและ evaluate ฟังก์ชัน `saveConfig` และ `scheduleSave` จริงจาก HTML ด้วย `node:vm`; inject deferred `requestJson`, fake timers, form/config ที่ normalize เท่ากัน และ GET persisted response. เรียก `saveConfig(false)` → `scheduleSave()` → resolve response แรก → เรียก `readStudioSaveState` จริง ผล:

```json
{"probe":"clean","lastSave":"saved","saveButtonDisabled":false,"pendingDebounce":[650]}
{"afterDebounce":"saving","saveButtonDisabled":true}
```

บรรทัดที่สองเกิดหลังเรียก callback ของ pending timer แสดงว่ามี save งานใหม่จริงที่ probe แรกไม่ตรวจพบ ไม่ใช่ source-string assertion. **Reasoned:** main จะ destroy เมื่อ clean ตาม `:62–:64`; ไม่ได้ reproduce ด้วย native Electron และไม่ได้พิสูจน์ data loss ในกรณี normalized edit นี้ ข้อผิดพลาดที่พิสูจน์คือ pending save ถูกจัดเป็น clean จึงยังไม่รองรับคำว่า NEVER release ระหว่าง pending autosave ตาม Task

**Smallest fix:** ให้ renderer มีสถานะ pending debounce ที่เชื่อถือได้ (เช่น reset `saveTimer = null` ตอน callback เริ่มและทุกเส้นทาง cancel), แล้ว probe reject pending timer ทั้งก่อนและหลัง await/fetch พร้อม regression test ที่ execute `scheduleSave` และ response ของ save ก่อนหน้า ตัว `saveTimer` ปัจจุบันค้างเป็น timer ID หลัง callback/บาง clearTimeout จึงเพิ่ม `if (saveTimer)` อย่างเดียวจะ pin renderer หลังเคย save. หากต้องรักษา invariant ข้าม clean reply → destroy อย่างเคร่งครัด ให้มี release handshake ที่ยืนยัน quiescence และไม่ให้เริ่ม save ใหม่ระหว่าง handoff; read-only snapshot อย่างเดียวไม่ใช่ atomic guarantee. Renderer edit ต้องให้ coordinator มอบหมาย renderer lane

### Minor R-P4-2-m1 — Route tests ใช้ hash ที่ renderer ไม่รองรับ

**Evidence:** `scripts/tests/electron-tray-window.test.mjs:32`, `:36`; `scripts/tests/electron-host.test.mjs:80`, `:89`; renderer `scripts/discord-presence-studio.html:3338`, `:3344`, `:3351`

**Scenario / reasoned from actual router:** Tests restore `#/scenes/example` และยืนยัน loadURL string สำเร็จ แต่ real renderer accepts เฉพาะ `#/status`, `#/scenes`, `#/settings`; hash ใน test จะ fallback และ normalize เป็น `#/status`. จึงเป็นหลักฐาน URL transport ไม่ใช่การกลับไป screen ที่อ้างถึง ไม่พบข้อผิดพลาดใน controller สำหรับ canonical route จริง และไม่ถือว่า selected Scene/detail restoration อยู่ในขอบเขตที่ author รับรอง

**Smallest fix:** ใช้ canonical `#/scenes` / `#/settings` ใน host/controller tests และ assert ผ่าน `resolveStudioScreen` จริงอย่างน้อยหนึ่งกรณี เพื่อแยก screen restoration ออกจาก detail/selection state ที่ไม่ได้ persist

## Verified behavior and limits

- **Dirty / failed / unknown:** probe อ่าน classic-script lexical bindings จริง; missing bindings, incomplete document, missing config/Scene, rejected GET/probe และ timeout retain. `settingsFormDirty`, `_lastSave`, busy buttons, `applyBusy`, `saveChain` identity, persisted scenes/slots, mappingDraft และ current DOM fields ถูกตรวจ. DOM comparison ป้องกัน current Scene draft ที่ stale saved label ซ่อนอยู่; whole-config comparison ป้องกัน draft ของ Scene อื่นที่ยังอยู่ใน config. Explicit failed state ยัง retain. ไม่พบการคืน clean สำหรับ failed save ที่ยังถูกระบุเป็น error; Major ข้างต้นเป็นช่องว่างของ debounce ที่ยังไม่ได้ enqueue
- **Open / release / quit:** `tray-window.mjs:41`, `:59`, `:68`, `:78` invalidate generation และตรวจ captured window identity, visibility, canRelease ก่อน destroy. Main `:90` ไม่ล้าง window ใหม่จาก old closed event; `:296` ตั้ง appQuitting synchronously และ `:281` stop controller ก่อน server stop. Existing tests และ supplementary behavioral harness ผ่าน reopen during grace, repeated hide/show (timer เดียว), quit during pending probe, timeout + late clean resolution, และ reentrant open ระหว่าง fake destroy ที่ emit old closed ตามหลัง creation ใหม่
- **IPC / navigation:** `electron/main.js:228` resolve current `mainWindow` ทุก invocation; `electron/security.mjs:8` เปรียบเทียบ exact webContents และ exact parentless mainFrame; `main.js:82` ติด navigation guard ให้ window ทุกครั้ง ไม่มี stale sender ID cache. Supplementary harness ยืนยัน new frame accepted, old contents และ distinct foreign frame rejected. Existing host IPC/navigation scenarios ผ่าน; host tray-release case ยังไม่ได้รวม assertions เหล่านี้หลัง recreate โดยตรง
- **Destroyed sends / tray:** `electron/lifecycle.mjs:2` guards และ catches destruction around update send; `main.js:96` guards maximize send; update events refresh tray แม้ไม่มี renderer. Source search พบ send paths สองจุดนี้และไม่พบ native Notification/displayBalloon path. Host updater events หลัง release ผ่าน
- **Accepted baseline:** `git diff 3e477d0 -- electron/security.mjs electron/lifecycle.mjs` ว่าง. Owned-server startup, login-item gating, bounded/idempotent shutdown ไม่ถูกเปลี่ยนใน P4-2 main diff; baseline failure-path tests ผ่าน
- **Test quality:** P4-2 additions execute actual controller/probe functions และ actual main module ผ่าน host adapters ไม่ใช่ source-string assertions. Fixture เริ่มต้นด้วย synthetic globals และ formScene stub จึงไม่ครอบคลุม scheduling interaction ที่ M1 reproduce จาก renderer functions จริง Existing suite มี source-string smoke checks อยู่ก่อนแล้ว ไม่ใช่หลักฐานหลักของ review นี้

## Commands and observed counts

| Command | Observed result |
| --- | --- |
| `node --test scripts/tests/electron-*.test.mjs` | 36 passed, 0 failed, 0 skipped, 0 cancelled |
| `npm test` (once) | 134 passed, 0 failed, 0 skipped, 0 cancelled |
| Supplemental inline Node lifecycle/security harness | 6 behavioral scenarios passed |
| Inline actual renderer save/debounce reproduction | clean with pending 650 ms timer; timer then starts saving |

Whole suite ran against the concurrent working tree; counts include tests outside P4-2 และไม่ใช้เป็น acceptance ของ P4-1. ไม่มี rerun ของ npm test ไม่มี Electron launch, browser control, native tray interaction, real Discord, HKCU Run mutation หรือ process/listener บน ports 47391–47397 ที่ reviewer เริ่มเอง Supplementary fake URLs ไม่ bind listener

Reviewer ไม่ตรวจยืนยัน author footprint/latency measurements ใหม่; native destroy/event timing, packaged updater, first paint และ owner visual acceptance ยังเป็น proof limits. ไฟล์ที่ reviewer เปลี่ยนมีเฉพาะรายงานนี้ ไม่มี source edits หรือ commits
