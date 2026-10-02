# Vibe Studio — generated ghost options

ส่งมอบ 13 raster concepts ด้วย installed `$imagegen` skill ใน built-in image_gen mode: 01–04 ใกล้ direction d, 05–08 stylistic variations, 09–13 silhouette/hem/expression variations. ไม่มี source edits หรือ commits และไม่เปลี่ยน app/tray icon ที่ใช้อยู่

## ตัวเลือก

- **01 Polished original** — โดมสมดุล ชายสามแฉกมน หน้าอ่านง่าย แสงบาง ๆ ใกล้ direction d
- **02 Plump proportions** — หน้ากว้างขึ้นเล็กน้อย ตัวนุ่มและ gradient สว่างกว่าบริเวณบน
- **03 Soft light** — soft relief มีเงา lavender ใต้ชาย ghost แต่เส้นหน้ายังคม
- **04 Diamond wink** — sparkle คมขึ้น body ขาวเรียบและชายสี่ปลาย ต่างจาก prompt ที่ขอสามปลาย
- **05 Glossy porcelain** — ผิว porcelain เงาและ tile มีขอบนูนชัด เป็น 3D ที่เด่นที่สุด
- **06 Soft clay** — body matte นุ่ม มี depth บาง ๆ และ facial marks แบบ relief
- **07 Flat minimal** — silhouette ขาวทึบ หน้าเข้มและไม่มีเงา body เหมาะกับ small app icon
- **08 Subtle glass** — tile มี rim/glow แบบ glass ขณะที่ ghost ยังคงขาวทึบ
- **09 Swooping ghost** — silhouette เอียงเล็กน้อย ชายด้านข้างยกขึ้น ให้ความรู้สึก playful
- **10 V-notch buddy** — ชาย V ลึกและสัดส่วนสมมาตร; generation ไม่ทำตัวเตี้ยกว้างตาม prompt จึงเพิ่ม 13
- **11 Floating ribbon** — ปลายชายด้านข้างโค้งขึ้นพร้อม soft relief ให้ความรู้สึกลอย
- **12 Pill dome** — โดมสูง ชายสี่ปลาย และ tile มุมมนมากขึ้น ความต่างด้าน expression ค่อนข้างน้อย
- **13 Wide cloud buddy** — silhouette เตี้ยกว้างและ wink รูป V ต่างชัดที่สุด แต่ดูคล้าย cloud มากกว่าชุดหลัก

## Top 3 (ความเห็นผู้สร้าง ยังรอ owner เลือก)

1. **07** — contrast และ silhouette เรียบที่สุด อ่านดีที่ 32 px และ redraw SVG ง่าย
2. **01** — balance ใกล้ direction d พร้อมแสงที่นุ่มขึ้น เหมาะเป็นตัวเลือกหลักที่คง character เดิม
3. **09** — เส้นรอบตัวไม่สมมาตรทำให้จดจำง่ายขึ้น โดยยังรักษาหน้าและ wink ของ character

## ตรวจสอบ / ขอบเขตหลักฐาน

**Verified:** เปิดดู owner reference `../final/shot-4-with-d.jpg` และอ่าน `ghost-final-d.svg` ก่อนสร้าง; ใช้ 13 separate built-in calls โดยไม่ได้ใช้ CLI fallback และไม่ได้ส่ง reference files เข้า generation. Exact submitted prompts อยู่ใน `prompts.md`; style/proportion บางจุดจาก generation ต่างจาก prompt ตามหมายเหตุข้างต้น

**Verified:** built-in output เป็น 1254×1254; deliverable ทุก `option-01.png` ถึง `option-13.png` ถูกย่อแบบ Lanczos เป็น PNG 1024×1024. Command `python build_contact_sheet.py` ตรวจจำนวน 13 และขนาดทุกภาพผ่าน พร้อมสร้าง `contact-sheet.png` 1200×1536 ซึ่งมีภาพ preview 224 px และภาพจริง 64/32 px ต่อ option

**Verified by visual inspection:** เปิดดู `contact-sheet.png` และ `32px-check.png` ด้วย view_image ที่ original detail. ทั้ง 13 ยังอ่าน silhouette สีขาวและ wink ได้ที่ 32 px; smile/eye ยังแยกกันได้ แต่ catch-light และรูปสี่แฉกของ sparkle เล็กมาก จึงไม่อ้างว่ารายละเอียดเหล่านี้ครบที่ขนาดเล็ก สีและวัสดุเป็น generated interpretation ของ palette ที่ขอ ไม่ใช่ color-exact production assets

**Pending:** owner visual selection, app/tray integration, exact palette and optical tuning at 16/24/32 px. The chosen raster will be redrawn as SVG for the app/tray icons later; preserve the wink, simplify micro-details and tune stroke widths at each icon size. Raster ไม่มี alpha: พื้นนอก tile เป็น pale lavender ตาม prompt จึงต้องวาดมุม tile โปร่งใสตอน production SVG

`build_contact_sheet.py` เป็น helper เฉพาะ folder นี้สำหรับตรวจ dimensions และ rebuild sheet; ไม่มีการเรียก model หรือเปลี่ยน source. `32px-check.png` แสดงทั้ง 32 px จริงและสำเนาขยาย nearest-neighbor 64 px เพื่อเห็น pixel boundary
