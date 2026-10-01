# UX/UI review — Presence Studio

วันที่ตรวจ: 2026-10-01 · Baseline: `b241ccd5542b1f3e5ee348bd507cac051cafabda` · Clone: `C:/letmecook-lab/spotify-vibe`

ผลหลัก: journey ของแอปยังใช้โครง Status → Scenes → Settings ได้ แต่ต้องแก้การเปลี่ยน policy โดยไม่มีคำสั่ง การทำข้อมูล timer หาย และการบันทึก/retry ที่สวนทางกับ intent ก่อนแต่งภาพเพิ่ม ข้อเสนอด้านล่างรักษา app-first, Scene editor, Hinata artwork และ companion เดิม ไม่เสนอสร้างผลิตภัณฑ์ใหม่

## ขอบเขตและระดับหลักฐาน

- **[S] Source-confirmed**: อ่าน HTML/CSS ปัจจุบันและตาม endpoint/validator ที่เกี่ยวข้อง; บรรทัดทั้งหมดอ้าง baseline ข้างต้น
- **[P] Pure experiment**: เรียกฟังก์ชันที่ตัดจาก source ใน Node `vm` กับ object จำลอง หรือเรียก validator บริสุทธิ์; ไม่เปิด server, watcher, Electron หรือ Discord และไม่เขียน app data
- **[H] Design hypothesis**: ข้อเสนอ hierarchy/layout/copy หรือผลด้านการรับรู้ที่ต้องให้ App Owner ทดลอง
- **[G] Proof gate**: พฤติกรรม DOM จริง, accessibility tree, contrast ที่ composited แล้ว, scrolling, focus และ Discord output ยังไม่ได้ตรวจในรอบนี้

อ่าน product/domain ก่อน source: `CONTEXT.md`, `docs/PRODUCT_REQUIREMENTS_SOURCE_OF_TRUTH.md`, `docs/PERSONAL_SCHEDULED_PRESENCE_SOURCE_OF_TRUTH.md`, ADR 0004 และเอกสาร `presence-studio` โดยเฉพาะ APP-SETUP-JOURNEY, RUNNING-APPS, UPDATE-LATENCY, IMPLEMENTATION-STATUS, UX-REVIEW-MINIMAL และส่วนที่เกี่ยวข้องของ STUDIO-EXPERIENCE-SPEC อ่าน Discord Integration เฉพาะขอบเขต Rich Presence ส่วนเอกสาร commercial เป็น historical

การสำรวจตั้งต้นใช้ประมาณ 9 นาที แล้วหยุดขยายขอบเขตเพื่อจัดทำรายงาน ไม่ติดตั้ง dependency หรือรัน test suite; coordinator เป็นเจ้าของขั้นนั้น ภาพใน `docs/images` และผลตรวจเดือนกรกฎาคม/กันยายนเป็นประวัติ ไม่ใช่หลักฐาน visual ของ commit นี้

**ขอบเขตการตัดสินใจ:** app-first และ running-app policy มาจากคำชี้นำ App Owner; `docs/presence-studio/APP-SETUP-JOURNEY.md:3` และ `docs/presence-studio/RUNNING-APPS.md:3` มีน้ำหนักกว่าข้อเสนอ foreground-only เดิม แต่ source ปัจจุบันเปลี่ยนรายละเอียดอีกหลายอย่าง: มีสามหน้า, mapping บันทึกทันทีต่อ tile, ไม่มี slot UI, ไม่มี motion toggle เอกสาร APP-SETUP-JOURNEY บรรทัด 11–12 ที่กล่าวถึง draft/apply และการคง schedule สำหรับข้อมูลเดิมจึงไม่ตรงกับ HTML ปัจจุบัน ห้ามใช้เอกสารนั้นเป็นคำรับรอง runtime โดยไม่ตรวจ source

July source-of-truth ยังกล่าวว่า browser จัดการ GIPHY key ไม่ได้ ขณะที่ `scripts/studio-server.mjs:807` และ `scripts/studio-server.mjs:656` รองรับการตั้งค่า/ล้างจริง นี่คือ contract drift ให้ coordinator กับ security lane ชี้ขาด; รายงานนี้ไม่อ้างว่าคีย์รั่วหรือเปลี่ยนนโยบาย secrets เอง Mobile ในที่นี้คือ narrow Studio/หน้าต่าง Windows ไม่เพิ่ม mobile Discord companion

## Whole-product journey และ state flow จริง

| ช่วง | App Owner ต้องการอะไร | Event/state ที่ source ทำจริง | จุดปรับที่เชื่อมกับช่วงถัดไป |
| --- | --- | --- | --- |
| เปิดครั้งแรก | รู้ว่าจะเริ่มตรงไหน | onboarding ตาม `vibe.onboarded`; Start และ Skip ไป `#/status` เหมือนกัน (`scripts/discord-presence-studio.html:3849`, `:3854`) | Start ไปเลือก Scene/จับคู่; Skip ไป Status; บอกให้ Discord Desktop และ companion เปิดอยู่ |
| โหลด configuration | เห็นค่าที่เคยตั้งและ runtime จริง | GET config/state พร้อมกัน; config เก่าอาจถูก PUT เป็น apps ก่อน render; runtime ใช้ response GET เก่า (`scripts/discord-presence-studio.html:3622`, `:3631`, `:3645`) | การเปิด Studio ต้องไม่เปลี่ยน policy; โหลดสำเร็จ/ล้มเหลวต้องแยกจาก Discord connection |
| เข้า Status | เห็นว่าการ์ดใดแสดง เพราะอะไร | render เลือก `currentSceneName` → desired preset → no matching app; บางสถานะยังใช้ kicker “กำลังแสดง” (`scripts/discord-presence-studio.html:2293`) | แยก selected, acknowledged, disconnected, paused, no matching app; มี next action ตามเหตุ |
| เลือก Scene | เลือกสิ่งที่จะปรับ | row เปิด detail ด้วย `selectedSceneId`; เปลี่ยน `data-subview` โดยไม่เปลี่ยน hash (`scripts/discord-presence-studio.html:1786`, `:1867`) | คง search/scroll และคืน focus เมื่อกลับ; อย่าให้ browser Back ออกจาก Scenes โดยไม่ผ่านคลัง |
| สร้าง/สำเนา/ลบ | จัดคลังให้เข้ากับตนเอง | สร้างเปิด detail; สำเนายังอยู่ list; ลบเอา Scene/slots ออกจาก local config ก่อน save (`scripts/discord-presence-studio.html:3153`, `:3187`, `:3202`) | ระบุชื่อเป้าหมายและผลต่อ mappings/slots; บอก pending จน backend ยอมรับ |
| แต่ง Scene | ตรวจข้อความ/ภาพทันที | input → `syncFormToScene` → preview/meta → autosave 650 ms (`scripts/discord-presence-studio.html:3094`, `:2832`) | draft ล่าสุดต้องไม่ถูก response เก่าทับ; save ต้องเก็บค่าที่ UI ไม่ได้เปิดให้แก้ |
| ผูกแอป | เปิดแอปแล้วได้ Scene ที่เลือก | tile เปลี่ยน `mappingDraft` ทันที → PUT mappings; endpoint เปิด Auto และล้าง pin (`scripts/discord-presence-studio.html:3529`, `scripts/studio-server.mjs:772`) | บอกผลต่อ Auto/pin ก่อน action; แยก retry จาก toggle; Scene ใหม่ต้องถูกบันทึกก่อนผูก |
| ทดลอง/แสดง | เห็นผลใน Discord ตาม intent | Show/Update → save config → POST override; apps pin 1 ชม., schedule ถึง slot ถัดไป (`scripts/discord-presence-studio.html:2863`, `scripts/studio-server.mjs:566`) | บอก expiry ข้าง action และ receipt ที่ยืนยันได้; preview เป็น editing aid |
| ใช้งานประจำ | สลับตามแอปโดยไม่เฝ้าหน้า | running enabled mappings + recent stable foreground เลือกผู้ชนะ; ไม่มีตัวตรงกัน clear; browser poll state 500 ms (`scripts/app-presence.mjs:27`, `scripts/studio-server.mjs:454`, `scripts/discord-presence-studio.html:3666`) | แสดง winner/reason และ detector freshness; minimized/tray ยังนับว่าเปิดอยู่ |
| เสริมภาพ/การตั้งค่า | ทำได้เองเมื่อจำเป็น | GIF modal trending/search/pagination; Settings เก็บ key local และไม่เติม GIPHY key กลับลงช่อง (`scripts/discord-presence-studio.html:2587`, `:2703`, `:2527`) | GIF optional; failure มี recovery ข้างงานและไม่ทำ draft หาย |
| ปิด/หยุด/กลับมา | รู้ว่า companion จะทำงานต่อหรือหยุด | ปิดหน้าต่างผ่าน preload; Clear pause+clear; Quit เรียก `/api/quit`; autostart browser/Electron คนละ control (`scripts/discord-presence-studio.html:3696`, `:3276`, `:3291`) | ใช้ถ้อยคำแยก close window, pause, clear, quit; intentional stop ไม่ควรกลายเป็น error reconnect |

Precedence ที่ควรรักษาและอธิบาย: `Manual Override` ที่ยังไม่หมด → paused → running app resolver หรือ schedule (`scripts/studio-server.mjs:185`) การเป็น connected ไม่ยืนยันว่ามี Scene แสดง; `active/currentSceneId/lastSuccessAt` คือหลักฐาน RPC ระดับ companion และยังไม่ใช่ภาพจากผู้ชม Discord

## Coverage ของทุก surface และ state

ทุกแถวเป็น coverage จาก source; คอลัมน์ gate ไม่ได้หมายถึงผ่านการตรวจจริง

| Surface | State/event ที่ตรวจ | Evidence หลัก | Finding / proof gate |
| --- | --- | --- | --- |
| Desktop shell/sidebar | expanded/collapsed, persisted rail, active nav, status pill, Electron controls | `scripts/discord-presence-studio.html:25`, `:58`, `:3403`, `:3675`; `scripts/studio-ci.css:289` | M10/M11; [G] frameless scroll, collapsed accessible names, zoom, high contrast |
| Status | loading, acknowledged Scene, selected fallback, no match, no Scene, pinned, paused, disconnected | `scripts/discord-presence-studio.html:97`, `:114`, `:2279`, `:2351`, `:2372` | M4/M5; [G] screen-reader announcements และสถานะหลัง reconnect |
| Editing vs live | selected Scene ID, live badge, Show/Update, disconnected context, local save changes current Scene | `scripts/discord-presence-studio.html:1635`; `scripts/studio-server.mjs:525` | M4; [G] dirty+live/failed RPC matrix |
| Scene library | selected/live/pinned badges, artwork fallback, bound-app icons, list refresh/focus | `scripts/discord-presence-studio.html:1680`, `:1776`, `:1790` | M7/N2; [G] long names, 20 Scenes, keyboard app shortcut |
| Create/duplicate/delete | local optimistic changes, default fields, timer preservation, referenced Scene deletion | `scripts/discord-presence-studio.html:3153`, `:3187`, `:3202` | B2/M1/N2/N3; [G] failure recovery และ destructive confirmation |
| Detail/editor | essential fields, optional links/artwork/buttons, required/pair validation, help | `scripts/discord-presence-studio.html:164`, `:177`, `:208`, `:251`, `:1478`, `:3008` | B2/M3/M7/M9/N1; [G] focused invalid field และ disclosure scroll |
| Preview | immediate updates, image loading failure, URL normalization, click-through, static/animated built-ins | `scripts/discord-presence-studio.html:1915`, `:1937`, `:1977`, `:2033` | M4/M9/M10/M12; [G] actual crop, small badge, external links, screen-reader semantics |
| Savebar/Show | dirty/saving/saved/invalid/failed, queued save, pagehide keepalive, pin receipt | `scripts/discord-presence-studio.html:1453`, `:2789`, `:2846`, `:2863`; `scripts/studio-ci.css:879` | M3/M4/M11; [G] never cover focused input/error/action |
| Application mapping | bind/unbind/reassign, optimistic status, single-flight guard, manual path, disabled old mapping | `scripts/discord-presence-studio.html:3468`, `:3529`, `:3601`, `:3610` | M2/M3/M6; [G] failure/retry + newly created Scene |
| Detection/catalog | installed/running/mapped union, name search, stale catalog, refresh/failure/empty | `scripts/discord-presence-studio.html:3477`, `:3523`, `:3564`; `scripts/windows-apps.mjs:6` | M6; [G] Windows catalog, protected path, launched/minimized/tray/closed apps |
| Daily Time Slots | data persists; renderer/listener guarded because target DOM absent; legacy route goes Scenes | `scripts/discord-presence-studio.html:2180`, `:3221`, `:3342` | B1; source says **UI unavailable**; [G] retained-config behavior after correction |
| GIF picker | unavailable key, trending, short query, loading, no results, rejected key, load-more failure, stale request, select/close | `scripts/discord-presence-studio.html:420`, `:2456`, `:2587`, `:2644`, `:2703`, `:3062` | M8/M12; [G] trap, opener return, SR statuses, small viewport scroll |
| Settings/secrets | bundled ID, override, optional key, clear-on-save, dirty preservation, save failed/success | `scripts/discord-presence-studio.html:332`, `:1217`, `:2503`, `:2536`, `:3317` | M5/M9/M11/N4; [G] no secret values in screenshots/logs; contract decision belongs security/coordinator |
| Runtime controls | pause/resume, pin cancellation, autostart pending/rollback, clear, quit | `scripts/discord-presence-studio.html:2897`, `:2917`, `:3251`, `:3276`, `:3291` | M2/M4/M5/M9; [G] intentional stop and paused app watcher behavior |
| Desktop update | available/downloading/downloaded/dismissed/check error/no update; login preference | `scripts/discord-presence-studio.html:3715`, `:3750`, `:3794`, `:3822` | M5/M9/M11; [G] preload/updater/installer behavior, restart with pending save |
| Onboarding | first run, storage unavailable, reshow, Start/Skip | `scripts/discord-presence-studio.html:455`, `:3847` | M8/N1; [G] focus trap/Escape/return, truthful first action |
| Confirm modal | destructive safe focus, Escape, Tab wrap, backdrop cancellation, replacement | `scripts/discord-presence-studio.html:1385`, `:3878` | M8; [G] background inert and rapid invocation lifecycle |
| Theme/i18n | saved choice, OS initial theme, TH/EN, dynamic re-render, control relocation | `scripts/discord-presence-studio.html:28`, `:995`, `:1070`, `:1096`, `:1115` | M3/M10/M11; [G] dynamic errors, owner-authored text, localized ARIA names |
| Global failure states | startup GET failed, state poll failed, HTTP validation, offline, loading, empty | `scripts/discord-presence-studio.html:2416`, `:2935`, `:3659` | M4/M5/M6; [G] stalled request, recovery, initial partial load |
| Responsive/keyboard | <=1180 preview reflow, <=760 bottom nav, skip link, detail return, switch labels | `scripts/studio-ci.css:1137`, `:1147`; `scripts/discord-presence-studio.html:35`, `:1878`, `:398` | M7–M12; [G] 320/375/760/1024/1440, 200% zoom, full keyboard/SR pass |

## Severity-ordered findings

**Blocker** = เปลี่ยน policy/ทำข้อมูลเดิมเสียโดยไม่มีคำสั่งเจ้าของ; ต้องแก้ก่อนส่ง UX slice **Major** = งานหลัก, recovery, truthful state หรือ accessibility ใช้ไม่ได้/ไม่สอดคล้อง **Nit** = ความชัดและความเรียบร้อยที่ไม่ตัดเส้นทางหลัก การจัด severity อิง consequence จาก source ไม่ใช่ภาพประวัติ

### B1 — เปิด Studio แล้วเปลี่ยน schedule เป็น apps พร้อมเปิด Auto/ล้าง pin

**[S] Trigger/consequence:** config ที่มี `settings.selectionMode !== 'apps'` ถูก initialize ส่ง PUT โดยไม่มี user action ไม่ใช่แค่ซ่อนเวลา: endpoint ตั้ง `scheduleEnabled:true` และ `manualOverride:null` ดังนั้นการเปิดหน้าดูสถานะสามารถเปลี่ยนการแสดง Presence ของเจ้าของ และไม่เหลือ control เปลี่ยนกลับใน UI

**Evidence:** `scripts/discord-presence-studio.html:3631`, `:3633`, `:3635`, `:3639`, `:320`, `:3221`; `scripts/studio-server.mjs:772` ยังมี `slots` backend แต่ไม่มี DOM `slotList`/`addSlotButton`; `#/dayline` ถูก normalize ไป Scenes ที่ `scripts/discord-presence-studio.html:3342`

**Smallest correction:** เอา mutation ออกจาก initialize; อ่าน mode/pause/pin ที่บันทึกอยู่จริงและไม่แก้เอง ถ้า app-only เป็นทิศทางที่ coordinator ยืนยัน ให้ legacy config มี notice สั้นพร้อม **เปลี่ยนเป็นโหมดแอป** แบบ opt-in, อธิบายผลต่อ pin/Auto และเก็บ slots เดิม ทางกลับ legacy อาจเป็นแผงอ่านค่ากฎเดิม/restore mode ใน Settings; ไม่จำเป็นต้องคืนหน้า calendar/dayline ทั้งหน้า

**Acceptance:** GET/init/reopen ไม่ออก PUT และไม่เปลี่ยน mode, slots, pause หรือ pin; failure ของ explicit mode change แสดง inline พร้อมคงค่าก่อนหน้า Migration policy และการคืน slot editor ต้องให้ coordinator/owner ตัดสินก่อน implementation

### B2 — เลือก/แก้ Scene ทำ timer เดิมหายแม้ไม่ได้แก้ timer

**[S/P] Trigger/consequence:** `formScene()` สร้าง object ใหม่ด้วย `timerMode:'none'`, `timerMinutes:30` เสมอ; `selectScene()` sync Scene เดิมก่อนเปลี่ยนตัวเลือก การพิมพ์ข้อความหรือแม้แต่เลือก Scene อื่นทำ timer หายใน local model แล้ว save ครั้งถัดไปเขียนทับค่าเดิม Timer ยังเป็นค่าที่ backend รองรับและ default บาง Scene ใช้ elapsed

**Evidence:** `scripts/discord-presence-studio.html:1811`, `:1829`, `:1838`, `:1847`, `:2796`; `scripts/presence-config.mjs:60`, `:203`, `:283`

**Smallest correction:** patch เฉพาะ editable fields บน existing Scene หรือคง timer fields เดิมใน `formScene`; ไม่ต้องเพิ่ม timer editor เพื่อแก้ data loss ถ้าต้องแสดงให้เห็น ใช้ disclosure “ตัวจับเวลา: เดินอยู่/นับถอยหลัง/ปิด” เป็นงานถัดไป

**Acceptance:** remaining 75 นาที และ elapsed เดิมอยู่ครบหลัง text edit, เปลี่ยน Scene, duplicate, autosave, manual save และ reload; ไม่มี implicit reset

### M1 — ลบ Scene ที่ถูกจับคู่กับแอปแล้ว persistence ล้มเหลว แต่ UI บอกว่าลบแล้ว

**[S/P] Trigger/consequence:** delete ลบ Scene/slots แต่ไม่แก้ `appMappings`; backend merge mappings เดิมแล้ว validator ปฏิเสธ missing preset ผลคือ Scene หายจาก local list, disk ยังมี, การ save อื่นอาจถูกปฏิเสธตาม และ toast อยู่ใน editor ที่เพิ่งซ่อนเมื่อกลับ list

**Evidence:** `scripts/discord-presence-studio.html:3207`, `:3212`, `:3213`, `:3216`, `:3218`, `:2796`; `scripts/studio-server.mjs:525`, `:530`; `scripts/app-presence.mjs:17`; `scripts/studio-ci.css:454`

**Smallest correction:** confirmation บอกชื่อและจำนวน linked apps/slots; block delete จน unbind/reassign สำเร็จ หรือให้ coordinator เพิ่ม atomic delete ที่จัด references ใน write เดียว ห้ามส่ง payload ที่ backend ยังไม่รองรับ แสดง “กำลังลบ” และเอาออกเมื่อ persistence สำเร็จ; failed ให้คืน local state/focus เป้าหมาย

**Acceptance:** linked และ unlinked deletion มีผลที่อธิบายตรงกัน ไม่มี dangling mapping; disk/read-back และ list ตรงกัน; failure ยังแก้/ยกเลิกได้ และ toast มองเห็นใน list

### M2 — retry mapping กลับทิศทาง และการผูกแอปแอบยกเลิก pause/pin

**[S/P] Trigger/consequence:** optimistic add/remove/reassign เปลี่ยน `mappingDraft` ก่อน save แล้ว failure บอก “ลองแตะ tile อีกครั้ง”; ครั้งถัดไป toggle บน draft ที่เปลี่ยนแล้วจึง undo intent แทน retry นอกจากนี้ PUT mappings เปิด Auto/ล้าง Manual Override ทุกครั้งทั้งที่ผู้กดอาจแค่แต่ง mapping; Scene ใหม่ที่ยังไม่ผ่าน autosave อาจถูก validator ปฏิเสธเมื่อผูกทันที

**Evidence:** `scripts/discord-presence-studio.html:3535`, `:3539`, `:3543`, `:3548`, `:3553`, `:3554`, `:3612`; `scripts/studio-server.mjs:772`; `scripts/app-presence.mjs:17`

**Smallest correction:** snapshot/rollback draft เมื่อ failed แล้วมี **ลองบันทึกการจับคู่อีกครั้ง** ที่ retry payload เดิม; success copy ต้องหลัง acknowledgement เก็บ Scene ใหม่ก่อนอนุญาต bind และทำ dependency ชัด ถ้าผูกแอปต้อง resume/cancel pin ตาม contract ให้ action ระบุ “ผูกและกลับไป Auto” กับ expiry consequence; ทางเลือกที่รบกวนน้อยคือแยก mapping persistence จาก runtime activation โดย coordinator ชี้ขาด

**Acceptance:** fail → retry คง operation เดิมครบ add/remove/reassign; ไม่มี misleading success; paused/pinned ไม่เปลี่ยนจากการแก้ config โดยไม่แจ้ง; tile pending ถูก disable/ประกาศและ focus ไม่หาย

### M3 — late response แทน draft ใหม่ แล้วประกาศ “บันทึกทุกอย่างแล้ว”

**[S/P] Trigger/consequence:** save payload ถูก clone ก่อน queue; response กลับมาแล้วแทน `config` ทั้งก้อนโดยไม่มี revision guard การพิมพ์ต่อระหว่าง request ทำ model ใหม่ถูก response เก่าทับ ขณะที่ input ยังใหม่และ save state เป็น saved; `renderAll()` เช่นเปลี่ยนภาษาเติม form จาก model เก่าอีกครั้ง Mapping response ก็แทน config ทั้งก้อนโดยไม่เข้าคิว Scene save มีความเสี่ยง draft loss ข้าม Scene/ข้าม operation; ไม่อ้างว่าทุก key stroke หายเสมอ เพราะ debounce รอบถัดไปอาจกู้บางกรณีได้

**Evidence:** `scripts/discord-presence-studio.html:2796`, `:2807`, `:2812`, `:2827`, `:3094`, `:3613`, `:2410`, `:1105`

**Smallest correction:** แยก persisted snapshot กับ editing draft หรืออย่างน้อยเพิ่ม edit revision; merge response เฉพาะเมื่อ draft generation ตรงกับที่ส่ง และ saved label เฉพาะ latest acknowledged generation นำ mutations ของ config สองทางเข้าลำดับเดียวกัน/ไม่ให้ mapping response แทน draft UI ทั้งก้อน คง form/disclosure/focus บน locale change

**Acceptance:** slow save A → พิมพ์ B → response A ยังแสดง B และ dirty/saving จน B acknowledgement; การเปลี่ยน Scene/ภาษา/ผูกแอประหว่าง request ไม่คืนค่าเก่า Multi-tab overwrite เป็น gate เพิ่มให้ coordinator runtime lane กำหนด ไม่ถือว่ารอบนี้ตรวจผ่านแล้ว

### M4 — Status และ live badge อ้าง “กำลังแสดง” จาก selected/stale state

**[S] Trigger/consequence:** `currentSceneId` อยู่ต่อหลัง disconnect แม้ `active:false`; frontend badge เทียบ ID อย่างเดียว Status fallback desired preset หรือ “ไม่มีแอปที่ตรงกัน” แล้วยังให้ kicker “กำลังแสดงบน Discord” app-mode branch ของ nowSub/nextChange มาก่อน paused จึงบอกเรื่องแอปขณะ Auto หยุด Pin duration อยู่ใน hidden element/`title` ของ action และ nowSub บอกเพียงชั่วคราว

**Evidence:** `scripts/studio-server.mjs:289`, `:293`, `:327`, `:330`; `scripts/discord-presence-studio.html:1639`, `:1647`, `:2293`, `:2296`, `:2356`, `:2360`, `:2383`, `:2386`, `:125`, `:1656`

**Smallest correction:** ใช้ explicit view state จาก companion freshness + connection + `active` + current/desired IDs; แยก **เลือกไว้ รอ Discord**, **อัปเดตสำเร็จล่าสุด**, **Auto หยุด**, **ไม่มีแอปที่จับคู่เปิดอยู่** และ **กำลังแก้ไข** ดู pause ก่อน app-mode copy แสดง pin expiry และ lastSuccessAt แบบเวลาอ่านง่าย ใต้ Show/Update แจ้ง “บันทึกไว้ในเครื่อง; ถ้า Scene นี้กำลังแสดง บันทึกจะอัปเดตการ์ดด้วย” อย่าเรียก preview เป็นหลักฐาน output จริง

**Acceptance:** no-match/disconnected/stale/paused/dirty+same-ID ไม่ได้ live badge ที่กล่าวอ้างเกินข้อมูล; elapsed pin countdown และ mode contract ตรงกันหลัง poll; receipt ของ local save แยกจาก RPC acknowledgement

### M5 — feedback/recovery หลาย action เขียนไปยัง editor ที่ซ่อน และ startup failed ไม่มีเส้นทางกลับ

**[S] Trigger/consequence:** `showMessage` เขียน `#message` ใน detail form แต่ Status pause/cancel, Settings clear/quit/autostart และ download failure เรียกตัวเดียวกัน Startup GET fail ก็ลงข้อความใน hidden editor, ไม่ reinitialize config; state polling ที่กลับมาสำเร็จไม่ทำให้ config ที่ยัง null พร้อมใช้งาน Fetch ของ requestJson ไม่มี client deadline; request ที่ค้างยึด `statePollPending` ต่อเนื่องได้

**Evidence:** `scripts/discord-presence-studio.html:264`, `:1434`, `:2909`, `:2924`, `:3270`, `:3287`, `:3304`, `:3769`, `:3659`, `:2936`, `:2417`; `scripts/studio-ci.css:454` ข้อยกเว้นที่ดี: Settings save และ Check updates มี status ของตัวเอง (`:2571`, `:3815`)

**Smallest correction:** ใช้ status region ในแต่ละ screen กับ error summary ของ shell สำหรับ companion unavailable; ทุก action ส่ง progress/result/retry ไปพื้นที่ที่มองเห็น ไม่ต้องเพิ่ม toast framework แยก companion unreachable จาก Discord offline; startup มี **โหลดใหม่** ที่รัน read-only initialize และไม่ reset draft เพิ่ม bounded timeout/AbortController ตาม operation และ intentional-stop state เพื่อหยุด poll หลัง Quit

**Acceptance:** trigger จาก Status/list/Settings เห็น success/failure ข้างปุ่ม; initial config fail → retry สามารถเปิด editor ได้; hung state poll จบเป็น stale แล้วกลับมาลองได้; quit ไม่ลงท้ายด้วย “กำลังลองเชื่อมต่อใหม่” ที่ชวนเข้าใจผิด

### M6 — detection/catalog freshness กับ tile state ไม่ตรง runtime และ recovery อยู่ผิดหน้า

**[S] Trigger/consequence:** poll 500 ms อ่าน `/api/state` อย่างเดียว; discoveredApps/running dots โหลดตอน initialize/2.5s/กด Refresh เท่านั้น รายการจึงไม่ตามการเปิด/ปิดแอประหว่างอยู่ใน detail Refresh อยู่ใน `.vs-pairing` ซึ่ง detail ซ่อน; detector error เขียน `appMappingMessage` ใน section เดียวกัน Installed-apps failure ถูกแทนด้วย [] และ empty copy บอกเพียงเปิดแอป/กด Refresh จึงแยกไม่ออกว่ากำลัง scan, ไม่พบ, permission หรือ helper ล้มเหลว mapping disabled เดิมก็ไม่มี control enable แยกจาก unbind

**Evidence:** `scripts/discord-presence-studio.html:3474`, `:3496`, `:3525`, `:3538`, `:3564`, `:3568`, `:3573`, `:3643`, `:3644`, `:3666`, `:315`; `scripts/studio-ci.css:455`; `scripts/windows-apps.mjs:6`, `:13`

**Smallest correction:** detail แสดง detector state/freshness และ Refresh ของตัวเอง; refresh snapshot ตาม interval ที่เหมาะสม/เมื่อกลับ tab โดยไม่ rebuild tile ที่ focus อยู่ ย้าย errors ไป `detailAppsStatus`, คง known mappings เมื่อ catalog load failed แยก **ไม่มีผลค้นหา**, **กำลังอ่านแอป**, **อ่านแอปไม่ได้**, **คู่เดิมยังอยู่แต่ไม่พบไฟล์**; ชื่อแอปเป็นหลัก path อยู่ tooltip/advanced และมี manual path fallback อย่าเรียก running ว่า foreground โดยอัตโนมัติ

**Acceptance:** เปิด/ปิด/ย่อแอปแล้ว dot/current winner มี freshness ที่ตรวจได้; helper fail ไม่กลายเป็น “ไม่มีแอป” เงียบ ๆ; search และ focus ไม่หลุดทุก snapshot; disabled mapping สามารถเปิดกลับได้โดยไม่ต้องลบก่อน

### M7 — skip link เปลี่ยนหน้า และกลับคลังไม่คืน focus/history

**[S] Trigger/consequence:** skip href `#main` เป็น hash ที่ router ไม่รู้จัก จึง normalize เป็น Status จาก Scenes/Settings; target ยังเป็น div ไม่มี tabindex `closeSceneDetail()` ซ่อนปุ่มที่ focus อยู่แล้วไม่ย้าย focus, ต่างจาก rescue ตอนเปลี่ยน screen Detail ไม่อยู่ใน history ทำให้ browser Back ไม่เท่ากับ “กลับคลัง” Tile binding replaceChildren ทันทีแล้วไม่มี focus restore

**Evidence:** `scripts/discord-presence-studio.html:35`, `:88`, `:3337`, `:3344`, `:3351`, `:1878`, `:3374`, `:3471`, `:3551`

**Smallest correction:** main landmark ที่ focus ได้; intercept skip เพื่อ focus current content โดยไม่ใช้ screen hash จำ origin Scene ID และคืน focus/scroll ให้ row เมื่อกลับ ใช้ history state สำหรับ detail หรือเสริม Back handling โดยไม่เพิ่ม router ใหม่ ใช้ stable tile nodes/key หรือ restore executable focus หลัง update

**Acceptance:** skip จากทุกหน้าไม่เปลี่ยน screen; list → detail → Back/Escape/กลับคลังคืน row เดิม; bind/retry ด้วย keyboard ต่อได้โดยไม่ย้อน Tab จากต้นหน้า; screen-level navigation semantics เดิมยังทำงาน

### M8 — modal contracts ไม่ครบและไม่เป็นระบบเดียวกัน

**[S] Trigger/consequence:** GIF มี Tab trap/Escape/return และ inert shell เป็นฐานที่ดี แต่ onboarding ใช้เพียง inert shell+initial focus ไม่มี trap/Escape/return confirm มี Tab trap/safe focus แต่ไม่มี inert background; `setStudioInert` ไม่รวม update banner, titlebar และ skip link ที่อยู่นอก shell Replacement confirm resolve ตัวเก่าโดยไม่เรียก close cleanup จึงเหลือ key listener ของตัวเก่าได้เมื่อมีคำสั่งซ้อน

**Evidence:** `scripts/discord-presence-studio.html:1385`, `:1393`, `:1406`, `:1425`, `:2456`, `:2471`, `:2607`, `:3088`, `:3849`, `:3854`

**Smallest correction:** ใช้ overlay helper ที่มี single active overlay, cleanup, focus trap, initial safe focus, full-content inert และ opener fallback ร่วมกัน จัด titlebar ที่จำเป็นของ OS แยกอย่างตั้งใจ; ไม่เปิด confirm ทับ onboarding/GIF ถ้าไม่ต้องใช้ Escape ยกเลิก, restore opener ที่ยังอยู่หรือ target ที่กำหนดหลัง delete

**Acceptance:** Tab/Shift+Tab/virtual cursor อยู่ใน modal; Escape และ click backdrop มีผลเดียวกัน; dialog replacement ไม่เหลือ listener; opener ที่หายคืน focus ไป Scene ถัดไป; [G] ต้องตรวจ accessibility tree จริง ไม่ถือว่า `aria-modal` อย่างเดียวพอ

### M9 — accessible names/semantics ขาดใน control สำคัญ

**[S] Trigger/consequence:** autostart checkboxes อยู่ใน label ที่มีแค่ span ว่าง ชื่อด้านข้างไม่ได้ associate; preview มี `role="img"` ครอบ dynamic links ทำให้ semantics แบบ atomic image ขัดกับการอ่านและกด link ภายใน Artwork ถูกกำหนด role link/tabindex แม้ไม่มี URL; help ทุกอันชื่อ “อธิบายช่องนี้” และ tooltip ไม่ผูก `aria-describedby`

**Evidence:** `scripts/discord-presence-studio.html:387`, `:398`, `:279`, `:1977`, `:2106`, `:3038`, `:3008`

**Smallest correction:** checkbox มี label/labelledby ตามชื่อจริง; preview เป็น labelled region/group พร้อม text summary สำหรับ assistive technology; artwork focus/link เฉพาะเมื่อมี valid URL; help ชื่อ “อธิบาย [field label]” และผูก tooltip description คง field validation `aria-invalid`/describedby เดิม

**Acceptance:** screen reader อ่านชื่อ+state ของ login/autostart; preview text/buttons ไม่ถูกซ่อนใต้ img semantics; ไม่มี empty link tab stop; helper อธิบายฟิลด์ได้โดยไม่ใช้ hover

### M10 — CSS card selector ไม่ตรง HTML และ color roles บางคู่ contrast ต่ำ

**[S/P] Trigger/consequence:** HTML ใช้ `.vs-discord-card` แต่ background/padding/type ของการ์ดประกาศที่ `.vs-dc-card`; selector แรกมีเพียง max-width ใน media rule ชื่อใน preview ใช้สีขาวที่คาดว่าอยู่บน dark card ยังไม่ยืนยันภาพจริง แต่ style contract แตกชัดเจน นอกจากนี้ ink3 ถูกใช้กับคำอธิบาย/สิ่งที่จะขึ้น Discord และ dark primary hover ใช้ accent-deep สีอ่อนกับ text สีขาว

**Evidence:** `scripts/discord-presence-studio.html:279`; `scripts/studio-ci.css:911`, `:924`, `:1141`, `:40`, `:711`, `:1196`, `:94`, `:475`, `:476`, `:281`

**Smallest correction:** ทำ selector ของ preview ให้ตรงกัน; แยก `accent-button-hover` ออกจาก `accent-text`, เพิ่ม `muted-text` ที่อ่านได้จริง และ reserve ink3 สำหรับ decoration ใช้ semantic token ของ status dot แทน literal หลายสี ความต่างของ preview กับ Discord ต้องยังมี label กำกับ ไม่เปลี่ยน theme ทั้งชุด

**Acceptance:** arithmetic และ computed contrast ของข้อความปกติ >=4.5:1, large text/UI indicators ตามเกณฑ์ที่เกี่ยวข้อง; hover/focus/error/saved-opacity/light/dark ผ่านการวัดจริง; [G] ต้องดูภาพและ computed style ในธีมจริงก่อนตัดสินว่าข้อความหาย/อ่านไม่ได้

### M11 — responsive shell มีทางเข้าการตั้งค่าหาย และ frameless ไม่มี scroll owner ชัด

**[S/G] Trigger/consequence:** <=760 ย้าย theme/language ไป `settingsToggleSlot` ภายใน `electronAppCard[hidden]`; browser ไม่เข้า initElectronShell ที่เปิด card จึงไม่มีทางใช้ toggles ที่ narrow width ฝั่ง Electron ตั้ง body height100vh+overflow hidden แต่ main/page ไม่มี overflow-y:auto/min-height:0 scroll owner ทำให้ long content เสี่ยงถูกตัดและ window.scrollTo ไม่ใช่ scroll container ที่ต้องการ Savebar fixed กับ bottom nav ใช้ z-index40 เท่ากัน; top Show button ไม่ sticky และ <=1180 preview ไปหลัง form ทั้งหมด

**Evidence:** `scripts/discord-presence-studio.html:371`, `:378`, `:1133`, `:3705`, `:3788`, `:3678`, `:1870`; `scripts/studio-ci.css:245`, `:386`, `:410`, `:425`, `:880`, `:1137`, `:1167`

**Smallest correction:** preference row ของ theme/lang อยู่นอก Electron-only card; กำหนด scroller ของ frameless main และให้ navigation/focus scroll target นั้น ใช้ sticky action row ภายใน editor ที่มี save state+Show; narrow มี jump ไป preview/กลับ field โดยไม่ต้อง duplicate form คง bottom-nav safe area แต่ reserve พื้นที่ตามความสูงจริง

**Acceptance:** browser/Electron narrow ใช้ theme/lang ได้, editor/Settings เลื่อนถึงท้ายด้วย mouse/keyboard, resize/200% zoom ไม่ตัด focused field; action/save/error ไม่ซ้อนกัน Visual overflow/occlusion และ actual scroll ต้องพิสูจน์ [G]; รอบนี้ยังไม่ launch Electron

### M12 — reduced motion ไม่หยุด animated media ที่ UI เริ่มเอง

**[S] Trigger/consequence:** CSS ลด transition/animation แต่ `stillPreview()` ดูแค่ document.hidden; built-in idle/gaming/chill และ scene-row preview จึงใช้ GIF ขณะ tab เปิดแม้ OS reduce motion GIPHY results ก็เป็น animated preview ไม่มี opt-out

**Evidence:** `scripts/discord-presence-studio.html:1883`, `:1885`, `:1937`, `:1715`, `:2660`; `scripts/studio-ci.css:211` เอกสารเดิมกล่าวถึง motion preference แต่ current code ระบุว่าถอดออกแล้ว

**Smallest correction:** ให้ built-ins ใช้ poster เมื่อ OS reduce motion หรือ preference “ลดภาพเคลื่อนไหว”; ไม่เปลี่ยนค่ารูปที่ส่ง Discord เพราะนี่เป็น Studio preference GIF picker ควรใช้ still thumbnail ก่อนเลือก/hover/focus หรือมี pause browsing animations ถ้า provider ไม่มี poster ให้บอก limitation และมีทางเลือกภาพนิ่ง

**Acceptance:** reduced motion + visible tab ไม่เริ่ม built-in GIF ใน library/detail เอง; hidden-tab optimization เดิมยังอยู่; เปิด animation ตาม explicit choice ได้; [G] ตรวจ media จริงและความสบายกับ owner

### N1 — onboarding เริ่มแล้วกลับหน้าเดิม และ helper spotlight หนักกว่างานที่อธิบาย

**Evidence/consequence [S/H]:** Start/Skip ใช้ dismiss function เดียว (`scripts/discord-presence-studio.html:3858`, `:3860`); copy “กดปุ่มเดียวก็พร้อม” ไม่มี connection button ใน modal (`:464`) Help hover สร้าง scrim ขนาด 9999px และ 16px target (`scripts/studio-ci.css:715`, `:725`) อาจรบกวน flow/ใช้งาน touch ยาก; ไม่ใช่ visual finding ที่ตรวจด้วยภาพแล้ว

**Smallest correction/acceptance:** Start ไป Scene แรก, Skip ไป Status; copy “เปิด Discord Desktop แล้วเลือก Scene” ผูกกับ state จริง Helper ใช้ inline hint/tooltip ธรรมดาที่มี focus และ touch affordance ใหญ่ขึ้น; owner ทดลองว่าช่วยเข้าใจโดยไม่บังงาน

### N2 — library actions มีเป้าหมายและผลสำเร็จไม่ชัด

**Evidence/consequence [S]:** duplicate/delete อยู่ toolbar ของ list (`scripts/discord-presence-studio.html:142`), ทำงานกับ selectedSceneId ที่อาจเป็นค่าค้างจาก detail; duplicate ไม่เปิด detail และ success อยู่ hidden `#message` (`:3187`, `:3199`) Copy name ยาว40ตัวอักษรถูกตัด suffix จนแยกสำเนาไม่ได้ (`:3192`)

**Smallest correction/acceptance:** ย้าย actions ของ Scene ไป detail หรือ contextual row menu ที่ตั้งชื่อเป้าหมาย; duplicate เปิด Scene ใหม่และ focus ชื่อ; reserve suffix หรือชื่อ unique ที่อ่านได้ ปิดปุ่มลบ Scene สุดท้ายพร้อมคำอธิบาย ทุก action ยัง keyboard-operable

### N3 — capacity และ validation ไม่บอกก่อนชนข้อจำกัด

**Evidence/consequence [S]:** validator รับ 1–20 Scenes (`scripts/presence-config.mjs:146`) แต่ add/duplicate ไม่มี count guard (`scripts/discord-presence-studio.html:3153`, `:3187`); action สร้างรายการเกินก่อน autosave failed แล้ว config ทั้งก้อนบันทึกไม่ได้

**Smallest correction/acceptance:** disable add/duplicate เมื่อครบ20 พร้อมคำว่า “ครบ20 Scene แล้ว ลบหรือแก้ Scene เดิม”; manual executable แสดง full-path validation ข้างช่อง ไม่ clear input ก่อน server accepts (`scripts/discord-presence-studio.html:3606`); malformed path แก้ต่อได้ทันที

### N4 — connection setup copy และ source labels ทำให้ advanced ดูเป็น prerequisite

**Evidence/consequence [S/H]:** title “คีย์เชื่อมต่อ” และ steps “ใส่รหัสของคุณ” มาก่อนข้อความ bundled default (`scripts/discord-presence-studio.html:337`, `:340`, `:356`); renderSecretsStatus เติม clientId กลับลงช่องเมื่อว่าง (`:2518`) ทำให้การล้าง override ระหว่าง poll ไม่คง intent; provider source raw string แสดงตรง (`:2513`) Delete-ID confirmation บอกว่าจะ disconnect แต่ backend ยัง apply bundled fallback (`:2542`; `scripts/studio-server.mjs:623`)

**Smallest correction/acceptance:** heading “การเชื่อมต่อ” พร้อม Discord Ready/Waiting; custom Application ID อยู่ advanced; GIPHY ระบุ optional มี action สร้างคีย์ที่เปิดลิงก์ได้ แยก “กลับไปใช้รหัสเริ่มต้น” จาก disable connection และอย่าเติมค่าใน dirty form ใช้ source label “ตั้งไว้ในเครื่อง/กำหนดโดยระบบ” ตาม capability จริง; security lane ตรวจ secret boundaries

## หลักฐาน pure experiments ที่รันจริง

รันผ่าน stdin ของ `node --input-type=module` ใน clone ไม่สร้าง script/report อื่น ผลนี้พิสูจน์ฟังก์ชัน/validator กับ fixture เท่านั้น ไม่พิสูจน์ browser events หรือ Discord

| Experiment | วิธีจำกัด side effects | ผล |
| --- | --- | --- |
| Timer preservation | extract `formScene` จริงใน `vm`, fake form + existing Scene remaining75 | output `timerMode:none`, `timerMinutes:30` |
| Referenced Scene deletion | `createDefaultConfig` fixture + mapping; ทำ Scene/slot filtering แบบ handler แล้ว `validateConfig` จริง | `An application references a missing preset. Remove or reassign its mapping first.` |
| Mapping failed retry | extract `toggleDetailApp` จริง, mock `saveMappingDraft` ให้ false | tap1 draft เพิ่ม mapping พร้อม “ลองแตะ tile อีกครั้ง”; tap2 draft กลับเป็น [] |
| Late save response | extract `saveConfig/formScene/syncFormToScene`, deferred fake request; พิมพ์ใหม่ก่อน response | config กลับ `Starting the day slowly`, form ยัง `New text typed while save is pending`, saveState=`saved` |
| Slot DOM | อ่าน source เป็น string; ไม่สร้าง DOM/runtime | ไม่มี element `id="slotList"` และ `id="addSlotButton"` |
| Contrast arithmetic | sRGB luminance ของ literal/token คู่; ไม่อ้าง computed paint | light ink3 #A8A8A8 บน #FFFFFF =2.38:1, บน #FAF8F5 =2.24:1; white บน dark hover #a3a8f7 =2.21:1; white บน #ed4245 =3.84:1 |

ทำซ้ำ probes ด้านข้อมูลได้จาก clone root ด้วย PowerShell โดยส่ง script ผ่าน stdin; ไม่ import `studio-server`, ไม่เรียก watcher และไม่สร้างไฟล์:

```powershell
@'
import fs from 'node:fs';
import vm from 'node:vm';
import { createDefaultConfig, validateConfig } from './scripts/presence-config.mjs';
const html = fs.readFileSync('scripts/discord-presence-studio.html', 'utf8');
const extract = (a, b) => html.slice(html.indexOf(a), html.indexOf(b, html.indexOf(a)));
const config = createDefaultConfig();
const scene = config.scenes[0];
scene.timerMode = 'remaining'; scene.timerMinutes = 75;
const elements = Object.fromEntries(Object.entries(scene)
  .filter(([key]) => key !== 'buttons').map(([key, value]) => [key, {value:String(value)}]));
for (const key of ['button1Label','button1Url','button2Label','button2Url']) elements[key] = {value:''};
const timer = vm.createContext({form:{elements}, currentScene:()=>scene});
vm.runInContext(extract('      function formScene()', '      function syncFormToScene()'), timer);
console.log('timer', timer.formScene().timerMode, timer.formScene().timerMinutes);
const deleted = structuredClone(config);
deleted.appMappings = [{executable:'C:\\Apps\\Demo.exe',name:'Demo',sceneId:scene.id,enabled:true}];
deleted.scenes = deleted.scenes.filter(s => s.id !== scene.id);
deleted.slots = deleted.slots.filter(s => s.sceneId !== scene.id);
try { validateConfig(deleted); } catch (error) { console.log('delete', error.message); }
const status = {textContent:''};
const mapping = vm.createContext({selectedSceneId:'scene-next',mappingDraft:[],config,
  applicationKey:s=>s.toLowerCase(),document:{querySelector:()=>status},
  t:(s,v={})=>s.replace(/\{(\w+)\}/g,(_,k)=>v[k]??k),
  renderDetailApps:()=>{},renderSceneList:()=>{},saveMappingDraft:async()=>false});
vm.runInContext(extract('      async function toggleDetailApp(', '      function presetOptions('), mapping);
await mapping.toggleDetailApp('C:\\Apps\\Demo.exe','Demo');
console.log('first failed tap', JSON.stringify(mapping.mappingDraft), status.textContent);
await mapping.toggleDetailApp('C:\\Apps\\Demo.exe','Demo');
console.log('retry failed tap', JSON.stringify(mapping.mappingDraft), status.textContent);
let release, payload;
const delayed = vm.createContext({config:structuredClone(config),runtime:{},selectedSceneId:scene.id,
  form:{elements:structuredClone(elements)},clone:structuredClone,validateForm:()=>true,
  saveButton:{disabled:false},saveChain:Promise.resolve(),editorTitle:{textContent:''},t:s=>s,
  setSaveState:s=>delayed.saveState=s,renderSceneList:()=>{},renderSlots:()=>{},
  renderDetailApps:()=>{},renderRuntime:()=>{},showMessage:()=>{},
  requestJson:async(u,o)=>{payload=JSON.parse(o.body);return new Promise(r=>release=r);}});
vm.runInContext('function currentScene(){return config.scenes.find(s=>s.id===selectedSceneId);}\n'
  +extract('      function formScene()', '      function selectScene(')
  +extract('      async function saveConfig(', '      function scheduleSave('), delayed);
const pending = delayed.saveConfig(false);
await Promise.resolve();
delayed.form.elements.details.value = 'New text typed while save is pending';
delayed.syncFormToScene();
release({config:{...structuredClone(config),scenes:payload.scenes,slots:payload.slots},runtime:{}});
await pending;
console.log('late response', delayed.config.scenes[0].details, delayed.form.elements.details.value, delayed.saveState);
'@ | node --input-type=module
```

Contrast probe ใช้ relative luminance `0.2126R + 0.7152G + 0.0722B` หลัง sRGB linearization แล้วหาร `(lighter + 0.05)/(darker + 0.05)` คู่ hex อยู่ในตารางครบ สีโปร่งใส, backdrop, image, saved opacity0.55, antialiasing และ selector cascade ยังต้องวัด computed/background จริง ตัวเลขข้างต้นไม่ใช่ full-product contrast certification

## Cohesive interaction/design improvement spec

### 1. รักษา architecture ของสามหน้าและแกน “เลือก → แต่ง → แสดง”

**[H] Status:** หน้าประจำวันเน้นผล+เหตุ+การควบคุม: Scene หรือ explicit empty state, source app/pin/paused, connection/freshness และ expiry ไม่มี Scene ให้ CTA ตามเหตุ: ไม่มี mapping → **จับคู่แอป**, mapped app ปิด → **เปิด [app] หรือปักหมุด Scene**, companion unreachable → **โหลดสถานะใหม่** Error มี action ระบุได้ ไม่ใช้ข้อความ “เงียบแปลว่าปกติ” ขณะโหลดไม่สำเร็จ

**[H] Scenes list:** row คง artwork/name/visible text/linked apps/badge; CTA **เพิ่ม Scene** เป็นหลัก เก็บ search/filter เป็น improvement ถ้าคลังโต ไม่บังคับเพิ่มทุก control ครั้งแรก Per-Scene duplicate/delete ไป detail หรือ contextual menu; mapping summary ชี้ไป “แอปที่ผูกกับ Scene นี้” โดยมี keyboard path

**[H] Detail:** header มี Back + ชื่อ editing Scene + current output context; essentials ข้อความและภาพก่อน optional metadata; app mappings มี freshness/retry ของตน; preview มี editing label เสมอ Action row ใช้หนึ่ง primary **แสดงบน Discord** หรือ **อัปเดตบน Discord** พร้อม pin duration ที่อ่านได้ และ local save state ใกล้กัน คง sticky preview บน desktop; narrow ใช้ Preview jump และกลับฟิลด์ โดยเก็บ draft/focus

**[H] Settings:** Preferences (ทุก shell) → Discord readiness/advanced override → GIF optional → background/runtime controls → Electron-only updates/version กฎเวลาของ legacy config เป็น compact compatibility panel ถ้าจำเป็นตาม B1; ไม่มี full calendar/public-space/payment work ใน slice นี้

### 2. แยกสามสถานะที่ owner ต้องเชื่อถือได้

| State family | ตัวอย่าง copy | เมื่อเปลี่ยน/กู้คืน |
| --- | --- | --- |
| Editing/local persistence | “มีการแก้ไข”, “กำลังบันทึก”, “บันทึกในเครื่องแล้ว”, “ยังบันทึกไม่ได้ — แก้ [field]”, “บันทึกไม่สำเร็จ — ลองอีกครั้ง” | draft revision เดิมจน acknowledgement; invalid field เปิด disclosure/focus; retry payload เดิม |
| Runtime intent | “Auto ตามแอป”, “ปักหมุดถึง 18:42”, “Auto หยุด”, “เลือกไว้ รอ Discord”, “หยุด companion แล้ว” | explicit command มี receipt; config edit ไม่เปลี่ยน policy โดยเงียบ |
| Acknowledged/fresh output | “companion อัปเดตสำเร็จ 14:12”, “ข้อมูลล่าสุดเมื่อ 14:12 — companion ไม่ตอบสนอง”, “Discord กำลังเชื่อมต่อใหม่” | state poll success/failure/freshness; ไม่ใช้สีอย่างเดียวหรืออ้างภาพผู้ชม |

Copy ไม่ต้องบอก endpoint, process queue หรือ schema ให้ product user; technical error detail อยู่ expandable diagnostic สำหรับ App Owner เมื่อแก้ไม่สำเร็จ ยังเก็บ raw detail โดยไม่ดึง secrets

### 3. Recovery, navigation และ focus เป็น contract ร่วม

- Action pending: disable action ที่ซ้ำได้, แจ้ง verb ข้างปุ่ม; optimistic change ใช้คำว่า “กำลัง…” จน acknowledged ไม่มี “สำเร็จ” ก่อน persist
- Error: วางข้าง action/field ใน screen ปัจจุบัน, มี retry/cancel ที่คง intent และ data; global companion outage มี timestamp กับ read-only reload
- Detail return: เก็บ origin row/key+scroll; create focusชื่อ, duplicate focusสำเนา, delete focus rowถัดไป/heading; search/refresh ไม่ rebuild focus target ทิ้ง
- Modal: shared open/close lifecycle, background inert, Tab wrap, Escape, safe focus, opener return/fallback; no nested overlays เมื่อไม่จำเป็น
- Validation: รักษา existing inline errors/paired-button guidance/auto-open disclosure; เพิ่ม mapping/manual-path/limit validation และ state summary ของ optional values ที่ retained
- Intentional lifecycle: close window เป็น background, Pause และ Clear แยก copyตาม runtime ที่ coordinatorยืนยัน, Quit แสดง stopped ไม่ retry poll; ก่อน update restart ต้อง settle pending persistence/บอก unsaved riskอย่าง concrete

### 4. Refinement ของ design system ที่ใช้ได้กับของเดิม

คง color roles, spacing4px, IBM Plex Sans Thai/English, restrained accent, selected/pressed/nav state และ field/preview highlight ของเดิม แก้ component selector contracts และ accessible contrast ก่อนเปลี่ยน art direction; Hinata/bundled app icons เป็นเนื้อหาของ owner ไม่แทนที่ด้วย art speculative

เพิ่ม tokens เฉพาะที่ขาด: readable muted text, accent button hover, semantic save statuses, focus ring บน light/dark กับ preview dark fixed theme อย่าใช้ accent-deep ตัวเดียวเป็นทั้ง text และ white-text button fill Field/error/status ใช้ชื่อ semantic component role; secondary metadata เล็กลงได้แต่ต้องยังอ่านได้ Saved feedback ไม่ควรลด opacity จนข้อความอ่านยาก

Motion ใช้เฉพาะ transition ที่สัมพันธ์กับการเลือก/เปิด panel ไม่เล่น list reveal ทุก poll/focus update รักษา signature guard และขยายไป app tiles; OS reduced motion + media poster policy เป็น preferenceของ Studio ต้องไม่แก้ payload Discord silently

## Existing good patterns ที่ควรเก็บ

- Scene list signature guard กับ focused row restoration (`scripts/discord-presence-studio.html:1682`, `:1791`) เป็นฐานที่ดี; ไม่โยนทิ้งเพื่อทำ list framework ใหม่
- Essential fields + native details + configured count (`scripts/discord-presence-studio.html:177`, `:1663`) ลดการเปิดทุกฟิลด์พร้อมกัน; validate เปิด disclosure และ focus first invalid (`:1579`)
- Immediate preview และ focused-field highlight (`scripts/discord-presence-studio.html:3094`, `:1604`), artwork load errors/GIPHY page normalization (`:1915`, `:3121`) ช่วย recovery โดยตรง
- Local autosave กับ explicit Show/Update แยกเป็นสอง action, save-chain recovery และ pagehide keepalive (`scripts/discord-presence-studio.html:2827`, `:2846`, `:2863`); ปรับ revision/receipt บนฐานเดิม
- GIF request cancellation/sequence guard, dedup IDs, retained results เมื่อโหลดเพิ่ม failed และ accessible Load more (`scripts/discord-presence-studio.html:1259`, `:2644`, `:2742`, `:2767`, `:3082`)
- Settings dirty flag กับ password field ไม่เติม saved GIPHY secretกลับ (`scripts/discord-presence-studio.html:1217`, `:2527`); อย่าลด privacy เพื่อทำ UIสะดวก
- Visible update-check feedback และ autostart rollback (`scripts/discord-presence-studio.html:3815`, `:3268`), persisted theme/sidebar กับ responsive single-instance control relocation (`:25`, `:1121`) รักษาแต่แก้ parent visibility
- Native button/nav pressed/current semantics, base focus-visible และ CSS reduced motion (`scripts/discord-presence-studio.html:1708`, `:3360`; `scripts/studio-ci.css:159`, `:211`) เป็นฐาน verification

## ทางเลือก 90/10 และลำดับที่เสนอให้ coordinator

| ปัญหา | ทางเลือกที่ใช้ effort ส่วนใหญ่เพื่อคุณค่าช่วงแรก | สิ่งที่เลื่อนไปได้ |
| --- | --- | --- |
| Legacy mode/timer preservation | หยุด init write, คง fields ที่ไม่มี UI, compatibility notice+explicit mode action | คืน Dayline editor/full timer editor ทั้งชุด |
| Save/retry correctness | edit revision + serialized mutations + rollback/retry operation เดิม | draft history, multi-tab merge UI; ไม่เลื่อน data-loss correction |
| Mapped delete | block พร้อม linked apps/slots และไป unbind/reassign; atomic deleteเมื่อ backendพร้อม | undo stack/global transaction UI |
| Truthful Status | state matrix จาก fields ที่มี + expiry/freshness + targeted CTA | live second preview, diagnostics dashboard |
| Catalog/detection | detail Refresh+freshness/error, stable keyed tiles, manual fallback | เปลี่ยน catalog search engine/AI app inference |
| Focus/modals/mobile | shared helper, return focus, main scroller, preference row visible, stable action row | router/framework rewrite, redesigned navigation shell |
| Visual quality | แก้ card selector, contrast role, reduced-motion posters และ action hierarchy | เปลี่ยนฟอนต์/brand/artworkทั้งหมด หรือเพิ่ม Personal Space |

ลำดับเสนอ: **phase0** B1/B2 + M1–M3 (trust/data) → **phase1** M4–M7 (state/recovery/journey) → **phase2** M8–M12 (modal/accessibility/responsive/visual) → **phase3** Nits และ owner refinements ทำเป็น slices ที่ rollback ได้; ลำดับ/การรวมกับ runtime และ security เป็นของ coordinator อย่า deploy เอกสารนี้เหมือน implementation ที่ผ่านแล้ว

## Acceptance matrix และ rollout / owner review gates

| Gate | หลักฐานที่ต้องมี | Owner และขอบเขต |
| --- | --- | --- |
| Source/domain reconciliation | ข้อชี้ขาด app-only vs legacy schedule, mapping save/apply vs pause/pin, secret management, timer retention; state/copy tableเดียว | coordinator กับ App Owner; workerรายงานนี้ไม่อนุมัติ policyแทน |
| Isolated persistence/action gate | fixtures ทดสอบ B1/B2, mapped delete, fail→retry, delayed/out-of-order save, new Scene bind, startup failure→reload, paused/pinned edit | coordinator install/test; temp configs/mock RPC เท่านั้น; green tests ไม่พิสูจน์ภาพ |
| Runtime status gate | matrices: connected+active, connected+no-match, disconnected+desired/stale current ID, paused, pin expiry, detector error; no implicit mutationจาก opening | coordinator runtime lane; simulator/fixtureก่อน real flow |
| Keyboard/SR gate | full journeyด้วย Tab/Shift+Tab/Enter/Space/Escape/Back, skip, invalid disclosure, focus returnหลังdelete/duplicate, modal background exclusion, control names, announcements | environmentที่รันได้หลัง authorized implementation; ตอนนี้ **unverified** |
| Visual/contrast gate | light/dark และ TH/EN, all hover/focus/disabled/errors/saved states, computed contrast including opacity; card root stylesและpreviewlinks | owner reviewภาพปัจจุบันพร้อม accessibility measurement; ไม่มี screenshot claimรอบนี้ |
| Responsive/scroll gate | 320×568,375,760,1024,1440 CSS px; 200% zoom, short desktop window, Electron frameless, OS high contrast/reduced motion; no horizontal overflow/field occlusion/modal clipping | browser/Electron checksภายหลัง; แยกbrowser narrowจากphone Discord support |
| Lifecycle gate | draft/pending persistenceก่อน update restart, close-to-tray, startup sourceจริง, intentional Quit feedback, reconnect continuity | security/lifecycle coordinator; ห้ามแตะ autostart/app dataจริงจนมีขอบเขตอนุญาตใหม่ |
| Discord output gate | separate viewerตรวจtext/image/GIF/badge/links/timer, pin expiry, minimized/background/closing winner fallback และreconnect | App Ownerอนุญาต real Discordเมื่อถึงขั้นนั้น; preview/RPC receiptไม่แทน viewer proof |
| Release acceptance | reviewable diffเฉพาะslice, coordinator evidence pass, explicit owner acceptanceของworkflow/visual; rejected sliceอยู่local | coordinatorเป็นผู้รวม/release;ไม่มีcommit/push/deployจากworkerนี้ |

เกณฑ์รับงานเอกสาร: named surfaces ถูกครอบคลุม, source behaviorแยกจากhypothesis, findingsมี consequence/file:line/minimal correction, pure experimentsระบุขีดจำกัดครบ งานที่ยังเหลือคือ coordinatorตรวจหลักฐาน/รวมspecและให้ownerตัดสินpolicy จากนั้นจึง implementationและproof gatesข้างต้น; ไม่มี runtime/visual gateใดถูกรับรองจากการอ่านsourceครั้งนี้
