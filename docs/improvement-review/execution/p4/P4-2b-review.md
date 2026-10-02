# R-P4-2b — Narrow re-review

**Verdict: Rework.** R-P4-2-M1 ปิดเฉพาะ pending-debounce hole แต่ยังไม่ปิด clean-reply → destroy race; R-P4-2-m1 ปิดแล้ว.

ตรวจ source แบบ read-only บน `improve/flow-ux`, HEAD `c44b871780cebfd86082b1a592d7886ccb57701a` + uncommitted tree. ขอบเขตเฉพาะ P4-2b; ไม่ review detector/server หรือ footprint ใหม่. เป้าหมายคือ release เฉพาะ renderer ที่ไม่มี pending save; ทางเลือกเล็กที่สุดเมื่อพิสูจน์ quiescence ไม่ได้คือ retain ไว้ก่อน.

## Major R-P4-2-M1 — Second probe ยังเป็น snapshot ไม่ใช่ release handoff

**Evidence:** `electron/tray-window.mjs:68-83` โดยเฉพาะ `:71`, `:77-82`; `scripts/discord-presence-studio.html:2789-2828`. Second probe ส่ง clean กลับ แล้ว main ตรวจเฉพาะ window identity/visibility/generation/URL ก่อน destroy; save activity ไม่ invalidate generation.

**Scenario:** Renderer ตอบ clean ครั้งที่สอง แล้วเริ่ม `saveConfig(false)` ระหว่าง reply delivery กับ main continuation. Main ยังรับ snapshot clean และ destroy ขณะ save อยู่ใน flight. การเพิ่ม read-only probe อีกครั้งลดช่วง race แต่ย้ายช่องว่างไปหลังคำตอบสุดท้าย จึงยังไม่รองรับข้อกำหนด retain หาก save เริ่มระหว่าง clean reply และ destroy.

**Reproduced with injected transport interleaving, not native Electron:** Inline Node/VM harness execute `createTrayWindow`, `readStudioSaveState` และ `saveConfig` จริงจาก HTML; probe adapter อ่าน clean ครั้งที่สอง แล้วเรียก actual `saveConfig(false)` ก่อนส่ง reply ให้ controller โดย PUT response ถูก defer. ผล `{"cleanReplies":2,"lastSaveAtDestroy":"saving","saveButtonDisabledAtDestroy":true,"destroyed":true}`. นี่พิสูจน์ controller ไม่มี guard สำหรับ interleaving นี้; ไม่ได้พิสูจน์ native timing frequency หรือ disk data loss.

**Smallest fix:** Retain จนมี release handshake ที่ renderer ยืนยัน quiescence และกัน/ยกเลิก release เมื่อมี save ใหม่ตลอดช่วง handoff; ถ้ายังไม่เพิ่ม handshake ให้ disable destroy path ไว้ก่อน. เพิ่ม regression ที่เริ่ม actual save หลัง final clean snapshot แต่ก่อน host destroy แล้ว assert retain; เพิ่ม snapshot อีกครั้งอย่างเดียวไม่ปิด invariant นี้.

## Closed checks

- **Pending debounce / later edit:** `electron/tray-window.mjs:8,12,17,20` reject non-null timer ก่อน/หลัง async boundaries. `scripts/tests/electron-tray-window.test.mjs:109-177` execute actual renderer save/schedule functions: previous save response + pending debounce → dirty; fired timer ID → null; subsequent save settled → clean; later edit → dirty. จึงไม่พบ stale timer ID ที่ pin renderer หลัง save สำเร็จ.
- **Route m1:** Controller/host tests ใช้ `#/scenes` / `#/settings`; actual `resolveStudioScreen` execution ที่ `scripts/tests/electron-tray-window.test.mjs:180-188` ยืนยัน canonical routes. Scope คือ screen restoration เท่านั้น.
- **Renderer scope:** HTML diff มีเฉพาะ reset `saveTimer` ใน replacement/validation, callback start, Discord action และ form submit (`:2833-2843`, `:2868-2869`, `:3151-3152`). pagehide reset (`:2852-2853`) มีอยู่ก่อน diff นี้. Timeout 650 ms, save invocation, validation และ UI/copy ไม่เปลี่ยน; ไม่พบ behavior change นอก timer bookkeeping ที่ probe ต้องใช้.

## Validation

| Command | Observed result |
| --- | --- |
| `node --test scripts/tests/electron-*.test.mjs` | 40 passed, 0 failed, 0 skipped, 0 cancelled |
| `npm test` — once | 138 passed, 0 failed, 0 skipped, 0 cancelled |
| Inline actual-source final-reply race harness | Reproduced destroy while saving, as above |

Tests ผ่านไม่ครอบคลุม final-reply race; existing two-probe test ตอบ clean → dirty เท่านั้น (`scripts/tests/electron-tray-window.test.mjs:54-62`). ไม่มี browser control/native Electron launch, real Discord, source edits หรือ commits. Reviewer เขียนเฉพาะรายงานนี้; native interprocess timing และ visual acceptance ยังไม่ได้ตรวจ.
