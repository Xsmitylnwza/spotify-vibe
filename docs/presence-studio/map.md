---
title: ออกแบบ Automatic Character Presence ที่ใช้ได้ทุกวัน
labels: [wayfinder:map]
status: open
---

## Destination

ได้แนวทางปรับ Spotify Vibe ให้เจ้าของจับคู่แอปกับการ์ด Presence แล้วสลับตามการใช้งานจริง พร้อม GIF หน้าพิกเซลที่ทำเอง และหน้า public ที่โชว์รสนิยมกับสิ่งที่เจ้าของสร้าง

## Notes

เพิ่มตามคำขอเจ้าของ: [Studio Experience & Motion Spec](STUDIO-EXPERIENCE-SPEC.md) กำหนดความลื่น สีสัน interaction น่ารัก รายละเอียด feedback และเกณฑ์รับงาน UX เป็นส่วนในรุ่นแรก ยังไม่ล็อก visual mockup หรือสร้าง UI ในรอบนี้

เริ่มอ่านที่ [Final Plan Draft](FINAL-PLAN-DRAFT.md) และ [ผลตรวจช่องว่าง](PLAN-AUDIT.md) ซึ่งรวมคำชี้นำล่าสุดแล้ว เอกสารเก่าใช้เป็นหลักฐานการตรวจ ไม่ใช่ข้อยุติเมื่อขัดกับร่างรวม

ยืนยันระหว่าง audit: รุ่นแรกจับคู่ตามโปรแกรมเท่านั้น ไม่แยกเว็บไซต์ใน browser; คำถามที่ pending คือ foreground เทียบกับลำดับความสำคัญเมื่อเปิดหลายโปรแกรม

ภาพที่ใช้ทำต่อคือ [คนชิบิแบบ 8-bit เปลี่ยนอารมณ์และชุด](human-chibi-direction.md); เลิกใช้ร่างมาสคอตสีเขียวเป็น visual direction

คำชี้นำล่าสุดอยู่ใน [App Mapping และพื้นที่โชว์ตัวตน](app-mapping-and-personal-space.md): เจ้าของกำหนด app → card เอง; หน้า public เน้นตัวเจ้าของและงาน ยกเลิกแกน lore/ประวัติของมาสคอตที่เคยเสนอ

ใช้ local Markdown tracker ในโฟลเดอร์นี้; ยังอยู่ระหว่างสนทนา ไม่ถือข้อเสนอเป็นคำตอบของผู้ใช้ อ่าน [ผลตรวจและข้อเสนอ](experience-review.md) และ [พื้นที่แสดงผลและโลกของตัวละคร](discord-surface-research.md) เพื่อแยก source ที่ยืนยันแล้วจากแนวทางทดลอง ใช้ wayfinder, grilling และ domain-modeling ต่อเมื่อทำแต่ละการตัดสินใจ

รายการลูกค้นจากไฟล์ decision-*.md โดย parent=map.md; frontier คือ status=open, assignee=null และ blocked_by ว่างหรือปิดครบทั้งหมด ความสัมพันธ์ blocking ใช้ frontmatter เนื่องจาก tracker นี้ไม่มี native dependencies

## Decisions so far

ยังไม่มี ticket ที่ปิดผ่านการสนทนา

## Not yet specified

ระดับการปรับแต่งรายแอป, ข้อยกเว้นเมื่อเปิดหลายแอป, รูปแบบภาพ, แหล่งจัดเก็บ artwork, รูปแบบพื้นที่ตัวตนบนเว็บและการเลือกเนื้อหา, แผน migration โดยละเอียด

## Out of scope

การแก้โค้ดหรือเผยแพร่ในรอบออกแบบนี้; การเปลี่ยน avatar/banner โดยอัตโนมัติ; การสร้างพื้นที่แสดงผลอิสระนอกข้อจำกัด Discord
