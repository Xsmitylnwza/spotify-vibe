# Runtime architecture and improvement review

Baseline: `b241ccd5542b1f3e5ee348bd507cac051cafabda` · version `1.0.7` · ตรวจ 2026-10-01 ใน `C:/letmecook-lab/spotify-vibe` เท่านั้น

ผู้ตรวจ: runtime worker · Task `task_412721acfdf0` · Dispatch `ctx_bbdeae7822be`

## ข้อสรุปและระดับหลักฐาน

โครงสร้างเดิมมี seam ที่นำกลับมาใช้ได้ดี: selector และ scheduler เป็น pure functions, config store serialize disk writes, Discord writes มี queue และ deduplication, reconnect คำนวณ Scene ใหม่ และ Codex package matching รักษา identity ของ installation ไว้ สิ่งที่ควรแก้ก่อนต่อยอดคือ ownership ของ config mutation ทั้ง transaction, การเปลี่ยน mode โดยเปิด Studio, การจัดการ desired state ที่ว่าง และ validation หลังประกอบ outgoing activity

ไม่พบ **Blocker ที่ยืนยันได้** ใน lane นี้ พบ **Major 6 รายการ** และ **Nit 3 รายการ** ด้านล่าง โดยคำว่า Major ไม่ได้แปลว่าพบเหตุการณ์ผิดพลาดบนเครื่องเจ้าของแล้ว รายการที่ต้องเลือกนโยบายจะระบุแยกจาก defect ที่พิสูจน์ได้

- **Source-verified:** อ่าน implementation ณ baseline; หลักฐานเป็น `file:line` และ isolated probe เมื่อระบุไว้
- **Isolated probe:** ใช้ fixture และ mock ในหน่วยความจำ ไม่ได้เปิด HTTP server, helper, companion, Electron หรือ Discord RPC และไม่แตะ user app data/secrets
- **Runtime gate:** ต้องพิสูจน์เพิ่มด้วย adapter fixture หรือ Windows/Discord จริงที่ได้รับอนุญาต; ผลในรายงานนี้ไม่ใช่หลักฐาน Discord rendering
- Coordinator แจ้ง baseline `npm test`: **56 pass, 0 fail** และพบ Electron binary preparation error `os error 183`; เป็น **coordinator-reported evidence** ผู้ตรวจไม่ได้รัน suite ซ้ำและไม่ได้ยืนยัน desktop/package validity

## ขอบเขตและการตัดสินใจปัจจุบัน

อ่าน `CONTEXT.md`, `docs/presence-studio/CONTEXT.md`, current scheduled-product requirements, `APP-SETUP-JOURNEY.md`, `IMPLEMENTATION-STATUS.md`, `RUNNING-APPS.md`, `UPDATE-LATENCY.md`, `CODEX-SESSION.md`, `CODEX-VERSION-MATCHING.md`, app mapping decisions และ runtime sections ของแผน/audit เดิม โค้ดปัจจุบันมีน้ำหนักมากกว่าคำกล่าวว่า implemented หรือจำนวน tests ในเอกสารเก่า

| ประเด็น | implementation ที่ต้องใช้เป็นฐาน |
| --- | --- |
| Product direction | Studio ปัจจุบันเป็น app-first; เวลาอยู่ใน backend/schema แต่หน้าเปิด Studio พยายามเปลี่ยน schedule config เป็น apps (`scripts/discord-presence-studio.html:3629-3641`) |
| หลายแอป | ใช้ mapped executable ที่ **ยังรันอยู่** แม้อยู่ background; foreground ที่ผ่าน settler ล่าสุดชนะ; ลำดับ mappings ตัดสินกรณีไม่มี recent use (`scripts/app-presence.mjs:27-34`) สอดคล้อง `RUNNING-APPS.md` และแทน foreground-only decision เก่า |
| Unmapped foreground | ไม่ล้าง Presence ถ้ายังมี eligible mapped app รันอยู่; ถ้าไม่มี winner จึง clear ใน apps mode (`scripts/studio-server.mjs:195-200`, `:454-455`) ไม่มี schedule fallback ใน apps mode |
| Manual override | มาก่อน auto; apps pin 1 ชั่วโมง, schedule pin จน next slot (`scripts/studio-server.mjs:185-194`, `:555-570`) ไม่มี mood/outfit inference หรือ automatic selected-thread tracking |
| Mapping activation | `PUT /api/app-mappings` save แล้ว resume auto และ cancel pin เสมอ (`scripts/studio-server.mjs:769-775`); เอกสาร setup เก่าเรียกสิ่งนี้ Save and activate แต่ UI ปัจจุบันเรียกจาก tile toggle ทันที (`scripts/discord-presence-studio.html:3529-3554`) |
| Scene save | autosave เก็บทุก scenes/slots และ force reconcile ของ Live Scene; save **ไม่สร้าง override ใหม่** การ refresh Live Scene ขณะ save อนุญาตอยู่ใน scheduled-product contract ส่วน Show/Update save ก่อน POST override (`scripts/studio-server.mjs:525-538`; `scripts/discord-presence-studio.html:2863-2888`) |
| Codex session | title เจ้าของเลือกเอง + persisted wall-clock start; ไม่อ่านบทสนทนาและไม่ติดตาม thread ที่เปิดอยู่ (`scripts/codex-session.mjs:1-18`, `scripts/studio-server.mjs:750-755`) |

ข้อเสนอด้านล่างรักษา app-first และ running-app policy ไม่เสนอเพิ่ม calendar, cloud, AI tracking หรือเปลี่ยนเกม/idle policy เอง การอยู่ร่วมกับ native game Presence, lock/idle และรูปลักษณ์ใน viewer เป็น gate ที่ยังไม่มีหลักฐานจาก source นี้

## Ownership และเส้นทางหลัก

```text
CLI wrapper / Electron main
  -> startStudioServer
      -> validated disk config + secrets resolution + bundled public Application ID
      -> HTTP mutations / Windows snapshots / clock heartbeat / Discord reconnect
          -> config state + desiredPresence
              -> mapping selector OR local-time scheduler, with manual override first
              -> app badge + selected Codex session projection
              -> serialized Discord queue -> SET_ACTIVITY / clearActivity
                  -> runtime last-success/current/applied fields -> /api/state -> Studio
```

`startStudioServer` เป็น owner หลักของ mutable config, timers, client, latest app snapshot และ applied state (`scripts/studio-server.mjs:68-124`) จุดที่ควรเสริมคือ transaction boundary: disk queue กับ Discord queue เป็นคนละ queue และไม่มี queue ที่ครอบ read → modify → persist → publish config

| Entry → owner / branch | State / persistence / side effect | Recovery → ผลที่สังเกตได้ |
| --- | --- | --- |
| CLI `scripts/discord-presence-studio.mjs:5-9`; Electron `electron/main.js:300-304` → `startStudioServer` | โหลด config ก่อน listen (`scripts/studio-server.mjs:68-80`); normalize schema v2; fallback public Application ID (`:82-83`) | config store สร้าง default หรือ backup/recover (`scripts/local-config-store.mjs:32-67`); ไม่มี browser dependency สำหรับการเลือก Scene |
| `watchWindowsApps` → latest `appSnapshot`, `stableForeground`, `recentApplications` (`scripts/studio-server.mjs:907-912`) | PowerShell ส่ง running readable paths และ visible window metadata; settler 200 ms; recent list ไม่ persist | unmatched foreground ยัง fallback เป็น running mapping; helper failure ส่ง empty/error snapshot แต่ไม่ restart helper (`scripts/windows-apps.mjs:13-18`) |
| `desiredPresence` (`scripts/studio-server.mjs:185-209`) | active override → paused → apps winner หรือ schedule active slot; app + schedule เป็น mutually exclusive modes | app no-match ได้ source `unmapped`; schedule no-slot ได้ `no-slots`; ไม่ควรถือว่าสองสถานะนี้เป็น detector error |
| POST `/api/override` หรือ `/api/presence` (`scripts/studio-server.mjs:817-820`, `:854-857`) | validate Scene → set `scheduleEnabled:true` → expiry 1h/next slot → persist → force apply | Offline รับ intent ได้และคืน `applied:false`; reconnect re-evaluates current intent; UI แยก saved/waiting จาก applied (`scripts/discord-presence-studio.html:2886-2888`) |
| DELETE override (`scripts/studio-server.mjs:573-576`, `:824-826`) | clear manual intent, persist, force reconcile auto | กลับ winner ปัจจุบัน ไม่ใช้ snapshot ตอนเริ่ม pin; empty desired ใน schedule มีข้อบกพร่อง M3 |
| POST schedule (`scripts/studio-server.mjs:541-552`, `:830-833`) | pause persist false + clear override + stop timer; resume persist true + force reconcile | pause ไม่มี clear ตรง ๆ แต่ apps watcher เรียก reconcile แล้ว clear; schedule คง card เดิม ดู M3 |
| DELETE presence (`scripts/studio-server.mjs:590-600`, `:861-863`) | persist paused + override null → null desired key → queue clear | clear ที่ offline คืน false ภายใน แต่ API คืน `ok:true` โดยไม่ส่งผล clear; ควรแยก intent receipt กับ Discord acknowledgement ใน observability proposal |
| PUT config (`scripts/studio-server.mjs:525-538`, `:783-785`) | validate scenes/slots + retain valid override → save → force refresh current desired Scene | deleting mapped preset ถูก validator ปฏิเสธ; failed persistence และ overlapping mutations มี M1 |
| PUT mappings (`scripts/studio-server.mjs:769-775`) | normalize path/unique mapping/reference → save selection mode + mappings + resume + cancel pin → force reconcile | validator มี legacy schedule default และ Codex version identity; opening Studio มี behavior migration คนละขั้น ดู M2 |
| PUT Codex session (`scripts/studio-server.mjs:750-755`) | store title/start (retain start unless restart) → force reconcile; session adds activity key (`:448-450`) | app switches/reconnect ใช้ persisted start; generic Codex เมื่อ clear; one-character title ยังผ่าน save แต่สร้าง payload ไม่ได้ ดู M4 |
| clock heartbeat (`scripts/studio-server.mjs:419-459`) | expire override → persist expiration → recalculate local minute → apply/clear → next timer ≤60s | recovery จาก clock jump/sleep เป็น recomputation ไม่ replay missed slots; ไม่มี resume event; rejection อาจทำให้ timer loop หยุด ดู M6 |
| connect/disconnect (`scripts/studio-server.mjs:269-295`, `:380-410`) | IPC client owner guard, bounded 1/2/4/8/16/30s backoff, reset applied key, force current Scene after login | offline intent survives; runtime ส่ง connectionState/nextReconnectAt/error; actual reconnection, viewer/game coexistence ยังเป็น runtime gate |
| installed catalog (`scripts/studio-server.mjs:761-766`, `:915`) | module-level disk cache + single-flight background Start Menu scan; ไม่มีผลเลือก live app โดยตรง | timeout 120s และ best-effort retained old cache; singleton output/refresh status มี M5/N2 |
| quit (`scripts/studio-server.mjs:671-687`) | stop watcher/timers → close HTTP → queue clear if active → destroy client | ไม่มี bounded drain timeout ของ queue; hung transport เป็น runtime gate ไม่ใช่ confirmed hang จากการอ่าน source |

## Findings: Blocker / Major / Nit

### Blocker

ไม่พบรายการที่พิสูจน์ว่าไม่สามารถใช้ baseline นี้ต่อได้ ห้ามนำข้อสรุปนี้ไปแทน security review, installer acceptance หรือ Discord viewer verification

### Major M1 — disk queue ไม่ครอบ config transaction: lost update และ failed save ยังเปลี่ยน runtime config

**Finding / consequence:** `persistConfig` assign ผล save กลับ global `config` หลัง await ขณะที่ mutation ถัดไปอ่าน/เปลี่ยน global ตัวเดียวกันได้ save เก่าจึงนำ snapshot เก่ากลับมาทับการเปลี่ยนที่อยู่ระหว่างรอ save ต่อไป ทำให้ unrelated mutation สร้าง snapshot ที่ลืมข้อมูลใหม่แล้วเขียนทับข้อมูลที่ API ตอบว่าบันทึกสำเร็จ อีกทางหนึ่ง config/scenes และ pause เปลี่ยน global ก่อน save สำเร็จ; disk-full/rejected write ทำให้ API error แต่ next reconcile ใช้ค่าที่ยังไม่ได้ persist

**Exact evidence:** `scripts/studio-server.mjs:429-430` (assign after await), `:530-537` (publish before persist), `:542-550` (pause/resume), `:752-754` (session transaction), `:582-587` (unrelated autostart setting). `scripts/local-config-store.mjs:25-29` serialize เฉพาะ immutable normalized **disk writes** จึงไม่แก้ lost update ระดับ server

**Source-verified + isolated probes P2/P8:** P2 reject save แล้ว memory ยังเป็น `Changed but unsaved`; P8 resolve writes ตามลำดับทั่วไป → Codex session → autostart โดยไม่มี write reorder แต่ config สุดท้ายสูญเสีย Codex session ที่ transaction ที่สองตอบสำเร็จแล้ว เป็น harness ที่สกัด function ตรงจาก source, ไม่มี HTTP concurrency measurement จริง

**Smallest sufficient correction:** เพิ่ม `mutateConfig(fn)` queue หนึ่งตัวใน server; อ่าน committed config ภายใน queue, validate `next`, await store.save(next), publish committed config แล้วจึง schedule reconciliation ห้าม assign config ก่อน persistence สำเร็จ ให้ failure ทิ้ง draft ไว้ฝั่ง caller และเก็บ committed state เดิม expiration/mappings/session/settings ทุก entry ใช้ boundary เดียวกัน

**Simpler alternative / boundary:** ไม่ต้องเพิ่ม database, reducer framework หรือแยกหลายบริการ disk queue ที่มีอยู่ใช้ต่อได้ หลัง transaction serial แล้วค่อยพิจารณา revision conflict สำหรับ stale full-document saves จากหลายแท็บ; server queue เพียงอย่างเดียวไม่ป้องกัน client payload เก่าที่ตั้งใจส่ง scenes/slots ทั้งชุด

**Acceptance:** save scenes เริ่มค้าง → share session → toggle setting → resolve ตามลำดับ: disk/config/API ต้องมีทั้ง edits/session/setting; reject save แล้ว GET config และ outgoing intent ต้องยังอ้าง committed revision; retry สำเร็จได้โดยไม่ต้อง restart

### Major M2 — เปิด Studio ทำ behavior migration ที่ resume auto และลบ pin/paused intent โดยไม่ได้กด activate

**Finding / consequence:** `initialize` เห็น schedule mode แล้ว PUT apps mappings ทันที; backend บังคับ `scheduleEnabled:true` และ `manualOverride:null` ถ้า legacy config ไม่มี mappings การเปิดหน้าเพื่อตรวจสถานะทำให้ schedule หยุดเป็นผู้เลือกและ apps mode clear ได้ ถ้า paused/pinned อยู่ intent นั้นถูกเปลี่ยนและ persist เปิดแท็บครั้งต่อไปก็ใช้ผลนั้นต่อ

**Exact evidence:** `scripts/discord-presence-studio.html:3622-3641` (read → implicit PUT → hardcoded apps); `scripts/studio-server.mjs:769-774` (resume/cancel/save/reconcile); `scripts/presence-config.mjs:175-180` (legacy mode/paused intent normalization); `scripts/local-config-store.mjs:38-42` backup เฉพาะ parsed **v1**. Existing v2 schedule config ไม่มี backup ใน behavior migration นี้. หลัง migration UI ยัง assign `runtime = loadedRuntime` ที่ `scripts/discord-presence-studio.html:3645` จึงแสดง pre-migration state ชั่วคราว

**Source-verified; product intent gate:** app-first เป็นทิศทางปัจจุบัน และ comment ตั้งใจเอา time features ออกจาก Studio ไม่จัดการเปลี่ยน UI นี้เป็น accidental bug การลบ choice ตอน read และการไม่มี recovery สำหรับ v2 เป็นประเด็นที่ควรเปลี่ยนโดยรักษา app-first. `APP-SETUP-JOURNEY.md` เดิมระบุ legacy schedule จนเจ้าของ activate; claim นี้ไม่ตรง implementation ปัจจุบัน

**Smallest sufficient correction:** initial load เป็น read-only; แยก schema normalization ออกจาก behavior activation ให้เปลี่ยน legacy selection เมื่อเจ้าของเลือก activate mapping ครั้งแรก พร้อม preserving paused/manual intent ตาม explicit action contract ทำ backup ของ config ก่อนเปลี่ยน behavior ไม่อาศัยว่า version ต้องเป็น 1 และใช้ runtime ที่ได้จาก mutation ล่าสุด

**Simpler alternative:** migration acknowledgement/action เดียวสำหรับ legacy config ไม่ต้องคืนหน้า scheduler หรือสร้าง onboarding ใหม่; fresh installs ใช้ apps mode เดิมได้

**Acceptance:** เปิด/ปิด/เปิด Studio ด้วย legacy v1 และ v2 schedule config ที่ paused หรือมี valid pin: disk byte content/selection/paused/pin ไม่เปลี่ยนจาก read; explicit activation มี backup และ rollback; reopening ไม่ activate ซ้ำ

### Major M3 — empty desired ไม่ clear ใน schedule และ pause ให้ผลต่างกันตาม mode

**Finding / consequence:** `reconcilePresence` clear เมื่อไม่มี scene เฉพาะ apps mode การ save `slots:[]` หรือ disable all slots ขณะ schedule มี active Presence ทิ้ง Scene เดิมบน Discord ทั้งที่ desiredSceneId เป็น null. ส่วน pause stop timer แต่ไม่ clear; apps watcher ยังทำ reconcile ทุก snapshot จึงล้าง card ที่ pause ต่อมา ขณะที่ schedule mode คง card เดิม

**Exact evidence:** `scripts/studio-server.mjs:194-208`, `:447-457`, `:541-552`, `:907-912`; validator อนุญาตไม่มี slots (`scripts/presence-config.mjs:145-149`). Explicit clear เป็นอีก endpoint และ clear desired keys (`scripts/studio-server.mjs:590-600`)

**Source-verified + P1/P3:** no-slot path คืน desired null, active true, clear calls 0; pause + next reconcile ใน apps clear หนึ่งครั้ง แต่ schedule ไม่ clear. No-slot stale selection เป็น defect; ควรเลือกความหมาย Pause ก่อนแก้ส่วน pause ไม่อ้างว่า owner อนุมัติ freeze หรือ hide แล้ว

**Smallest sufficient correction:** resolve intent แบบชัด `apply(scene)` / `hold` / `clear` ไม่ใช้ selectionMode เป็นเงื่อนไข clear รวม ๆ no-enabled-slot ให้ clear พร้อม source `no-slots`; pause ใช้ contract เดียวทั้งสอง modes และไม่ถูก watcher ข้าม การ save mappings ที่ resume/cancel pin ต้องผูกกับ explicit activation contract (M2)

**Simpler alternative:** รักษา pause และ clear เป็นสองคำสั่งเดิม โดยกำหนด pause ให้ hold last acknowledged activity และ clear ให้ persist hidden/paused intent; ถ้าจะเลือก pause=clear ให้ใช้เหมือนกันและปรับ copy โดย coordinator ตัดสินก่อน ไม่เพิ่ม Away inference

**Acceptance:** disable last slot → exactly one clear; pause ระหว่าง app switch/slot boundary → ผลตาม contract เดียวกัน; explicit clear + reconnect/restart + subsequent detection → ไม่กลับมาจน explicit resume/activate; cancel pin ขณะไม่มี eligible app → clear

### Major M4 — config ที่ valid อาจสร้าง outgoing activity ที่ invalid หลังเพิ่ม session/app name

**Finding / consequence:** Codex title 1 ตัวอักษรผ่าน validator แล้วกลายเป็น Details ที่ activity validator บังคับอย่างน้อย 2 ตัว mapping name 1 ตัวอักษรผ่าน config แล้วกลายเป็น Activity name ที่ต้องอย่างน้อย 2 ตัว ข้อมูล save สำเร็จแต่ไม่ส่ง Presence; reconcile คืน false และ lastError แทนการ apply ในขณะที่ PUT session/mappings ยังตอบ 200. ถ้ามี card เดิมจะยังคงอยู่

**Exact evidence:** `scripts/codex-session.mjs:3-7`, `:13-16`; `scripts/app-presence.mjs:18`; `scripts/application-badges.mjs:14-15`; `scripts/presence-config.mjs:97-99`, `:280-281`; delivery error path `scripts/studio-server.mjs:316-320`; successful mutation receipts `:754-755`, `:774-775`

**Source-verified + P5/P6:** `{title:'x'}` save-valid แต่ throws `Details must contain 2–128 characters`; `{name:'R'}` mapping-valid แต่ throws `Activity name must contain 2–128 characters`

**Smallest sufficient correction:** share field constraints ระหว่าง input และ outgoing projection แล้ว validate **derived** activity ก่อน commit/activate session/mapping ถ้าตั้งใจรองรับชื่อสั้นให้มี deterministic compatible display fallback แยกจาก user label ไม่ silently overwrite title เจ้าของ

**Simpler alternative:** reject title/name 1 ตัวอักษรพร้อม field error ตั้งแต่ mutation boundary ก็เพียงพอ ไม่ต้องออกแบบ session model ใหม่

**Acceptance:** title/name 1, 2 และ 128 ตัวอักษรมี consistent result; invalid request ไม่เปลี่ยน disk/runtime selection; valid transformed Codex activity/type/timestamp/button/art fields ผ่าน createDiscordActivity; API แยก persisted/queued/applied/error

### Major M5 — Start Menu scan ที่ได้หนึ่งแอปถูก parser ทิ้ง และชนิด target ไม่ตรง validator

**Finding / consequence:** PS pipeline ส่ง object เมื่อมีผลลัพธ์หนึ่งรายการ แต่ Node รับเฉพาะ JSON array จึงตีความ single valid installed app เป็น empty discovery. Catalog ยังยอมรับ `.bat`/`.cmd` ซึ่งนำไปเลือก mapping ไม่ได้เพราะ validator ต้อง full `.exe` path. ไม่อ้างว่าเครื่องเจ้าของมี shortcut cardinality/target แบบนี้อยู่จริง

**Exact evidence:** `scripts/installed-apps.ps1:51`, `:67-68`; `scripts/installed-apps.mjs:43-46`; `scripts/app-presence.mjs:14`. Manual path validation เป็น `.exe` เช่นกัน

**Source-verified + PS fixture:** `@([pscustomobject]@{name='Fixture';executable='C:\Apps\Fixture.exe';icon=$null}) | ConvertTo-Json -Depth 3 -Compress` ส่ง object; two items ส่ง array; zero items ไม่ส่งข้อความ. Fixtures ไม่มี enumeration หรือ reads จาก Start Menu จริง

**Smallest sufficient correction:** ใช้ explicit array input ตอน serialize PS และ schema-check result ใน Node: cardinality 0/1/N ต้องเป็น array เสมอ; filter catalog เป็น target ที่ live detector/mapping รองรับจริง

**Simpler alternative:** Node normalize singleton object เป็น `[object]` หลัง validate shape; exclude bat/cmd. อย่าเดา process executable จาก launcher โดยไม่มี identity evidence

**Acceptance:** fixture output 0/1/2 รายการ parse ได้ตามจำนวน; malformed/failure output แยกจาก valid empty; batch/launcher shortcuts ไม่แสดงเป็น selectable executable ที่จะ save fail; same executable dedup และ manual exe fallback ยังใช้ได้

### Major M6 — clock timer เรียก async reconcile โดยไม่ catch/reschedule เมื่อ expiry persistence ล้มเหลว

**Finding / consequence:** timer callback ใช้ `void reconcilePresence` โดยไม่มี rejection handler. Expired override ต้อง await persistence ก่อน recompute/วาง timer ใหม่ ถ้า save reject loop หยุดก่อน `scheduleHeartbeat`; ใน schedule mode ไม่มี watcher reconcile มาทดแทน และ rejection อาจ terminate process ตาม Node unhandled-rejection behavior. ไม่ได้ทดลอง crash companion จริง

**Exact evidence:** `scripts/studio-server.mjs:424-425`, `:434-445`, `:457`; contrast apps callback มี catch ที่ `:911`. ไม่พบ `unhandledRejection` handler ใน server นี้. Timer reconnection ที่ `:285` ก็ fire-and-forget ควรอยู่ใต้ supervision เดียวกัน

**Source-verified; runtime gate:** missing catch และ skipped reschedule พิสูจน์จาก control flow; process termination depends on host Node/options/listeners และต้องทดสอบด้วย isolated harness ไม่ใช่ claim ว่า crash บนเครื่องเจ้าของแล้ว

**Smallest sufficient correction:** timer pump catch error, publish actionable persistence/connection error, schedule next bounded retry ใน finally; ใช้ committed config ตาม M1. Expired override ที่ timestamp ผ่านแล้วไม่ควรกลับมาเป็น desired card แม้ cleanup save ยัง retry อยู่

**Simpler alternative:** guarded `runHeartbeat` wrapper รอบ reconcile เดิม ไม่ต้องเปลี่ยน scheduler algorithm

**Acceptance:** mock store reject ตอน pin expires: companion harness ยัง alive, error observable, current valid auto scene resolve ได้ตาม contract, timer มี bounded next retry และไม่มี unhandled rejection; subsequent save success ล้าง persisted override และ error อย่างถูกต้อง

### Nit N1 — ป้องกัน stale งานก่อน RPC แต่ไม่ป้องกัน late acknowledgement/clear หลัง desired เปลี่ยน

**Finding / consequence:** queue ตรวจ desired key ก่อน SET (`scripts/studio-server.mjs:304-308`) แต่หลัง await request เขียน active/current/applied key โดยไม่ตรวจ candidate/revision (`:323-331`). Clear queue ก็ไม่มี intent generation check (`:342-357`). P4: initial apply ค้าง, mapped app ปิดทั้งหมดเมื่อ runtime.active ยัง false → reconcile ไม่ enqueue clear → late mock acknowledgement ทำให้ active true ทั้งที่ desiredKey null จน next reconcile. โดยทั่วไป watcher tick ถัดไปแก้เอง จึงจัด Nit ไม่อ้างว่า stale card อยู่ถาวร

**Smallest sufficient correction:** track one desired generation และ connection generation; ตรวจหลัง await ก่อน publish acknowledged state, แล้ว pump latest intent ให้จบ apply/clear แม้ active ยัง false ตอน desired กลายเป็น empty. Reuse existing queue. Fake acknowledgement หลัง client replacement, A→B→empty และ clear→A เป็น acceptance cases; measured viewer latency ยังเป็น gate

### Nit N2 — catalog refresh/empty/error/stale ไม่มี receipt และ forced refresh บล็อก request ได้ 120s

**Exact evidence / consequence:** `scripts/installed-apps.mjs:10`, `:38-46` รวม timeout/parse/error เป็น `[]`; `:55-63` update cache เฉพาะ nonempty ทำให้ successful empty scan คงรายการถอนติดตั้งไว้; `:87-95` คืน apps อย่างเดียว. HTTP `refresh=1` await scan (`scripts/studio-server.mjs:762-766`) ส่วนปุ่ม Refresh UI ขอ `/api/installed-apps` ไม่มี refresh flag (`scripts/discord-presence-studio.html:3564-3576`). Comment ว่า never blocks requests จึงไม่จริงสำหรับ explicit force route. ไม่ได้วัด real scan latency

**Smallest sufficient correction:** catalog adapter คืน `{apps, scannedAt, scanState, lastError}`; valid empty แทน cache ได้แต่ scan failure retain last-good พร้อม stale/error. Refresh request kick scan แล้วคืน cached result/status ทันที ใช้ single-flight เดิม และให้ปุ่ม refresh ระบุว่าขอ scan ใหม่จริง. ไม่ต้องเพิ่ม external indexing service

**Acceptance:** mock scan ค้าง 120s แต่ GET/refresh receipt ตอบทันทีตาม local request budget ที่ทีมกำหนด; timeout ไม่ล้าง last-good; successful empty ล้าง catalog; stale cache labeled; 10 refresh callers ใช้ scan เดียว

### Nit N3 — clock/DST และ observable state ยังขาด consistent boundary/error ownership

**Clock evidence:** `scripts/presence-scheduler.mjs:19-24` ใช้ local Date normalization; active slot ตัดสินจาก minute `:42-47` แต่ nextAt ตัดสินจาก normalized instant `:52-53`. ใน isolated `TZ=America/New_York` spring 2026-03-08 เวลา 01:50 คำนวณ 02:30 slot ว่าจะ switch 03:30 แต่ recompute ที่ 03:00 เลือก 02:30 slot แล้ว. Fall 2026-11-01 01:15 ครั้งที่สองคำนวณ next 01:30 เป็นวันถัดไป และ active slot ย้อนตาม wall minute. พฤติกรรมนี้ยืนยันได้ แต่ยังไม่มี approved repeated/missing-hour policy; ไม่เรียก DST ทั้งหมดว่า broken

**Observable evidence:** `scripts/studio-server.mjs:212-249` ผสม desired projection กับ current Scene จาก config ปัจจุบัน; `/api/state` ส่ง base scene (`:793`) ไม่ใช่ applied app badge/Codex payload. `nextSwitchAt/nextScene` มาจาก schedule แม้ apps mode. Error detector อยู่ `/api/apps` (`:758`) แต่ `/api/state` ไม่มี detector health. `watchWindowsApps` fail ส่ง empty/error และต้อง restart (`scripts/windows-apps.mjs:13-17`); connect success ล้าง lastError (`scripts/studio-server.mjs:402`) ทำให้ startup recovery warning ที่ใส่ตอน `:123` หายได้. ทั้งหมดเป็น source behavior ไม่ใช่ Discord viewer observation

**Smallest sufficient correction:** คำนวณ active/next จาก boundary instances ด้วย DST policy เดียว, เก็บ timezone/offset/clock-jump evidence; expose desired, last acknowledged payload, detector health/observedAt และ persistence warning แยกกันโดยไม่เพิ่ม surface ใหญ่. Unsupported/error snapshot ต้องแยกจาก healthy empty; เลือก last-good TTL หรือ clear-on-failure อย่างชัดเจน. ไม่เพิ่ม idle/lock inference อัตโนมัติ

**Acceptance:** spring gap/fall repeat fixtures + Asia/Bangkok rollover; clock forward/backward และ wake recompute latest intent โดยไม่ replay; detector exit → state บอก detection failed และ bounded recovery path; config-recovery warning ไม่หายเพราะ Discord login สำเร็จ; last acknowledged Codex state แสดง title/start/badge ที่ส่งจริง และ offline ระบุ acknowledgement freshness

## Strengths และ reuse seams

| Seam | หลักฐาน | คงไว้ / ใช้ต่ออย่างไร |
| --- | --- | --- |
| Pure scheduler | `scripts/presence-scheduler.mjs:3-66` | strict HH:MM, disabled slot filtering, midnight wrap, bounded heartbeat; เพิ่ม clock/DST fixtures ก่อนแก้ boundary implementation |
| Pure app selector | `scripts/app-presence.mjs:1-44` | exact path + recent eligible mapping + deterministic mapping order; อย่าแทนด้วย process-name substring matching |
| Codex identity migration | `scripts/app-presence.mjs:2-4`; UI counterpart `scripts/discord-presence-studio.html:3420-3422` | ignores four-part Codex version only; installation/architecture/publisher/exe ยังสำคัญ; share implementation หรือ parity test กัน drift ไม่ normalize Discord/game versions อย่างกว้างเอง |
| Config validation/store | `scripts/presence-config.mjs:143-181`; `scripts/local-config-store.mjs:25-44` | reference checks ป้องกัน dangling slots/mappings, normalized writes, write-chain recovery, v1 backup; เสริม transaction owner รอบ seam เดิม |
| RPC queue | `scripts/studio-server.mjs:252-255`, `:301-308` | dedup same-key updates; rejects stale keys ก่อน submission; เสริม generation/pump ไม่รื้อ queue |
| Reconnect | `scripts/studio-server.mjs:279-285`, `:393-405` | bounded backoff และ candidate guard ตอน login; reapply latest desired หลัง connect ไม่ใช้ card เก่าค้าง |
| Delivery projection | `scripts/application-badges.mjs:12-15`; `scripts/codex-session.mjs:10-18` | immutable derivatives ไม่แก้ shared preset; public badge URLs และ no-window-title/thread-content boundary; validate derivative ก่อน commit |
| Timestamp identity | `scripts/studio-server.mjs:448-450`; `scripts/presence-config.mjs:283-287` | same key edits retain start, selected session restores persisted start; general app timers reset เมื่อ identity เปลี่ยนและไม่ persist ข้าม process ซึ่งต้องไม่สับสนกับ Codex elapsed |
| Catalog | `scripts/installed-apps.mjs:51-84` | background refresh, cached serving, single-flight; ปรับ shape/status ไม่ต้องใช้ OS scan ใน HTTP critical path |
| Studio save/apply | `scripts/discord-presence-studio.html:2827-2829`, `:2876-2888`, `:2934-2949` | scene save chain และ one poll in flight; saved vs applied:false messaging ใช้ต่อ; queue ฝั่ง UI ไม่ครอบ mapping/session/settings/multi-tab |

## Coverage matrix

คำว่า Covered หมายถึง trace/read source และ existing tests ไม่ได้หมายถึงรัน runtime branch จริง

| Surface / flow | Source coverage | Existing test evidence ที่อ่าน | Remaining proof gate |
| --- | --- | --- | --- |
| entry/load/default ID | Covered: wrapper, start server, Electron boot call, public ID fallback | `scripts/tests/studio-server.test.mjs:86`, `:173`; `discord-application.test.mjs:5-14` | bundled default end-to-end; current integration test opt-out default ไม่พิสูจน์ normal boot |
| scheduler/minute/midnight/disabled | Covered + pure DST inspection | `presence-scheduler.test.mjs:16-85` | DST policy, timezone change, actual Windows wake/clock change |
| override precedence/expiry | Covered desired/expiry/set/cancel paths | config persisted override `presence-config.test.mjs:42-52` | fake timer + transport integration; one-hour apps expiry; expire failure |
| pause/resume/clear/no-slot | Covered + P1/P3 | scheduler no slots pure test `presence-scheduler.test.mjs:76-80` | RPC/control transition assertions ไม่มีใน current tests |
| reconnect/disconnect/quit | Covered candidate guard, backoff, queue drain | server tests check configured state ไม่ assert SET/clear/reconnect transitions | fake client login/restart/race/hung RPC; Discord viewer acceptance |
| scenes save vs activate | Covered backend + relevant UI call path | server persistence `studio-server.test.mjs:130-145` | slow save/revision stale/multi-tab and ack receipts |
| config transaction failure/race | Covered + P2/P8 | store happy/recovery tests `local-config-store.test.mjs:9-45` | full server concurrency with injected store; revision conflict |
| mapping reference/selection/migration | Covered + legacy P7 + initialization trace | `app-presence.test.mjs:6-48`; server restart `studio-server.test.mjs:199-216` | page-load migration/pause/pin preservation; explicit activation semantics |
| running app precedence | Covered pure selector/settler | `running-presence.test.mjs:7-14`; foreground helper tests `app-presence.test.mjs:17-35` | minimized/tray/protected-process path visibility on Windows; launcher vs actual game identity |
| Windows helper/scan latency | Read all `windows-apps.mjs` and `.ps1`; no execution | ไม่มี helper child/NDJSON/error/restart test ใน test files ที่อ่าน | fake child parser + cadence/backpressure; bounded retry; actual resource/latency measurement |
| installed catalog | Read all `.mjs`/`.ps1`; PS cardinality fixture only | ไม่มี installed-apps tests ใน current `scripts/tests` | injected scan/cache/timeout/empty/malformed, data-directory isolation; actual discovery |
| Codex session/output/badges | Covered + P5/P6 | `codex-session.test.mjs:5-15`; `running-presence.test.mjs:16-22` | real API restart/pin/title errors + emitted activity acknowledgement |
| outgoing activity fields/assets | Covered create/validate/project/RPC path | `presence-config.test.mjs:64-72`; character-art tests reviewed by title/scope only | links/GIF/type/cropping/time/buttons in separate Discord viewer; no live URL fetching done in this review |
| observability / async races | Covered runtimeSnapshot/poll + P4/P8 | ไม่มี revision/generation/desired-vs-ack race test | mocked end-to-end receipt; helper failure vs empty; health error lifetimes |

**Test isolation limitation:** current server tests spawn companion (`scripts/tests/studio-server.test.mjs:38-51`), send a fixture Application ID (`:113-120`) and CLI ID (`:173-189`) but server builds real DiscordRPC client (`scripts/studio-server.mjs:391-396`). App detection disable flag ปิด watcher เท่านั้น; `initInstalledApps` ยังเรียกเสมอ (`:912-915`) จึงอาจอ่าน Start Menu จริงใน Windows tests. แยกข้อเท็จจริงนี้จาก coordinator-reported green baseline: green tests ไม่พิสูจน์ RPC output หรือ adapter isolation. ข้อเสนอแรกควรเพิ่ม injectable clock/config/Discord/detection/catalog adapters เพื่อทำ transition tests อย่างปลอดภัย; ไม่ได้เสนอเปิด runtime จริงในงาน review นี้

## Bounded improvement packages และ acceptance scenarios

| Package / scope | Smallest work / simpler alternative | Concrete acceptance scenarios |
| --- | --- | --- |
| **RP1 Committed config owner** — M1/M6 | transaction queue รอบ existing store + guarded timer wrapper; optional revision conflict แยกถัดไป | concurrent scenes/session/setting ไม่มี lost update; disk reject → memory/disk/live เดิม + retry; expire reject → alive/error/next timer; v1/v2 references preserved |
| **RP2 Explicit intent and latest acknowledgement** — M3/N1 | apply/hold/clear disposition + generation around existing RPC queue; ไม่ต้องเปลี่ยน architecture เป็น service หลายตัว | A→B→empty ก่อน slow A ack → latest empty จบด้วย clear; delayed clear→A ไม่ทิ้ง A; client generation เปลี่ยนแล้ว old completion ไม่เปลี่ยน active; pause/clear/resume contract เหมือนกันทั้ง modes |
| **RP3 Safe activation/migration** — M2 | load read-only, backup before mode transition, activate action preserves owner choices; app-first UI เดิม | paused schedule v1/v2 + valid pin เปิด Studio แล้วไม่ write; no mappings ไม่ silent clear; activate อย่างชัด restore ได้; refresh/mapping edit ระหว่าง pin ตาม explicit contract |
| **RP4 Delivery-valid metadata** — M4 | shared constraints/derived activity validation; reject short metadata เป็นทางแก้น้อยที่สุด | title/name boundaries consistent; failed validation disk/current unchanged; saved vs queued vs applied/error response; badges/session transforms isolate preset อื่น |
| **RP5 Discovery protocol and recovery** — M5/N2/N3 | array protocol + supported targets + status/observedAt + injected scanner; existing single-flight/cache ใช้ต่อ | 0/1/N valid apps; helper malformed/exit → detection failure ไม่ disguised healthy empty; old cache retained on failure, replaced on valid empty; forced refresh quick receipt; stopped server ไม่ทิ้ง scan resource ตาม agreed lifecycle |
| **RP6 Clock/health consistency** — N3 | shared boundary instance policy + structured health/last ack payload; ไม่มี calendar feature ใหม่ | Bangkok midnight, one slot, exact boundaries, disabled all; NY gap/repeat chosen policy; ±clock jump/wake late recompute latest scene; timestamps/session remain consistent; last-success freshness และ warnings ไม่หายข้าม subsystem |

**Acceptance ที่ยังไม่ควรสรุปเอง:** pause=hold หรือ clear, activation ยกเลิก pin/paused intent เมื่อใด, repeated/missing-hour policy และ native game Presence coexistence. Coordinator ควรยืนยัน contract เหล่านี้ใน canonical spec ก่อน implementation; ไม่ต้องถามซ้ำเรื่อง app-first/running-app selection ที่มี owner evidence แล้ว

**ลำดับที่เสนอ:** RP1 → RP2 → RP3/RP4/RP5 ตามขอบเขตที่แยกได้ → RP6 ที่ต้องปิด policy. Adapter injection และ deterministic tests เป็น prerequisite ของ execution ไม่ใช่การรัน companion จริงก่อน review acceptance. ไม่มี schema/database replacement หรือ full draft/publish redesign เป็น prerequisite ของ fixes ที่ยืนยันแล้ว

## Isolated experiment receipts และขอบเขตที่เหลือ

Node `v24.16.0` ใช้ stdin ES modules + VM ที่สกัด original server functions จาก source (`130-132`, `174-209`, `252-256`, `298-365`, `429-460`, `525-553`; P8 เพิ่ม `579-588` และ session mutation จาก `752-754`). Stub config store, timers และ Discord client เป็น memory-only. ครั้งแรก harness ใช้ Date คนละ VM realm จึง fail `instanceof Date`; inject host `Date` แล้ว probe ชุดเดิมผ่าน ไม่ใช่ application regression

```text
P1 schedule with zero slots: desired=null, active=true, clear calls=0
P2 failed config save: memory retains Changed but unsaved
P3 pause + next reconcile: apps clears, schedule retains
P4 slow mock SET_ACTIVITY: late ack leaves active=true, desiredKey=null until another reconcile
P5 valid one-character Codex title: activity creation rejects Details
P6 valid one-character mapping name: activity creation rejects Activity name
P7 legacy normalization: schedule + paused retained before Studio initialization
P8 ordered successful saves: general -> Codex session -> autostart loses acknowledged session
PS fixture: 1 item -> object; 2 -> array; 0 -> no output
DST fixture: spring 01:50 next=03:30, but 03:00 already selects missing 02:30 slot
DST fixture: fall second 01:15 next 01:30 computed for tomorrow
```

P1-P8 ผ่าน assertions หลัง harness correction; DST เป็น observation ของ algorithm และ policy gap ไม่ใช่ overall pass/fail สำหรับ DST. VM probes พิสูจน์ control flow ที่สกัดมา ไม่พิสูจน์ event timing, process survival, network acknowledgement หรือ viewer rendering. ไม่มี durable experiment file เพิ่ม เพราะ ownership อนุญาต report ไฟล์นี้เพียงไฟล์เดียว

**Reproduce M1/P8:** จาก clone root ส่งโค้ดด้านล่างให้ `node --input-type=module -` ทาง stdin (PowerShell ใช้ literal here-string). ทุก save เป็น deferred memory promise; resolve ตาม write-chain order เดิม ไม่มี server/filesystem mutation. Result ที่ baseline คือ session ที่สำเร็จแล้วหายจาก config หลัง unrelated setting save

```js
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { createDefaultConfig, validateConfig } from './scripts/presence-config.mjs';
const source = (await readFile('./scripts/studio-server.mjs', 'utf8')).split('\n');
const saves = [];
const env = {
  Date, config: createDefaultConfig(), validateConfig, clientId: 'fixture',
  autostart: { supported: true }, syncAutostart: async () => {},
  reconcilePresence: async () => false,
  configStore: { save: value => new Promise(resolve =>
    saves.push({ value: validateConfig(value), resolve })) },
};
vm.createContext(env);
vm.runInContext([[429,432], [579,588]].map(([s,e]) =>
  source.slice(s - 1, e).join('\n')).join('\n'), env);
// Exact config publication pattern from session route at lines 752-754.
vm.runInContext(`async function saveSession() {
  const next = validateConfig({ ...config,
    codexSession: { title: 'Concurrent session', startedAt: new Date().toISOString() } });
  config = await configStore.save(next);
  await reconcilePresence({ force: true });
}`, env);
const first = env.persistConfig();
const session = env.saveSession();
saves[0].resolve(saves[0].value); await first;
const setting = env.setAutostartEnabled(false);
saves[1].resolve(saves[1].value); await session;
assert.ok(env.config.codexSession);
saves[2].resolve(saves[2].value); await setting;
assert.equal(env.config.codexSession, null);
console.log('P8 confirmed: acknowledged session lost');
```

P1/P2/P3/P4 ใช้ function slices และ mocks ที่ระบุด้านบน: P1 set schedule mode และ runtime.active=true แล้ว call `updateScenesAndSlots({scenes,slots:[]})`; P2 `configStore.save` reject แล้ว inspect global config; P3 `setScheduleEnabled(false)` แล้ว `reconcilePresence` เปรียบเทียบสอง modes; P4 deferred mock request ระหว่าง running snapshot A → empty แล้ว resolve ack. P5/P6 เรียก pure validators + delivery projection ตาม inputs ใน M4; PS fixture command อยู่ใน M5. DST ตั้ง `process.env.TZ='America/New_York'` ภายใน isolated Node เท่านั้น แล้วใช้ instants `2026-03-08T06:50:00Z`, `2026-03-08T07:00:00Z` กับ slots `00:00/02:30/04:00`, และ `2026-11-01T06:15:00Z` กับ slots `01:30/02:30`; inspect `activeSlot/nextAt`

Timebox initial investigation ประมาณ 10 นาที; full source read ครบ target runtime modules และ direct tests ที่เกี่ยวข้อง. ไม่ได้รัน npm install/npm test, live scan, port/server, real RPC, Electron, autostart, installer, browser/Chrome/computer control หรือ reads/writes ของ user configuration/secrets. Remaining proof gates ระบุใน matrix และ acceptance packages; HTTP/security/packaging review เป็น lane ของ coordinator และ security/lifecycle worker
