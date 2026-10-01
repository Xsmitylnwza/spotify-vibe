# Security, persistence, privacy และ desktop lifecycle review

ตรวจที่ commit `b241ccd5542b1f3e5ee348bd507cac051cafabda` ใน clone นี้เท่านั้น; `package.json` เป็น `1.0.7` วันที่ 2026-10-01. รายงานนี้เป็น review และเปลี่ยนเฉพาะไฟล์นี้ ไม่ได้แก้ application, dependency, workflow หรือเอกสารเดิม. ช่วงสำรวจแรกประมาณ 10 นาที; จุดที่ต้องรัน browser/Electron/installer จริงระบุเป็น gate ไม่อ้างว่าผ่านแล้ว.

ข้อสรุป: **ควรปิด release gates ก่อนเปิด updater ให้ผู้ใช้ทั่วไป** โดยเฉพาะ updater ที่โยน `TypeError` และ Electron ที่ยอมรับ listener ใดก็ได้บนพอร์ตที่ต้องการเป็น Studio ของตน. Persistence มีข้อมูลสูญหายที่ยืนยันด้วย fixture ได้; local HTTP ยังไม่มีการตรวจ Host/Origin หรือสิทธิ์ผู้เรียก. ไม่พบหลักฐาน Internet-to-Node RCE, การอ่าน secret ผ่าน API โดยตรง หรือ server-side arbitrary-URL fetch จาก scene.

## ขอบเขตและระดับหลักฐาน

- **Blocker**: หยุดการปล่อย desktop/update จนแก้และผ่าน gate; ไม่ได้หมายความว่าเป็น remote exploit ทุกข้อ.
- **Major**: เสี่ยงต่อข้อมูล, privacy หรือวงจรใช้งานหลัก ต้องแก้ก่อนประกาศความพร้อมของขอบเขตนั้น.
- **Nit**: hardening/ความชัดเจนเพิ่มเติม หรือข้อจำกัดที่ยังไม่มี exploit ที่ยืนยันได้.
- **ยืนยัน isolated**: ใช้ function เดิมที่ extract จาก source, mock return/FS หรือ temporary directory ที่สร้างเองเท่านั้น. ไม่มี listening socket, real Studio/Discord/Electron, registry/login-item change หรือ external fetch.
- **ยืนยัน source**: ไล่ caller ถึง sink ได้ แต่ยังไม่ใช้ runtime จริง. **Gate**: ข้อพิสูจน์ที่ยังต้องทำในสภาพแวดล้อมทดสอบที่อนุญาต.
- Coordinator แจ้ง baseline `npm test`: 56 pass / 0 fail และมี Electron binary preparation error `os error 183`; ผู้เขียนไม่ได้รัน full suite ซ้ำ. สิ่งนี้ยืนยัน Node-suite result ที่ coordinator รายงาน ไม่ยืนยัน desktop หรือ package.

## Findings

### B1 — Blocker: พอร์ตถูกจองก่อน แล้ว Electron โหลดหน้าเว็บผู้จองพร้อม privileged bridge

**ผลกระทบและเงื่อนไข:** listener ในเครื่องที่จอง `127.0.0.1:17345` ก่อนแอปสามารถเสิร์ฟหน้าเว็บเป็น Studio; Electron เชื่อ origin นั้นและ preload เปิด API สำหรับ startup/update/window. ใช้ยึด UI, หลอกให้กรอก key, เปลี่ยน login item หรือสั่ง lifecycle ได้ตาม bridge ที่เปิดไว้. ต้องเข้าถึงเครื่องเพื่อเปิด listener; ไม่ใช่หลักฐานว่าหน้าเว็บ Internet ยึด Node ได้ และ bridge ไม่มี arbitrary filesystem/command API.

**Trace:** `scripts/studio-server.mjs:887` รับ `EADDRINUSE` → `scripts/studio-server.mjs:893` คืน `{ alreadyRunning:true, url, stop:no-op }` โดยไม่พิสูจน์ว่า listener เป็น Studio → `electron/main.js:300` รับ handle → `electron/main.js:102` / `electron/main.js:321` โหลด URL. `electron/main.js:80` โหลด preload, `electron/main.js:81` เปิด context isolation แต่ `electron/main.js:82` ปิด sandbox. `electron/preload.cjs:10`, `electron/preload.cjs:12`, `electron/preload.cjs:13` เปิด startup/download/install; `electron/main.js:240`, `electron/main.js:245`, `electron/main.js:259` ไม่ตรวจ `event.sender`, `senderFrame`, URL หรือ main-frame identity. ไม่พบ `will-navigate`/`setWindowOpenHandler` ใน main.

**แก้เล็กสุด:** Electron ต้อง fail closed เมื่อ bind ไม่สำเร็จและต้องเป็นเจ้าของ server handle; อย่า attach กับ listener เดิมอัตโนมัติ. ใส่ guard กลางให้ IPC ตรวจ webContents ของหน้าต่างหลัก, main frame และ origin ที่ boot สำเร็จ. ปฏิเสธ navigation ออกจาก Studio และ deny new windows; ลิงก์ HTTPS ที่ผู้ใช้กดให้ผ่าน validator แล้วเปิด external browser แบบตั้งใจ. เปิด sandbox และระบุ `nodeIntegration:false` โดยทดสอบ preload ที่ใช้เพียง `contextBridge`/`ipcRenderer`.

**Gate B1:** ใน fixture desktop ให้มี fake listener ที่ส่งหน้า `window.vibeStudio.setOpenAtLogin(true)` ก่อน boot; ต้องไม่โหลดหน้านั้น/ไม่เรียก OS setter. ทดสอบ IPC จาก remote document, iframe, child window, wrong webContents และ malformed payload ต้องถูกปฏิเสธ. ต้องตรวจทั้ง dev และ installed artifact; single-instance lock ไม่แทนการตรวจเจ้าของ HTTP listener. รายงานนี้ไม่ได้เปิด listener หรือ Electron เพื่อทดลอง.

### B2 — Blocker: updater ส่งสถานะแล้ว throw เพราะ `webContents.send()` คืน void

**ผลกระทบ:** update banner/check/download เสีย และ callback บางเส้นทางอาจจบด้วย uncaught exception/unhandled rejection. ต้นเหตุเป็น programming error ที่ยืนยันได้ ไม่ต้องมี attacker.

**Trace:** `electron/main.js:162` → `electron/main.js:165` เรียก `win.webContents.send(...).catch?.(...)`. Optional call ตรวจ `catch` หลังอ่าน property แล้ว จึงไม่ได้ป้องกัน receiver เป็น `undefined`. Typing ของ Electron ที่อยู่ใน clone ระบุ `send(...):void` ที่ `node_modules/electron/electron.d.ts:18644`. Caller ได้แก่ manual check `electron/main.js:174`, updater events `electron/main.js:199` / `electron/main.js:215` / `electron/main.js:221`, check finally `electron/main.js:187` และ download IPC `electron/main.js:249` ซึ่งอยู่ก่อน `try` ของการดาวน์โหลด.

**Reproducer ที่รัน:** extract `pushUpdateState` เดิมและ mock `BrowserWindow.getAllWindows()` ให้ `webContents.send:()=>undefined`; ได้ `TypeError: Cannot read properties of undefined (reading 'catch')`. ข้อจำกัด: mock พิสูจน์ JavaScript seam ตาม API contract; ไม่ได้พิสูจน์ผลการ crash ทุกแพลตฟอร์ม.

**แก้เล็กสุด:** เรียก `send` เป็น synchronous void operation; ตรวจ destroyed windows/webContents และ catch synchronous send exception เฉพาะกรณีปิดหน้าต่างระหว่างส่ง. อย่าแก้ด้วยการคืน Promise ปลอมจาก test stub.

**Gate B2:** mock `send` แบบ void และ throwing/destroyed recipient; สถานะ checking → available → downloading → downloaded/error ต้องครบและไม่ throw. Installed artifact ต้อง manual check, download failure/retry และ close-window-during-update ได้โดย process ยังทำงาน; ใช้ fixture feed ไม่เรียก GitHub จริงใน unit tests.

### M1 — Major: local HTTP ไม่ตรวจ Host/Origin/CSRF และ API เปิดเผย inventory ของเครื่อง

**ผลกระทบ:** loopback ลดการเข้าถึงจาก LAN แต่ process/OS user อื่นที่เข้าพอร์ตได้อ่าน config, paths และ application inventory หรือเปลี่ยน state ได้. หน้าเว็บภายนอกอาจส่ง simple POST ไป pause/override/autostart/quit ถ้า browser policy อนุญาต loopback request; SOP ป้องกันการอ่าน response ไม่ได้ป้องกันทุก write. DNS rebinding เป็นอีกเงื่อนไขที่ Host allowlist ควรตัด แต่ยังไม่ได้ทดสอบ browser policy/DNS.

**Trace:** `scripts/studio-server.mjs:906` bind `127.0.0.1` แต่ `scripts/studio-server.mjs:693` handler ไม่มี authentication/Host/Origin check. `scripts/studio-server.mjs:694` ใช้ Host สร้าง URL แทนตรวจค่า. `scripts/studio-server.mjs:498` parser ไม่ตรวจ Content-Type. POST `/api/schedule` ที่ `scripts/studio-server.mjs:830`, `/api/autostart` ที่ `scripts/studio-server.mjs:837`, `/api/quit` ที่ `scripts/studio-server.mjs:867` มีผลข้างเคียง. PUT settings ที่ `scripts/studio-server.mjs:807` เปลี่ยน credentials แต่ browser cross-origin PUT ต้องผ่าน preflight ซึ่ง server ไม่เปิด CORS จึงไม่อ้างว่า simple CSRF เปลี่ยน key ได้.

**Privacy trace:** `/api/apps` ที่ `scripts/studio-server.mjs:757` คืน appSnapshot ซึ่ง helper สร้าง `running` จาก path ของ process ทั้งหมดที่อ่านได้ (`scripts/windows-apps.ps1:24`) และ visible app `{name,executable,icon,processId,foreground}` (`scripts/windows-apps.ps1:56`). `/api/installed-apps` ที่ `scripts/studio-server.mjs:761` คืน Start Menu catalog; GET `?refresh=1` ยัง spawn scan มี side effect. State เปิดเผย config/secrets path (`scripts/studio-server.mjs:227`, `scripts/studio-server.mjs:228`), schedule และ session. ไม่พบการเก็บ window titles/browser tabs ใน helper; Codex title เป็นค่าที่ผู้ใช้ตั้งเองผ่าน `/api/codex-session`.

**Reproducer ที่รัน:** fake Readable ที่มี `Content-Type:text/plain`, foreign Origin และ JSON `{"enabled":false}` ถูก `readJson` เดิมอ่านสำเร็จ. นี่พิสูจน์ parser เท่านั้น; ยังไม่ได้ทำ browser CSRF. ตัวอย่างสำหรับ gate คือ `fetch('http://127.0.0.1:17345/api/schedule',{method:'POST',mode:'no-cors',headers:{'Content-Type':'text/plain'},body:'{"enabled":false}'})` ใน **test browser + fake server dependencies**.

**แก้เล็กสุด:** allowlist Host แบบ exact host+port และปฏิเสธ absolute request-target ที่ไม่ตรง origin; ตรวจ Origin สำหรับ write, รับเฉพาะ JSON MIME, reject unsupported method และย้าย refresh เป็น POST. ปิด CORS ไว้. ถ้าจะป้องกัน local-user callers ให้ใช้ launch capability ที่ส่ง out-of-band ผ่าน Electron preload/URL fragment จาก launcher แล้วตรวจ header ในทุก API; token ที่ใครก็ GET จาก public endpoint ได้ไม่สร้าง local-user isolation. อย่าอ้างว่า token ป้องกัน malware ภายใต้ OS account เดียวกันได้. เพิ่ม `frame-ancestors 'none'`, script/connect policy และ referrer policy หลังทดสอบ inline scripts/styles ของ UI.

**Gate M1:** known/foreign/null/missing Origin, bad Host, DNS-rebinding-style Host, form/text/plain, OPTIONS, every route/method, read inventory without capability. Expected 403/405/415 และไม่มี disk/RPC/startup side effect. Browser loopback/private-network permission ของ Chromium ที่ใช้จริงต้องทดสอบแยก; การไม่เกิด CSRF ใน browser รุ่นหนึ่งไม่ใช่เหตุให้ยกเลิก server-side checks.

### M2 — Major: request parser ทำข้อความไทยเสีย และ malformed Host หลุด error boundary

**ผลกระทบ:** UTF-8 character ที่ถูกแบ่งข้าม network chunks กลายเป็น replacement characters และอาจบันทึกข้อความผิดโดย JSON ยัง valid. อีกทางหนึ่ง raw local request ทำ async handler reject ก่อนเข้า catch จนอาจหยุด Node process.

**Trace:** `scripts/studio-server.mjs:501` ใช้ `body += chunk` จึง decode Buffer ทีละ chunk; `scripts/studio-server.mjs:505` parse ข้อความที่เสียแล้ว. `scripts/studio-server.mjs:694` `new URL(...)` อยู่ก่อน `try` ที่ `scripts/studio-server.mjs:696`; `scripts/studio-server.mjs:874` จึงจับ malformed Host ไม่ได้.

**Reproducer ที่รัน:** ส่ง Buffer ของ `{"title":"ไทย🙂"}` แยกที่ byte 11 เข้า `readJson` เดิม ได้ `title=���ทย🙂`. Extract บรรทัด URL เดิมไป async EventEmitter callback ใน isolated Node child แล้ว emit Host `127.0.0.1:bad`; child exit 1 ด้วย `ERR_INVALID_URL` โดยไม่มี socket.

**แก้เล็กสุด:** เก็บ byte buffers โดยนับ byte budget ก่อน concat แล้ว decode UTF-8 ครั้งเดียว หรือใช้ StringDecoder; reject invalid encoding ตาม contract. ย้าย URL parse/Host validation เข้า try และมี catch ครอบทั้ง request callback. Return structured 400/413/415 โดยไม่ส่ง state ที่ไม่จำเป็นให้ caller ที่ไม่ผ่าน trust check.

**Gate M2:** ไทย/emoji split ทุกตำแหน่ง byte, malformed Host/absolute target, JSON null/array/scalar, aborted stream และ body เกิน limit; process ต้องอยู่และ state/disk ไม่เปลี่ยนเมื่อ invalid. `readJson` ปัจจุบันมี limit 262,144 **UTF-16 code units** (`scripts/studio-server.mjs:502`) ไม่ใช่ bytes; กำหนด 256 KiB bytes และ explicit receive timeout เป็น hardening ที่ทำพร้อม parser fix ได้. ห้ามตีความว่า body ปัจจุบันไม่จำกัดเลย.

### M3 — Major: recovery/rename fallback ลบ last-known-good หรือเขียน default ทับเมื่อเป็น I/O error

**ผลกระทบ:** คำว่า atomic save ไม่ครอบคลุม Windows fallback; disk/permission error หรือ crash ในช่องว่างหลัง unlink อาจทำ config/keys หาย. Read failure ไม่ได้แปลว่าข้อมูล corrupt แต่ปัจจุบันถูก reset ได้.

**Trace:** `scripts/local-config-store.mjs:19` รับ EEXIST/EPERM → `scripts/local-config-store.mjs:20` ลบไฟล์เดิม → `scripts/local-config-store.mjs:21` rename ครั้งสอง. `scripts/app-secrets.mjs:190` → `scripts/app-secrets.mjs:191` → `scripts/app-secrets.mjs:192` เช่นเดียวกัน และ `scripts/app-secrets.mjs:194` ลบ temp ใน finally แม้ rename ครั้งสองล้มเหลว. ไม่มี fsync/checkpoint สำหรับ sudden power loss. `scripts/local-config-store.mjs:45` catch ครอบ parse, validate และ read errors ทุกชนิด → backup best effort `scripts/local-config-store.mjs:54` → save default `scripts/local-config-store.mjs:61` แม้ backup ไม่สำเร็จ. `scripts/app-secrets.mjs:150` / `scripts/app-secrets.mjs:153` อ่านของเดิมไม่ได้ก็ใช้ `{}` แล้ว partial save เขียนทับ; ไม่มี corrupt backup. `scripts/app-secrets.mjs:134` ยังทิ้ง valid environment fallback เมื่อ read error เป็น EIO/EACCES; SyntaxError branch ที่ `scripts/app-secrets.mjs:124` เท่านั้นที่ recover env.

**Reproducer ที่รัน:** FS mocks ของ function เดิมให้ rename ครั้งแรก EPERM, ครั้งสอง EIO: secret original และ temp ถูกลบทั้งคู่. Config mock read EIO + access EPERM แต่ write/rename สำเร็จ: load คืน `recovered`, เขียน default และไม่มี backup. Temp fixture ของ secrets ที่ corrupt แล้ว save แค่ Discord ID: original corrupt bytes ถูกแทนที่โดยไม่มี backup. Fake env key ที่ valid + injected EIO: loader คืน key ว่าง.

**แก้เล็กสุด:** แยก ENOENT, parse/schema-invalid และ transient I/O; ถ้าอ่าน/backup ไม่สำเร็จให้ read-only/retry และเก็บ original ไว้. Reject future schema (M5). ยกเลิก unlink-before-replace; ถ้า replacement ไม่ได้ให้คืน error พร้อมเก็บ last-good/temp ที่กู้ได้. ใช้ writer ร่วมที่ serialize, unique temp และ backup-before-migration; อย่าเพิ่ม database เพื่อแก้ไฟล์สองไฟล์นี้. เมื่อจำเป็นต้องรับรอง power-loss durability ให้เพิ่ม flush และ Windows-specific proof แทนการตั้งชื่อว่า atomic แล้วถือว่าพอ.

**Gate M3:** inject read/write/first-rename/second-rename/cleanup failures และ disk-full; assert original bytes คงเดิมหรือ recovery copy ที่ตรวจได้เสมอ. Crash checkpoints ก่อน/หลัง replace, restart ต้องอ่าน valid old/new version ไม่สร้าง defaults เงียบ ๆ. Test corrupt backup ต้องอ่าน backup bytes จริง; test ปัจจุบัน `scripts/tests/local-config-store.test.mjs:32` ตรวจ source/warning/default count แต่ไม่ได้ตรวจว่า backup bytes อยู่.

### M4 — Major: secret updates แข่งกัน และการ commit config อยู่คนละจังหวะกับ runtime

**ผลกระทบ:** เปิดสองหน้าต่าง/สอง tabs แล้วบันทึกคนละ key ทำ lost update และ ENOENT ได้. Config save queue จัดลำดับ file writes ภายใน store หนึ่งตัว แต่ไม่ได้ทำ route-level read-modify-write เป็น transaction หรือป้องกันหลาย process/ต่าง store.

**Trace:** `scripts/app-secrets.mjs:150` อ่าน existing นอก queue; `scripts/app-secrets.mjs:180` ใช้ temp ชื่อ `.tmp-<pid>` เหมือนกันทุก save. `/api/settings` `scripts/studio-server.mjs:807` ไม่มี serialization รอบ `scripts/studio-server.mjs:666` / `scripts/studio-server.mjs:667`. Config queue ที่ `scripts/local-config-store.mjs:27` เป็นข้อดี แต่ `scripts/studio-server.mjs:530`, `scripts/studio-server.mjs:542`, `scripts/studio-server.mjs:561` เปลี่ยน `config` ก่อน `persistConfig`; write ล้มเหลวอาจทำ memory ต่างจาก disk. อีกกลุ่ม `scripts/studio-server.mjs:772` / `scripts/studio-server.mjs:773` สร้าง next จาก snapshot ก่อน await จึงต้องระวัง snapshot stale เมื่อหลาย mutation overlap.

**Reproducer ที่รัน:** 12 รอบใน temp directory: initialize fake ID+key แล้ว `Promise.allSettled([saveAppSecrets({discordClientId:newId}),saveAppSecrets({giphyApiKey:newKey})])`; ทุก 12 รอบมี rejected operation หนึ่งรายการและ combined update หาย (`bothRetained:0`). ไม่อ่าน key จริง. Config transaction race ยังเป็น source trace ที่ต้อง deterministic gate ไม่อ้างว่า reproduce แล้ว.

**แก้เล็กสุด:** per-file mutation queue ครอบ read → validate/merge → write → publish-memory state; commit memory หลัง disk สำเร็จ. Serialize route mutations แบบเดียวกันทั้ง settings/scenes/mappings/override เพื่อไม่สร้าง next จาก state เก่า; temp unique ต่อ operation และแยก process ownership. Error จาก persistence ควรเป็น storage failure/retry ไม่ใช่ validation 400 ทุกกรณี (`scripts/studio-server.mjs:876`). ถ้า RPC failure หลัง persistence ให้ตอบ persisted/applied แยกกัน ไม่ rollback disk อัตโนมัติ.

**Gate M4:** barrier-controlled concurrent updates ของคนละ fields ต้องเก็บทั้งคู่; same field ต้องมี deterministic last-writer policy/revision conflict. Queue ต้อง recover หลัง failure โดย no partial memory commit. สลับ scenes/mappings/settings updates แล้ว restart fixture ตรวจ disk=GET config; Discord apply failure ต้องไม่ทำผู้ใช้เข้าใจว่าการบันทึกหาย. ทดสอบ writer ต่าง process ถ้ารองรับหลาย CLI port; ถ้าไม่รองรับให้ enforce one data-directory owner.

### M5 — Major: page load เปลี่ยน owner choice และ schema ใหม่กว่าอาจถูก downgrade แบบสูญข้อมูล

**ผลกระทบ:** แค่เปิด UI ของ schedule config ก็เปลี่ยนเป็น apps, เปิด scheduleEnabled และล้าง manual pin. Downgrade/unknown schema ถูก normalize เป็น v2 และ save ครั้งถัดไปทิ้ง fields ที่เวอร์ชันนี้ไม่รู้จัก. เป็น data-preservation issue โดยไม่ต้องมี attacker.

**Trace:** `scripts/discord-presence-studio.html:3631` → `scripts/discord-presence-studio.html:3633` PUT `/api/app-mappings` บน initialize → `scripts/studio-server.mjs:772` ตั้ง `selectionMode`, `scheduleEnabled:true`, `manualOverride:null` แล้ว persist. `scripts/presence-config.mjs:143` ไม่ตรวจ supported input version และ `scripts/presence-config.mjs:170` คืน `version:2` พร้อม allowlisted fields. `.v1-backup` ที่ `scripts/local-config-store.mjs:38` สร้างเฉพาะ parsed v1→v2 และไม่ใช่ backup ก่อนทุก update/downgrade. ขัดกับข้อรักษา schedule จน owner activate apps ใน `docs/presence-studio/APP-SETUP-JOURNEY.md:12`; รายงานยึด actual UI เป็นหลักและไม่เสนอเปลี่ยนทิศทาง app-first ของ owner.

**Reproducer ที่รัน:** fixture v999 ที่มี valid known fields + `futurePreferences:{keep:true}` โหลดด้วย store เดิมได้ `source:disk, warning:null`; save แล้วเป็น v2 และ `futurePreferences` หาย. การเปลี่ยน schedule บน page load ยืนยันจาก caller→route; ไม่รัน browser.

**แก้เล็กสุด:** page load เป็น read-only; แอปใหม่ default apps ได้ แต่ profile เก่าต้องคง selection/paused/pin จนมี explicit activation. Reject newer/unsupported schema ใน read-only mode โดยเก็บ original bytes; migration ต้องมี versioned backup ก่อน commit และ failure ห้าม reset. ระบุ supported downgrade pair จริง; อย่ารับรองว่าการคืน installer รุ่นเก่ารักษาข้อมูลได้เพียงเพราะ `.v1-backup` มีอยู่.

**Gate M5:** legacy schedule paused/pinned fixture: initialize ต้องไม่ส่ง mutation และ bytes ไม่เปลี่ยน. v1→v2 ต้องเก็บ backup bytes; future version ต้องไม่ write/default; interrupted migration ต้องกู้ original ได้. Install N → edit → install N-1 โดย fixture profile ต้อง preserve schema/secret/mappings หรือ N-1 ปฏิเสธเขียนอย่างชัดเจน.

### M6 — Major: Electron และ VBS เป็น autostart สองเจ้าของ และ VBS ชี้ entry ที่ใช้ไม่ได้ใน packaged Electron

**ผลกระทบ:** toggle ใน desktop ไม่แทน VBS flag; อาจเริ่มสอง companion หรือ VBS launcher เสียใน installed app. Sentinel write fail อาจทำ preference ที่ผู้ใช้ปิดถูก default เปิดอีกครั้งใน boot ถัดไป.

**Trace:** `electron/main.js:41` เปิด login item default ก่อน server boot; sentinel `electron/main.js:42` เขียนแบบ sync best effort. IPC toggle `electron/main.js:240` แก้ OS login item โดยไม่แก้ config. Server `scripts/studio-server.mjs:88` ส่ง `process.execPath` และ `scripts/studio-server.mjs:36` ชี้ studio-server module ไป adapter; `scripts/studio-server.mjs:929` ยัง sync VBS ทุก boot ถ้า supported. Config default `autostartEnabled` เป็น true (`scripts/presence-config.mjs:178`). `scripts/windows-autostart.mjs:25` สร้างคำสั่ง `"nodePath" "scriptPath" "clientId" --no-open --port=...`; ใน Electron `process.execPath` เป็น Electron/app executable และ scriptPath อาจอยู่ app.asar ไม่ใช่ external Node entry. UI ซ่อน legacy row ที่ `scripts/discord-presence-studio.html:3789` แต่ไม่ได้ disable VBS backend. `.vbs` ที่มีอยู่จาก browser/CLI mode อาจยังทำงานแม้ผู้ใช้ปิด desktop launch-at-login.

**แก้เล็กสุด:** desktop ใช้ Electron login item เพียง adapter เดียว; ส่ง injected autostart interface ให้ server หรือปิด legacy adapter เฉพาะ Electron. CLI คง VBS ได้ถ้าผู้ใช้เลือก. Migration ของ VBS เดิมต้องระบุ ownership ก่อนลบ/ย้าย ไม่ลบ launcher ที่ไม่แน่ใจว่าแอปสร้าง. Preserve explicit off และอย่า reapply default เมื่อ persistence ของ preference มีปัญหา. การติดตั้ง/เปิด startup default เป็น owner choice ที่รายงานนี้ไม่ได้เปลี่ยน.

**Gate M6:** mock app/login-item/FS ตรวจว่า desktop boot ไม่สร้าง VBS; CLI fixture ตรวจ command semantics. Windows installed artifact ใน account ทดสอบ: spaced/Thai path, login hidden, toggle off, restart/update/uninstall ต้องเหลือ launcher ที่ตั้งใจเพียงหนึ่งตัว. Test `scripts/tests/windows-autostart.test.mjs:8` ตอนนี้ตรวจการเขียน string ลง temp file ไม่ได้รัน WScript หรือพิสูจน์ Electron executable startup.

### M7 — Major: Quit, startup และ tray มีเส้นทางที่ค้าง/หยุดไม่ครบ

**ผลกระทบ:** ปุ่มออกใน UI ของ Electron หยุดเฉพาะ server แต่ shell ยังอยู่; เปิดจาก tray ได้หน้า companion ที่ตายแล้ว. Quit/update อาจไม่รอ persistence/RPC cleanup. Tray failure + hide-on-close ทำให้แอปหายไปโดยไม่มีทางเข้าถึงปกติ. Early second-instance/activate ระหว่าง async boot อาจแตะ null handle.

**Trace:** UI `scripts/discord-presence-studio.html:3303` POST quit → `scripts/studio-server.mjs:867` → `scripts/studio-server.mjs:687` ไม่ exit เพราะ Electron ส่ง `exitProcess:false` (`electron/main.js:303`). Tray quit `electron/main.js:276` await stop แต่ install IPC `electron/main.js:259` เรียก updater โดยไม่ใช้ cleanup เดียวกัน; `electron/main.js:289` before-quit แค่ตั้ง flag. Server stop ที่ `scripts/studio-server.mjs:679` ตัด connections ก่อนรอ in-flight mutation และไม่ได้ drain config/secret queues. Await clear (`scripts/studio-server.mjs:682`) อยู่หลัง Discord queue (`scripts/studio-server.mjs:253`) โดยไม่มี deadline. Tray error `electron/main.js:146` คืน null แต่ close `electron/main.js:85` ยัง hide เสมอ. Early `electron/main.js:33` / `electron/main.js:292` → `electron/main.js:102` อ่าน `studioHandle.url` ก่อน boot จบได้. Async listen callback `scripts/studio-server.mjs:906` ไม่มี rejection wrapper รอบ awaited startup `scripts/studio-server.mjs:930`.

**แก้เล็กสุด:** มี idempotent shutdown Promise เดียวสำหรับ UI, tray, OS quit และ install; stop accepting writes → drain committed mutations → clear presence/destroy helper แบบ bounded wait → close server → quit/install. ปุ่มออกของ desktop เรียก dedicated IPC quit ที่ main เป็นเจ้าของ. ถ้า tray ไม่มีให้ close quit หรือแสดง window ที่เข้าถึงได้; defer showWindow จน boot ready. Startup failure reject promise และ cleanup resources แทน unresolved boot. ใช้ updater state guards (`downloaded` ก่อน install, ไม่เริ่ม concurrent download) และติดตั้งตาม state ที่ UI สัญญา; `autoInstallOnAppQuit:true` ที่ `electron/main.js:194` ต้องมี expected behavior ชัดเจน.

**Gate M7:** mock startup deferred แล้ว second-instance/activate; tray constructor throw; config write deferred แล้ว quit; RPC queue never settles; every quit/install route ต้อง finish ตาม deadline โดยไม่มี orphan helper/file partial. UI quit ใน installed artifact ต้องปิด process จริง. Renderer crash/reload, Discord restart และ watcher child exit ต้องมี recover/status ที่ตรงจริง; source reconnect backoff ที่ `scripts/studio-server.mjs:279` เป็นข้อดี แต่ watcher exit (`scripts/windows-apps.mjs:17`) เพียงแจ้งให้ restart ไม่มี automatic recovery.

### M8 — Major: release provenance และ production package ยังพิสูจน์ไม่ได้

**ผลกระทบ:** source tests ผ่านได้แม้ installed app import updater ไม่ได้, artifact/metadata/tag ไม่สัมพันธ์กัน หรือ downgrade ทำข้อมูลเสีย. ไม่พบหลักฐานว่า dependency ถูก compromise และไม่ได้ทำ audit/remediation.

**Trace:** `package.json:82` version 1.0.7 แต่ `package-lock.json:3` / `package-lock.json:9` เป็น 1.0.1. `package.json:56` จัด electron-updater เป็น runtime dependency แต่ lock root ยังจัด dev (`package-lock.json:17`) และ lock package มี `dev:true` (`package-lock.json:1558`); resolved versions มี integrity ได้แก่ Electron 44.5.1, builder 26.15.3, updater 6.8.9, discord-rpc 4.0.1. จึงเป็น metadata/classification drift ที่ยืนยันได้ **ยังไม่อ้างว่า npm ci หรือ builder จะ omit module แน่นอน**.

`.github/workflows/release.yml:5` trigger tag v*, `:21` npm ci, `:23` tests, `:25` build, `:27` publish; ไม่มี tag=package-version assertion, installed smoke, artifact/manifest integrity or provenance/downgrade gate. `:15`, `:17`, `:28` actions ใช้ movable major tags; `:9` contents:write กว้างทั้ง workflow. Workflow มี Windows job เท่านั้น ขณะที่ publish config/mac targets (`package.json:23`, `package.json:42`) และ release doc (`electron/RELEASE.md:25`, `electron/RELEASE.md:47`) พูดถึง macOS. ไม่เห็น signing/notarization gate ใน source; `electron/RELEASE.md:12` ให้ตัดสินใจ certificate เอง. TLS/manifest checksum ป้องกัน bytes ระหว่าง transport ได้ตาม updater implementation แต่ไม่เท่ากับ publisher provenance/signing; ยังไม่ได้ทดสอบ library signature behavior ของ artifact จริง.

**แก้เล็กสุด:** sync package/lock metadata ด้วย coordinator ในงาน implementation แยก; clean reproducible install + inspect production dependency graph และ asar imports. Validate tag/version, draft release จน installed/update/rollback gates ผ่าน, checksum manifest และ provenance อิง commit/CI run; pin actions SHA และจำกัด write permission ให้ publish job. ระบุ Windows ที่ทดสอบแล้ว; อย่าอ้าง mac/Linux updater readiness จาก target declaration. ถ้ายัง unsigned ให้ release policy ระบุความเชื่อมั่นที่มีจริงและ proof gate ก่อนเปิด auto-update แทนถือว่าแค่ SmartScreen warning.

**Gate M8:** authorized build environment เท่านั้น: clean install, `electron-updater` อยู่ใน packaged runtime, asar contains required scripts/PS1/art and no `.env`, real secret, user profile/cache, temp/backup fixtures. SHA of installer ต้องตรง manifest; tag/package/lock+commit metadata ตรง. Install N-1 → update N ผ่าน fixture/staging feed → relaunch preserve fixture profile; corrupted installer/checksum/signature และ interrupted download/install ต้องถูกปฏิเสธหรือ recover. รายงานนี้ไม่ install/build/publish และไม่เรียก GitHub feed.

### N1 — Nit: plaintext secrets, Windows ACL และ diagnostic data ต้องมีขอบเขตที่ชัด

**ผลกระทบ:** GIPHY key อยู่ plaintext; Unix mode 0600 ไม่พิสูจน์ Windows DACL. ไม่มี direct secret API leak ที่ยืนยันแล้ว แต่ profile/backup/support bundle หรือ temp ที่ค้างอาจเปิดเผย key. Discord Application ID เป็น public identifier ไม่ควรเรียกว่า authentication token.

**Trace:** `scripts/app-secrets.mjs:185` mode 0600; data directory `scripts/studio-server.mjs:55` และ env override `scripts/studio-server.mjs:62`. `publicSecretsStatus` ไม่คืน GIPHY value (`scripts/app-secrets.mjs:217`), public config ลบ legacy key (`scripts/studio-server.mjs:136`); ทั้งสองเป็นสิ่งที่ทำถูกแล้ว. JSON-parse error warning (`scripts/app-secrets.mjs:127`) อาจมี excerpt ของข้อมูลตาม Node version; raw error/state response (`scripts/studio-server.mjs:880`) จึงควร redact ก่อนทำ diagnostics. WriteFile fail ก่อน rename try (`scripts/app-secrets.mjs:182`) อาจเหลือ temp; runtime crash ก็ข้าม finally ได้.

**แก้/พิสูจน์:** ตรวจ profile ACL ภายใต้ Windows account ทดสอบ, redaction ด้วย fake key canary ในทุก API/log/error/export, cleanup/recover เฉพาะ temp ของแอปหลัง crash. ห้าม bundle file paths จาก environment-owned profile. OS secret storage/safeStorage เป็นทางเลือกเมื่อ threat model ต้องการ at-rest protection; ไม่จำเป็นต้องสร้าง vault ใหม่ และไม่อ้างว่าป้องกัน process account เดียวกันได้.

### N2 — Nit: external artwork/fonts และ GIPHY มี privacy/robustness gates

**ผลกระทบ:** เปิด UI มี external font requests; GIF preview ติดต่อ CDN/art host และคำค้นส่ง GIPHY. Provider response แปลก/ใหญ่เกินคาดทำ renderer ช้าได้; domain allowlist ยังไม่มี. ไม่มีหลักฐาน remote script execution จาก GIF title.

**Trace:** fonts `scripts/discord-presence-studio.html:8` / `:10`; fixed server fetch destination `scripts/giphy-search.mjs:130`, key/query ที่ `:131` / `:132`, timeout `:143`, bounded query 80 chars (`:118`) และ cache 100 entries (`:217`) เป็นข้อดี. `httpsUrl` ที่ `scripts/giphy-search.mjs:19` ตรวจ prefix เท่านั้น; provider JSON `:172` ไม่มี explicit response-byte cap และ normalized data `:185` ไม่ slice ตาม requested limit. Preview `scripts/discord-presence-studio.html:2661` ใช้ image.src แต่ title `:2666` ใช้ textContent. Isolated normalization ยอมรับ `https://attacker.invalid/pixel.gif`; นั่นพิสูจน์ host policy เท่านั้น ไม่พิสูจน์ GIPHY compromise/SSRF. Server ไม่ fetch arbitrary scene URL; renderer/Discord เป็นผู้โหลด artwork. `scripts/presence-config.mjs:48` จำกัด persisted links เป็น HTTPS แต่ยังรับ credentials/private hosts ได้.

**แก้/พิสูจน์:** parse URLs จริง, reject credentials/malformed URLs; provider artwork allowlist หรือ policy ที่สอดคล้องกับการรองรับ owner image URLs. Bound response bytes/item count และ coalesce concurrent identical searches ถ้าจำเป็น; cache ไม่ได้ป้องกัน concurrent first miss ทุกคำค้น. Self-host fonts เป็นทางเลือกเล็กสุดสำหรับ UI offline. ทดสอบ `<script>`/quote/HTML titles ต้องแสดงเป็น text และ private/credential/redirect URLs ไม่ออกนอก policy. แจ้งผู้ใช้ตรงจุดเลือก GIF ว่าคำค้น/preview ออกจากเครื่อง; ไม่ส่งชื่อแอป/session เป็น query อัตโนมัติ.

### N3 — Nit: artwork pin มีหลักฐาน local provenance แต่ยังไม่ใช่ delivery proof

**ผลกระทบ:** URL ที่ถูก schema ไม่รับรองความพร้อมของ public host/Discord media proxy หรือสิทธิ์ใช้ asset; อย่าใช้ screenshot ใน Studio เป็น proof ว่า Discord viewer โหลดภาพได้.

**Trace/สิ่งที่ตรวจแล้ว:** `scripts/character-art.mjs:2` pin raw GitHub ที่ commit `7202b72685d7957148db782f176005a62ec76c94`; local `git ls-tree` ของ commit นั้นมี `hinata/idle.gif`, gaming/chill/posters ตรงกับ path ที่ resolver สร้าง (`scripts/character-art.mjs:23`). จึง **ไม่พบ path mismatch** ใน default URL. Resolver `:19` ปฏิเสธ protocol/credentials/query/fragment และ `:22` localhost แบบ exact list; ไม่ได้พิสูจน์ public DNS/routability ทุกกรณี. Test `scripts/tests/character-art.test.mjs:13` ตรวจ transformation กับ example CDN ไม่เรียก remote host.

**แก้/พิสูจน์:** release artifact manifest บันทึก hash/license/source commit ของ art และทดสอบ path แบบ local tree fixture; ตรวจ bytes ของ shipped asset ตามที่ตั้งใจ. Public accessibility/content type/Discord rendering ให้เป็น authorized staging/viewer gate ภายหลัง; ไม่เพิ่ม SSRF fetch validator ใน server เพื่อพิสูจน์ URL. รอบนี้ไม่มี network probe.

## Local boundary และ trust trace ที่ครอบคลุม

| Boundary | สถานะจาก source | ข้อจำกัด/การตัดสินใจ |
|---|---|---|
| Socket | IPv4 loopback only, port validated 1024–65535 (`scripts/studio-server.mjs:48`, `:906`) | ป้องกัน direct LAN reachability; ไม่แยกผู้ใช้/process ในเครื่อง |
| Host / Origin / CSRF | ไม่มี guards; Host ใช้เป็น URL base; CORS headers ไม่เปิด | M1, B1; cross-origin read ไม่ถือว่าสำเร็จเพียงเพราะส่ง request ได้ |
| Methods | Route checks GET/POST/PUT/DELETE; unmatched เป็น 404 (`scripts/studio-server.mjs:873`) | ไม่มี global 405/Allow; quit ไม่ต้องมี body; refresh ใช้ GET ที่มี side effect |
| Body / timeout | JSON parse, character-count limit; Node defaults ยังมีผล | M2; ต้องมี byte cap, UTF-8 correctness และ explicit idle/receive deadline ไม่อ้าง unlimited |
| Static file paths | Art จาก fixed map (`scripts/studio-server.mjs:697`); mock art flat-name+extension guards (`:713`) | ไม่พบ traversal sink ที่ยืนยัน; test encoded slash/backslash/.. และ SVG navigation policy |
| Untrusted text | scene/app/GIF titles ส่วนใหญ่ textContent; nowSub escape interpolation (`scripts/discord-presence-studio.html:2358`) | ไม่พบ confirmed stored XSS; innerHTML ที่ตรวจเป็น constant/i18n/error mapping ต้องรักษา contract |
| URL rendering | persisted link HTTPS; renderer `href`/`window.open` (`scripts/discord-presence-studio.html:2042`, `:1982`) | draft URLs ต้อง validate ตอนใช้งานด้วย; Electron navigation/external-open guards เป็น main boundary |
| Shell | Browser opener spawn ใช้ fixed localhost URL + validated numeric port (`scripts/studio-server.mjs:511`) | ไม่พบ attacker text ไหลไป arbitrary shell command; Windows `cmd /c start` ไม่ควรถูกใช้กับ arbitrary remote URL ในอนาคต |
| IPC / preload | named API เท่านั้น, contextIsolation; ไม่ expose raw ipcRenderer | B1: named API มี mutation; sandbox false, no sender/navigation guard |
| Secret boundary | API ไม่คืน GIPHY value, config ไม่เก็บ key; ID เป็น public | M3/M4/N1: disk write/recovery/privacy ยังมีช่อง |
| Privacy local data | process paths/foreground + Start Menu cache 7 วัน (`scripts/installed-apps.mjs:9`, `:71`) | เก็บ installed-apps.json ใน profile; ต้องมี retention/delete/support-export policy ที่ตรงจริง |
| Network | GIPHY fixed endpoint, remote images/fonts, updater feed GitHub | ไม่มี analytics endpoint ที่พบในไฟล์ที่ตรวจ; ไม่อ้างว่า dependency/runtime ทั้งหมดไม่มี telemetry |
| Crash/restart | Discord reconnect exponential backoff, config queue survives rejection | M3/M4/M7; watcher exit ไม่ restart; crash durable write ยังไม่พิสูจน์ |
| Single instance | Electron lock (`electron/main.js:30`), CLI uses port collision | different CLI ports ใช้ profile เดียวกันได้; port collision ไม่พิสูจน์ identity |
| Tray/quit/autostart/update | มี implementation แต่หลาย owner/routes | B2/M6/M7; installed runtime gates ยังไม่ผ่าน |
| Release/downgrade | lock+workflow+manual release doc มี baseline | M5/M8/N3; source/string tests ไม่เท่ากับ installed proof |

## Tests ที่มี และ proof ที่ยังขาด

| Existing test | ยืนยันได้ | ไม่ได้ยืนยัน |
|---|---|---|
| `scripts/tests/app-secrets.test.mjs:32`, `:82` | sequential save/load, env precedence, public status shape, clear | concurrency, ACL, injected I/O/rename failures, canary absence ทุก response/log |
| `scripts/tests/local-config-store.test.mjs:9`, `:32` | normal restart roundtrip, reset path | backup bytes จริง, crash atomicity, read-only/future schema, failure แล้ว memory=disk |
| `scripts/tests/studio-server.test.mjs:86`, `:199` | config/key/mapping roundtrip และ selected validation | Host/Origin/CSRF, malformed request/UTF-8, quit/install/tray, poisoned listener |
| `scripts/tests/windows-autostart.test.mjs:8` | generated VBS fields และ temp-file toggle | actual WScript execution, Electron path, login/upgrade/uninstall semantics |
| `scripts/tests/giphy-search.test.mjs:76`, `:174` | fake fetch parameters, normalization, sequential cache | real provider privacy/limits, concurrent misses, bounded remote body/redirect policy |
| `scripts/tests/character-art.test.mjs:13` | local-reference conversionและ rejection | public asset delivery, Discord viewer, release asset/license/hash |
| `scripts/tests/electron-packaging.test.mjs:42`, `:55`, `:72` | parse cleanly, file sizes, `src.includes()` markers | module inclusion, startup, IPC origin, API return types, tray, updater behavior, signing, install/update/downgrade |

**ข้อจำกัดสำคัญ:** packaging test ที่ตรวจว่ามีคำ `Tray`, `autoUpdater`, `quitAndInstall` หรือ `contextBridge` จะผ่านได้แม้ code ไม่ทำงานหรืออยู่ใน comment. B2 เป็นตัวอย่างที่ parse และ source-string assertions ไม่จับ. `--smoke-test` ใน `electron/main.js:316` ไม่ใช่ isolation mode: ก่อนถึง smoke แอปเรียก `ensureDefaultLoginItem`, start server/watchers/default Discord application และ wire updater แล้ว. ต้องออกแบบ fixture adapters/profile/startup suppression ก่อนอนุญาต desktop smoke.

Server tests แม้ตั้ง temp config/secrets, disable autostart/app detection/default application (`scripts/tests/studio-server.test.mjs:42`) ก็ยังไม่ได้ stub `DiscordRPC.Client`: หลัง save fake client ID path `scripts/studio-server.mjs:634` เรียก `connectDiscord` ซึ่ง `scripts/studio-server.mjs:396` login จริง. อย่าเรียก suite นี้ว่า hermetic หรือใช้เป็น permission ให้เปิด Discord. Coordinator เป็นเจ้าของ install/full-test; worker รอบนี้ไม่รัน server tests.

### บันทึก isolated experiments ที่รันจริง

```text
UPDATER_SEND: Cannot read properties of undefined (reading 'catch')
HTTP_PARSER: accepts text/plain JSON with foreign Origin (parser only)
MALFORMED_HOST_EVENT: isolated async EventEmitter child exit=1 ERR_INVALID_URL
UTF8_CHUNKS: expected=ไทย🙂 actual=���ทย🙂
PARALLEL_SECRETS: runs=12 concurrentFailures=12 lostUpdates=12 bothRetained=0
FUTURE_SCHEMA: v999 silently accepted, saved as v2, unknown field lost
UNREADABLE_SECRETS: corrupt original overwritten by partial save without preserved backup
RENAME_FALLBACK: EPERM then EIO removes original and staged secret replacement
CONFIG_READ_FAILURE: injected read/access failure leads to default overwrite without backup
SECRET_READ_FAILURE: valid fake environment key ignored on EIO
GIPHY_NORMALIZER: accepts foreign HTTPS artwork host; title remains data
```

FS failure experiments inject stubs into source functions ที่ตัด imports/exports แล้ว evaluate ใน scope จำลอง; ไม่ใช่ actual Windows filesystem failure. Concurrent saves, corrupt-file replacement และ schema roundtrip ใช้ module จริงกับ directory ที่สร้างใน system temp แล้วล้างเฉพาะ directory นั้น. Evidence ไม่ได้จำลองหรือใช้ key/profile จริง. UTF-8/parser/EventEmitter experiments extract function/statement เดิมจาก checked source; host-child ไม่เรียก HTTP server.

ตัวอย่าง reproduce B2 แบบไม่มี Electron:

```js
const win = { webContents: { send() {} } }; // contract: void
win.webContents.send('vibe:update-state', {}).catch?.(() => {});
// TypeError: Cannot read properties of undefined (reading 'catch')
```

## แผนเล็กสุดที่ทำได้จริง

1. **ปิดสอง blocker ก่อน:** void-send fix + destroyed-recipient guard; Electron owns listener/fail-closed + IPC sender/frame guards + deny navigation/new windows. Verify fake desktop seams ก่อน installed gate. ไม่ต้อง rewrite renderer หรือสร้าง remote backend.
2. **ทำ request boundary หนึ่งจุด:** Host/Origin/content-type/method/URL error boundary + bounded UTF-8 parser; optional launch capability ตาม threat model. ย้าย scan-refresh ไป POST. ใช้ in-memory request/response adapter เพื่อ negative tests ไม่จำเป็นต้องเปิด live companion.
3. **ทำ persistence writer/transaction หนึ่งชุด:** serialize mutations, stage → save → commit memory; preserve originals on I/O failures, unique temp, supported schema/read-only future format, migration backup. ทำ deterministic concurrency/fault tests; file-based store ยังเพียงพอ.
4. **รวม lifecycle ownership:** Electron autostart adapter เดียว, boot-ready state, tray fallback, idempotent bounded shutdown, updater state guards. Preserve existing explicit owner choices และเลิก write-on-load. CLI behavior แยก adapter ได้โดยไม่เพิ่มความซับซ้อนให้ user flow.
5. **ยืนยัน release artifact:** coordinator sync lock metadata, clean install/test/build ใน job ที่อนุญาต, inspect runtime contents, version/provenance/checksum/signature policy, draft/staging install→update→backout. Windows ที่ผ่านก่อน; mac/Linux ต้องมีหลักฐานของตนเอง.

ทางเลือกที่ง่ายกว่าเมื่อยังไม่พร้อม: **พักการเปิด auto-update ใน release build** จน installed gates ผ่าน ใช้ signed/manual installer พร้อม checksums และ profile-backup policy ที่พิสูจน์ได้; browser/CLI mode คงใช้ได้หลัง HTTP/persistence fixes. สำหรับพอร์ตชนให้รายงาน error แล้วหยุดปลอดภัยแทนสร้าง discovery/attach protocol. สำหรับ power-loss guarantee ที่ยังไม่ได้ทดสอบให้ระบุข้อจำกัดและเก็บ recoverable copies แทนเพิ่ม SQLite/vault โดยไม่มีความจำเป็น. ทั้งหมดเป็นข้อเสนอ ไม่ได้เปลี่ยน owner decision หรือ source ในรอบนี้.

## Rollout และ backout

- ก่อน rollout บันทึก artifact hash, source commit, runtime dependency manifest และ schema compatibility; backup profile ของ account **ทดสอบ** รวม config, secrets, installed-app cache และ autostart preference ด้วย ACL เดิม. ใช้ synthetic key เท่านั้นใน automated checks.
- Canary ที่ fixture/staging feed ก่อนเปิด update ทั่วไป: cold start, port collision, second-instance while booting, close-to-tray/no-tray, UI/tray/OS quit, login toggle, offline/rejected/timeout updater, download/install interrupt, renderer/RPC/helper crash, read-only/disk-full. Pass ต้อง observable: no unexpected OS startup write, no foreign IPC acceptance, no unhandled rejection, no lost profile bytes.
- Update ต้องสร้าง recoverable pre-migration backup ก่อน schema mutation และยอมให้ read-only เมื่อ format ใหม่เกิน supported range. หยุด rollout เมื่อ canary มี profile loss, repeated crash หรือ startup duplication; ปิด feed/publish route ตาม release owner แทน retry install อัตโนมัติ.
- Backout package โดยคง userData/config/secret directories, secret values และ owner preferences; ห้ามลบ data เพื่อแก้ crash. ถ้ารุ่นเก่าอ่าน schema ใหม่ไม่ได้ให้พักการเขียนและ restore **สำเนาที่ตรวจแล้ว** ของ config คู่เวอร์ชัน ไม่ทับ secret ปัจจุบันด้วย backup เก่าโดยอัตโนมัติ. Preserve both copies จน owner เลือก/ตรวจ recovery แล้ว. ไม่เปิด `allowDowngrade` เป็นทางลัด; gate downgrade ด้วย install pair จริง.
- Installer/uninstaller/auto-update ต้องพิสูจน์ retention ของ profile และ cleanup เฉพาะ autostart ที่แอปเป็นเจ้าของ; การประกาศ NSIS target/asar ใน package ไม่พิสูจน์ behavior เหล่านี้.

## สิ่งที่ยังไม่พิสูจน์ในรอบนี้

Browser local-network policy/CSRF/DNS rebinding, actual poisoned-port desktop boot, Electron crash outcome/IPC denial, Windows ACL/WScript/login/uninstall, packaged dependency contents/signatures, release feed/art reachability, Discord viewer และ install/update/downgrade crash checkpoints ยังเป็น mandatory gates ที่ระบุข้างต้น. ไม่ได้ทำ vulnerability database audit หรืออ่าน live secrets/user data; package integrity fields เป็นหลักฐานของ lock metadata ไม่ใช่การรับรองว่า dependency ไม่มีช่องโหว่. ปัญหาที่ source/isolated proof ยืนยันควรแก้ก่อน ไม่ต้องรอพิสูจน์ exploit ทุกชนิดจาก Internet.
