# ผลตรวจช่องว่างแผนและ source

วันที่ 2026-09-05 · เป้าหมาย: ตรวจว่าทิศทาง app mapping + human chibi + personal public space ครอบคลุมการใช้งานจริงและต่อยอดโค้ดเดิมได้หรือไม่

ฐาน repo: C:/letmecook/spotify-vibe, HEAD 53e1573 มี output/ untracked เดิม ไม่ได้แก้ source หรือ config ผู้ใช้

## ทางที่เล็กลงแต่ยังครบเป้าหมาย

ใช้ Scene/RPC/scheduler/reconnect/autostart เดิมเป็นฐาน แล้วเพิ่ม mapping, looks และ public content เป็นขอบเขตแยก ลดภาระด้วยการเริ่ม native programs ตามที่ผู้ใช้ยืนยัน และใช้ public page ที่จัด sections ได้ก่อน page builder อิสระ ไม่ทำ AI inference, mascot lore หรือสร้าง Scenes ทวีคูณตามชุดภาพ

## Findings ตามความสำคัญ

### Major — กติกาหลายแอปและความหมายของ “กำลังใช้” ยังไม่ตกลง

ผลกระทบ: เปิด editor + เกม + เพลงพร้อมกันแล้วตัวเลือกที่ถูกต้องยังไม่มีนิยาม จึงเขียน acceptance test ไม่ได้

หลักฐาน: app-mapping-and-personal-space.md ระบุ foreground เป็นข้อเสนอ; โค้ด C:/letmecook/spotify-vibe/scripts/discord-presence-studio.mjs:164 ใช้แค่ override/time slot ไม่มีตัวเลือกแอป

แก้แผน: ถาม foreground เทียบกับ priority; ผูก app discovery, Alt-Tab, unknown app, sleep/lock และ fallback เข้ากับกฎที่เลือก

### Major — mood/outfit ไม่มีขอบเขตอายุและ precedence

ผลกระทบ: เปลี่ยนแอปแล้วอารมณ์อาจถูกล้าง หรือ mood override แย่งการ์ดทั้งใบจน text/link ไม่ตามแอป

หลักฐาน: human-chibi-direction.md ยังเปิดเรื่อง expiry; C:/letmecook/spotify-vibe/scripts/presence-config.mjs:75 ผูกรูปกับ Scene; scripts/discord-presence-studio.mjs:502 override ทั้ง Scene

แก้แผน: แยก mood/outfit override จาก pin card กำหนด expiry และไม่รีเซ็ต activity clock

### Major — การแต่งชุดถูกจำกัดด้วย schema ที่มีแต่ Scene

ผลกระทบ: app × mood × outfit จะทำสำเนาเกินความจำเป็น และ schema เดิมไม่เก็บ mappings

หลักฐาน: C:/letmecook/spotify-vibe/scripts/presence-config.mjs:144 จำกัด 1–20 Scenes; :170 คืน object version 1 ที่ประกอบ field เดิมเท่านั้น

ทดลอง: ส่ง appMappings เข้า validateConfig แล้ว field ไม่ปรากฏในผลลัพธ์

แก้แผน: v2 migration, mapping/template/look/session แยกกัน และไม่ทำหนึ่ง Scene ต่อชุดผสม

### Major — draft editing และ session time ขัดกับประสบการณ์ใหม่

ผลกระทบ: การแก้ข้อความหรือชุดอาจส่งของไม่เสร็จออก Discord และทำให้ระยะกิจกรรมเริ่มใหม่

หลักฐาน: C:/letmecook/spotify-vibe/scripts/discord-presence-studio.html:2317 autosave 650 ms → scripts/discord-presence-studio.mjs:472 save config → :484 force reconcile → :264 applyScene → scripts/presence-config.mjs:277 createDiscordActivity ใช้ now เป็น timer start

ทดลอง: ส่ง Scene เดิมเวลา 10:00 แล้วแก้ state ส่งเวลา 10:42 timestamp start เพิ่ม 2,520,000 ms

แก้แผน: draft/activate แยก, stable activity session, appearance updates ไม่เปลี่ยนเวลาเริ่ม

### Major — public page ยังขาด content workflow และ boundary กับ local app

ผลกระทบ: มีหน้าสวยแต่เจ้าของเพิ่มงาน/แก้ลิงก์ไม่ได้ และถ้าใช้ local state ตรง ๆ อาจเปิดข้อมูลสำหรับผู้จัดการออกไป

หลักฐาน: C:/letmecook/spotify-vibe/src/App.tsx:1 เป็น Spotify prototype; scripts/discord-presence-studio.mjs:183 runtimeSnapshot มี configPath/secretsPath; :638 เป็นต้นไปเป็น API จัดการ local Studio

แก้แผน: ระบุ content CRUD/reorder/hide/draft/publish/rollback, stable links, local-only control และ explicit public projection

### Major — original GIF ยังไม่มี publishing lifecycle

ผลกระทบ: เลือกชุดใหม่แล้วมีไฟล์ในเครื่องแต่ Discord ยังดึงไม่ได้; URL cache/การลบภาพทำให้การ์ดรุ่นก่อนเสีย

หลักฐาน: scripts/presence-config.mjs:105 ตรวจ image references และ :277 ส่ง references เท่านั้น; ไม่มี upload/render/version management ใน scripts ที่ตรวจ เอกสาร Discord รองรับ external URL ไม่ใช่ local file path

แก้แผน: render → validate → publish URL → activate look, คงภาพเดิมขณะเตรียม, PNG fallback และไม่ลบ version ที่ใช้อยู่

### Major — save queue ไม่ฟื้นจาก write failure

ผลกระทบ: เมื่อ write ล้มเหลวหนึ่งครั้ง การ save ถัดไปผ่าน instance เดิมอาจล้มเหลวต่อแม้แก้สาเหตุแล้ว ขัดกับการตั้งค่าใช้ทุกวัน

หลักฐาน: C:/letmecook/spotify-vibe/scripts/local-config-store.mjs:25 ต่อคิวด้วย writeChain.then โดยไม่มี recovery ก่อน write ถัดไป

ทดลองใน scratch: สร้าง parent เป็นไฟล์ให้ save แรก EEXIST → แก้ parent เป็น directory → save เดิมยัง EEXIST → สร้าง store instance ใหม่แล้ว save สำเร็จ

แก้แผน: กำหนด retry/recovery ของ persistence เป็น acceptance scenario ไม่บอก Saved ก่อนเขียนจริง; ยังไม่ได้แก้โค้ด

### Major — migration/rollback ยังไม่กำหนด

ผลกระทบ: validator ใหม่หรือ binary เก่าอาจตัด field/reset ข้อมูล หลังอัปเกรดการตั้งค่าเดิมอาจหาย

หลักฐาน: C:/letmecook/spotify-vibe/scripts/local-config-store.mjs:31 load จับ validation errors ไป recovery/default; scripts/presence-config.mjs:170 คืน v1 object; ยังไม่มี version migration

แก้แผน: version-aware read, backup, separate invalid versus unsupported version, preserve schedule-only และ rollback config คู่ runtime

### Moderate — pause/hide/restart และ unknown activity ต้องระบุ

ผลกระทบ: Pause ที่ยังโชว์การ์ดอาจถูกเข้าใจว่า Hide, idle อาจแทนกิจกรรมที่กำลังเกิด, restart อาจคืนค่าเก่า

หลักฐาน: C:/letmecook/spotify-vibe/scripts/discord-presence-studio.mjs:488 pause หยุด scheduler และ :537 pauseAndClear เป็นอีกพฤติกรรม; manual override expiry ยังอิง time slots

แก้แผน: labels/semantics แยก pause/pin/hide/resume, hidden intent persisted, lock-aware restore, manual Away สำหรับ controller/media

### Moderate — การยืนยันสองปลายทางและค่าเก่ายังไม่ครอบคลุม

ผลกระทบ: Discord รับแล้วเว็บยังไม่รับ หรือคิวเก่าทำให้การ์ดถอยกลับ; public LIVE อาจค้างเมื่อเครื่องดับ

หลักฐาน: C:/letmecook/spotify-vibe/scripts/discord-presence-studio.mjs:218 คิว promise และ :270 closure ของ Scene; ปัจจุบันไม่มี public state channel

แก้แผน: latest intent/revision, separate destination status, last-seen policy, no historical replay on reconnect

### Moderate — “เห็นใน preview” ยังไม่เท่ากับ “เพื่อนเห็น”

ผลกระทบ: งานอาจดูผ่านบน local mock แต่ปุ่ม/รูป/ข้อความใน Discord และมือถือไม่ตรง

หลักฐาน: C:/letmecook/spotify-vibe/scripts/discord-presence-studio.html:1662 preview ภาพ/text/button; ยังไม่มี member-list/status_display_type และไม่ได้จำลอง image/text link click ครบ

แก้แผน: ตรวจ profile/member-list/mobile และการอยู่ร่วมกับ game Presence ด้วย viewer จริง ปุ่มตามเอกสารแสดงเฉพาะผู้อื่น ต้องไม่นับ owner view เป็น failure

## การตรวจที่ทำ

- อ่าน flow config → scheduler/override → queue → RPC และ persistence/recovery รวม UI save/preview และ source tests ที่เกี่ยวข้อง
- ตรวจขอบเขตใหม่กับเอกสารใน outputs และ Discord official docs ที่ fetch สดก่อนหน้าในบทสนทนาวันเดียวกัน
- รัน focused experiments 3 ข้อด้วย work/plan-audit.mjs; scratch state แยกจาก %APPDATA% และ repo
- ตรวจชื่อโปรแกรมที่มีหน้าต่างและรายการ Start Apps แบบอ่านอย่างเดียว ไม่อ่านชื่อหน้าต่าง/แท็บ พบ Chrome/Discord และรายการ launcher Steam/Riot ซึ่งสนับสนุนความจำเป็นของกรณี launcher → ตัวเกม ยังไม่ได้ทดลอง detector foreground
- ชุดเดิม 31 tests ผ่านในรอบก่อนหน้า ไม่มี source เปลี่ยนจึงไม่รันซ้ำ รอบนี้ไม่อ้างว่า integration ใหม่หรือ Discord live ผ่านแล้ว

## ข้อสรุป

Verdict: fix-then-build — ใช้ร่างรวมเป็นฐานได้ แต่ต้องปิดกฎเลือกแอปและเพิ่ม contracts ของ draft/mood/assets/public/recovery ก่อนเริ่มลงรายละเอียด implementation
