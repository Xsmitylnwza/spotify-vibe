# Discord Rich Presence — พื้นที่แสดงผลและโลกของตัวละคร

ตรวจเอกสาร Discord ทางการด้วย curl วันที่ 2026-09-05 แล้วเทียบกับ C:/letmecook/spotify-vibe/scripts/presence-config.mjs และ scripts/discord-presence-studio.html

สถานะ: งานวิจัยและข้อเสนอ มีตัวอย่างภาพต้นฉบับ ยังไม่แก้แอปหลัก อัปโหลดภาพ หรือเผยแพร่เว็บ การรองรับตามเอกสารแยกจากการยืนยันบน Discord client จริง

## ทิศทางที่ผู้ใช้ระบุ

- Auto ตามชีวิตประจำวัน แสดงตัวตนให้คนพบเห็นและสงสัย
- ตัวละครเป็นภาพแนว 8-bit เน้นใบหน้า น่ารักและสีสด
- ทำ artwork เอง เช่น SVG แล้วแปลงเป็น GIF เพื่อคุมเอกลักษณ์
- ออกแบบข้อความ รูป ลิงก์ และสิ่งที่ผู้ชมพบหลังคลิกให้ครบ ไม่ใช่เฉพาะ journey ผู้ตั้งค่า

## ผลตรวจแพลตฟอร์มและของเดิม

| พื้นที่ | Discord ระบุไว้ | ของเดิม | การออกแบบเสนอ |
|---|---|---|---|
| ข้อความกิจกรรมใน member list | status_display_type เลือก Name=0, State=1, Details=2 [1,2] | ยังไม่มี field นี้ใน validator/payload/preview | ใช้ชื่อสถานการณ์สั้น ๆ เช่น BUG FARM หรือ MIDNIGHT RAID เพื่อชวนเปิดโปรไฟล์ ไม่เปลี่ยนชื่อแอปทุกครั้ง |
| ชื่อ/ประเภทกิจกรรม | RPC SET_ACTIVITY ใช้ Playing, Listening, Watching, Competing [3] | มีครบ 4 ประเภท | เลือกประเภทให้สอดคล้องกับกิจกรรม ชื่อแอป/โลกคงที่เพื่อให้จำได้ |
| รูปใหญ่ | large_image, large_text เมื่อ hover, large_url เมื่อคลิก [1,2] | ส่งครบ | หน้าตัวละคร GIF, tooltip มีชื่อ+สภาพ, คลิกเปิดหน้า Meet ของตัวนี้ |
| รูปเล็ก | small_image, small_text, small_url [1,2] | ส่งครบ | badge ประจำกิจกรรม เช่น ประแจ/จอย/พระจันทร์ คลิกอ่านโหมดหรือของที่เกี่ยวข้อง |
| ข้อความบรรทัด details | ข้อความและ details_url [1,2,3] | ส่งครบ | บอกกิจกรรมเป็นคำสั้น เช่น “กำลังเลี้ยงบั๊ก”; คลิกดูสิ่งที่กำลังสร้างซึ่งเจ้าของเลือกให้เปิดเผย |
| ข้อความบรรทัด state | ข้อความและ state_url [1,2,3] | ส่งครบ | ชื่อสถานการณ์/สภาพ “BUG FARM”; คลิกอ่านสภาพและที่มาของมุก |
| Timer | elapsed, remaining; Listening/Watching ใส่ start+end เพื่อ time bar ได้ [1] | มี none/elapsed/remaining แต่เลือกแค่ start หรือ end | แสดงระยะกิจกรรมจริง ไม่เปลี่ยน timer ทุกครั้งเปลี่ยนสีหน้า; time bar ใช้เมื่อมีระยะเวลาจริง |
| ปุ่ม | สูงสุด 2; label 1–32 ตัวอักษร URL 1–512 [1,2] | มี validation/ส่งครบ | “เข้าห้องลับ” → หน้าโลกตัวละคร และ “ดูของที่ทำ” → ชิ้นงานปัจจุบัน/ชั้นของสะสม |
| Party และ Game Invite | มี party size / join secret สำหรับการเข้า session จริง [1,2,3] | ยังไม่มี | ยังไม่ใส่ตัวเลขปลอมเป็นเลเวลหรือ HP ถ้าภายหลังทำกิจกรรมร่วมกันจริงค่อยเพิ่ม |
| Arbitrary canvas/HTML | Rich Presence เป็นข้อมูลให้ Discord วาด; Embedded Activity เป็นอีก integration [4] | เป็น desktop RPC companion | interaction เล่นกับตัวละครอยู่ในเว็บที่เปิดจากลิงก์ |

รายละเอียดสำคัญ: ปุ่ม Rich Presence มองเห็นโดยคนอื่น เจ้าของไม่เห็นปุ่มบน Presence ของตนเองตามเอกสาร [2] ต้องยืนยันกับเพื่อนหรือบัญชีผู้ดูอีกฝั่ง ทั้ง hover และรูปเล็กไม่ควรเป็นทางเข้าหลักเพียงอย่างเดียว เพราะผู้ใช้มือถือไม่มี mouse hover และการจัดวางต่างกัน

status_display_type เป็นโอกาสสำคัญต่อเป้าหมาย “เห็นก่อนเปิดพอร์ต”: เอกสารระบุว่าเลือกข้อความใน member list ได้ แต่ไม่ได้เปลี่ยน avatar, custom status หรือบังคับให้การ์ดนี้ถูกเลือกเหนือกิจกรรมเกมอื่น ต้องเพิ่ม payload แล้วทดสอบเส้นทาง discord-rpc ปัจจุบันก่อนสัญญาว่าทุก client แสดงเหมือนกัน

## GIF และ SVG: เส้นทางที่รองรับ

เอกสารแยกไว้ชัดเจน [1,2]:

- Assets อัปโหลดใน Developer Portal รองรับ PNG/JPEG/WebP ตาม Gateway reference
- External image URL รองรับ GIF, animated WebP และ AVIF
- Discord แนะนำ artwork 1024×1024 [2,5]; ไม่ได้หมายความว่าภาพต้นฉบับ pixel art ต้องวาดละเอียดถึง 1024 ช่อง
- SVG ใช้เป็น source ที่แก้ไขได้; เส้นทางนี้ส่ง GIF/PNG ให้ Discord ไม่ส่ง local SVG หรือ local file path
- URL ของภาพต้องเข้าถึงได้สาธารณะ และต้องเป็น URL ของไฟล์ภาพ ไม่ใช่หน้า preview/หน้า gallery

ข้อเสนอ pipeline: วาดหน้าบนกริด 64×64 ด้วย SVG → สร้าง SVG แต่ละ frame จาก palette/expression → render raster → ขยาย nearest-neighbor เป็น 1024×1024 → encode GIF → ตรวจลูป สี และ crop → เมื่อนำไปใช้งานจริงจึงวางบน HTTPS asset host ที่เลือก

ไม่ต้องเปลี่ยน RPC ทุก frame; ส่ง URL ของ GIF ประจำสภาพครั้งเดียวให้ client เล่นเอง เปลี่ยน URL เมื่อสภาพเปลี่ยน เส้นทาง asset ใช้ชื่อมี version เช่น /assets/face/coding-v1.gif เพื่อเลี่ยงการเปลี่ยนเนื้อหาใต้ URL เดิมแล้วติด cache

ฟอร์แมต, animation autoplay/reduced-motion, การ crop, cache, ขนาดไฟล์สูงสุด และการ decode ของแต่ละ client ต้องตรวจจากไฟล์จริง ไม่ระบุข้อจำกัดขนาดไฟล์ที่เอกสารที่อ่านไม่ได้ให้ไว้

## ภาษาภาพที่เสนอ

หน้าใหญ่เป็นจุดจำ: ใช้รูปทรง สีหลัก ดวงตา และตำแหน่งใบหน้าร่วมกันทุกสภาพ เว้นขอบปลอดภัย ไม่วาดข้อความเล็กในภาพ เพิ่มรายละเอียดกิจกรรมใน badge เล็กแทนขนทุกอย่างขึ้นใบหน้า

6 สภาพแรกที่คุยต่อได้:

| สภาพ | ใบหน้า/animation | Badge | ตัวอย่างข้อความ |
|---|---|---|---|
| Idle | ลอยเบา ๆ กระพริบตา มองข้าง | ดาว | รอ side quest |
| Coding | คิ้วตั้งใจ พิกเซลประกายข้างหัว | ประแจ | กำลังเลี้ยงบั๊ก |
| Gaming | ตาเป็นประกาย แก้มเด้ง | จอย | ออกทำภารกิจ |
| Media | โยกช้า ๆ ตาหยี | หูฟัง | อยู่ในโลกอีกใบ |
| Away | หลับตา ฟองจมูกเบา ๆ | เมฆ | เจ้าของหาย ตัวแทนอยู่ |
| Late-night | ตาปรือ สีฉากเข้มขึ้นเล็กน้อย | พระจันทร์ | ยังไม่ยอมปิดเครื่อง |

Late-night เป็นชั้นตกแต่งทับ Coding/Gaming ได้ ไม่มีเหตุให้ต้องแย่งโหมดกิจกรรมหลัก สีหน้าหรือพลังเป็นบุคลิกแต่ง ไม่อ้างว่าอ่านอารมณ์ สุขภาพ หรือรู้ผลแพ้ชนะจากการเปิดโปรแกรม

## การ์ดที่ชวนสงสัยและมีรายละเอียดให้สำรวจ

ชื่อตัวละครและโลกด้านล่างเป็นตัวอย่าง ยังไม่ได้ตั้งชื่อจริง

```
member list: Playing BUG FARM

Playing POCKET ME
[หน้าพิกเซล GIF]   กำลังเลี้ยงบั๊ก
       [ประแจ]    BUG FARM
                  42:17 elapsed

[ เข้าห้องลับ ] [ ดูของที่ทำ ]
```

นี่เป็น wireframe เนื้อหา ไม่ใช่ screenshot หรือคำรับรอง layout ของ Discord

แต่ละลิงก์ไม่ควรพาไปหน้าเดียวที่ไม่เกี่ยวกับสิ่งที่กด:

- รูปใหญ่ → /me#character: ตัวใหญ่กว่าเดิม ชื่อ คำแนะนำตัวกวน ๆ และให้แตะหน้าแล้วมันมี reaction ใน browser ของผู้ชม
- รูปเล็ก → /me/forms/coding: สภาพ Coding กับความหมายของ badge
- Details → /lab/current: งาน/ของเล่นที่เจ้าของเลือกโชว์ พร้อมภาพ demo และคำอธิบายสั้น
- State → /me/forms/coding#story: เรื่องเล่าของสภาพนี้
- ปุ่มหลัก → /me: ห้องส่วนตัวเต็มหน้า
- ปุ่มรอง → /lab: ของทดลองที่มีอยู่จริง ถ้ายังไม่มีชิ้นงานปัจจุบันให้เปิดชั้นรวม ไม่สร้าง “current project” เท็จ

URL เป็นรูปแบบที่เสนอ ยังไม่มี domain หรือหน้าเหล่านี้ออนไลน์ ใช้ 2–3 ปลายทางหลักแล้ว deep-link เข้า section ให้จำง่าย

## หน้าปลายทางที่เชียร์: ห้องส่วนตัวของตัวละคร

ผู้ชมเปิดเว็บแล้วเจอหัวตัวเดิมจาก Discord ในจอ/กรอบพิกเซลขนาดใหญ่ เห็นสภาพปัจจุบันเมื่อมีข้อมูลสด พร้อมของบนโต๊ะที่กดสำรวจได้:

1. **ตัวละคร** — คลิกหน้าแล้วมันกระพริบตา/แกล้งค้าง/ปล่อยกล่องข้อความ; reaction ทำงานเฉพาะในหน้าของผู้ชมก่อน จึงไม่ต้องมีบัญชีหรือเขียน state กลับไปหาเจ้าของ
2. **โต๊ะทดลอง** — ชิ้นงาน 1–3 อันเป็นตลับเกม กดดู demo, screenshot หรืออ่านเบื้องหลังสั้น ๆ เหตุผลในการเปิดพอร์ตเกิดจากความสงสัยที่การ์ดสร้างมาแล้ว
3. **ตู้รวมร่าง** — ดูสภาพต่าง ๆ ที่ออกแบบไว้ และสภาพพิเศษที่เคยเกิดจริงถ้าเพิ่ม history ภายหลัง; ให้ผู้อ่านเข้าใจว่าทำไมตัวใน Discord หน้าตาแบบนั้น
4. **แผ่นป้ายเจ้าของ** — แนะนำตัวสั้น มี GitHub/พอร์ตเต็ม แต่ไม่แย่งจุดสนใจของตัวละคร

ของเล่นที่เหมาะในอนาคต: easter egg ซ่อนหลัง badge, ตลับเล่าประวัติการสร้าง GIF, rare cosmetic เกิดจากกิจกรรมที่ตรวจได้ การ feed ตัวละครแล้วเปลี่ยน Presence ของเจ้าของจริงเป็นอีกขอบเขต มี backend/write controls เพิ่ม จึงยังไม่รวมในรุ่นแรก

## เว็บและ companion ทำงานร่วมกันอย่างไร

โปรเจกต์ประกอบด้วย local Windows companion เดิมและ public web page ใหม่ เพื่อนเปิด localhost ของเจ้าของไม่ได้

- Companion ตรวจโหมดและเลือก artwork/text แล้วส่ง Presence เข้า Discord Desktop
- สำหรับหน้า live: Companion ส่งเฉพาะข้อมูล public ที่กำหนด เช่น characterId, mode, expression, startedAt, updatedAt ไป backend สาธารณะ; หน้าเว็บอ่านชุดนี้ ไม่เข้าถึง process list ในเครื่อง
- GIF อยู่บน asset host ที่ Discord และ browser เข้าถึงได้
- หน้า public ต้องยังเปิดได้เมื่อปิดคอม; ถ้าข้อมูลเก่าแสดง “Last seen”/เวลาล่าสุด ไม่ค้างป้าย LIVE
- รุ่นเริ่มอาจเป็นหน้า static พร้อมตัวละคร+ผลงาน และลิงก์เลือกสภาพจาก Presence โดยไม่อ้างว่า live ถ้าต้องการให้สถานะข้ามเว็บเปลี่ยนตามจริงค่อยมี endpoint/state storage
- การแก้โปรเจกต์หลักต้องแยก draft preview, locally selected state, RPC accepted, และ viewer-confirmed output อย่าเรียกภาพพรีวิวว่าแสดงจริงแล้ว

## ผลตรวจโค้ดเพิ่มเติม

createDiscordActivity ส่ง image/text click URLs อยู่แล้ว แปลว่าลูกเล่นคลิกส่วนใหญ่มีทางส่งข้อมูลรองรับใน repo การเพิ่มใหม่หลัก ๆ คือ status_display_type, character pack/rendering, context-aware link mapping, visitor page, public asset serving และ public-state sync ถ้าเลือก live

renderPreview ใน Studio แสดงภาพ, hover text และปุ่ม แต่ยังไม่ได้จำลองลิงก์บนรูปและ details/state ครบ และไม่มี member-list preview จึงควรเพิ่ม Preview ในมุม “คนเห็นผ่านรายชื่อ → เปิดโปรไฟล์ → เปิดเว็บ” รวมกับตัวอย่างเมื่อ GIF ไม่เล่นหรือภาพโหลดไม่สำเร็จ

## ตัวอย่าง artwork ที่สร้างในรอบนี้

[Idle GIF](character-study/idle.gif) · [Coding GIF](character-study/coding.gif) · [SVG idle](character-study/idle.svg) · [SVG coding](character-study/coding.svg) · [ตัวสร้าง SVG frame](character-study/character-source.mjs)

วาด original SVG shapes ด้วยโค้ด ไม่ดึง GIF สำเร็จรูป สร้างลูป 40 source frames ที่ 100 ms ต่อ frame; encoder รวมเฟรมซ้ำเหลือ 10 encoded frames โดยรักษาระยะลูป 4000 ms GIF 1024×1024 มีขนาด 34,264 และ 34,713 bytes ตามลำดับ มีไฟล์ preview 256×256 ไว้แสดงในแชต ตรวจขนาด ระยะลูป และ contact sheet แล้ว ยังไม่มีผลตรวจจาก Discord

ร่างนี้ทดสอบแนวทางวาดและความอ่านออกของใบหน้าเท่านั้น ผู้ใช้ยังไม่ได้ยืนยันชนิดตัวละคร ชื่อ หรือ palette สุดท้าย

## หลักฐานทางการ

1. [Gateway Activity Object](https://docs.discord.com/developers/events/gateway-events#activity-object) — structure, status display types, image formats, buttons, timer
2. [Setting Rich Presence](https://docs.discord.com/developers/discord-social-sdk/development-guides/setting-rich-presence) — external animated assets, field URLs, buttons visible only to others, direct RPC, status text
3. [RPC SET_ACTIVITY](https://docs.discord.com/developers/topics/rpc#setactivity) — activity types allowed and explicit clickable field/image payload example
4. [Rich Presence overview](https://docs.discord.com/developers/platform/rich-presence) — public surfaces and SDK distinction
5. [Rich Presence best practices](https://docs.discord.com/developers/rich-presence/best-practices) — short copy, clear artwork, tooltips, 1024px recommendation

อ่านจากหน้าเอกสารสดผ่าน .md endpoint; สำเนาวิจัยอยู่ใน work/discord-research ไม่มีการใช้ browser control หรือเผยแพร่ผลออกสาธารณะ
