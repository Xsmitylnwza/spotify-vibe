---
title: กำหนดกิจกรรมที่ Auto ต้องจับได้และวิธีอยู่ร่วมกับเกม
parent: map.md
labels: [wayfinder:grilling]
status: open
assignee: codex-current-session
blocked_by: []
---

## Question

กิจกรรมและแอปใดต้องจับได้ในรุ่นแรก และเมื่อเกมมี Presence ของตัวเองควรให้เกมแสดงหรือใช้ตัวละคร? แนะนำเริ่ม foreground app + idle/lock + schedule fallback พร้อมตัวเลือกปล่อยเกมแสดงเอง การเลือกจริงต้องอิงแอปที่ใช้และผลที่ผู้ดูเห็น

## Discussion

ผู้ใช้ยืนยันระหว่าง audit: รุ่นแรกแยกตามโปรแกรม เช่น Chrome / VS Code / เกม ไม่แยกเว็บไซต์

ยังรอคำตอบ foreground app เทียบกับ priority ระหว่างโปรแกรมที่เปิดอยู่; ร่างรวมแนะนำ foreground ที่นิ่งต่อเนื่อง และไม่ใช้ idle ของเมาส์อย่างเดียวเป็นข้อพิสูจน์ Away

อ่าน [Final Plan Draft](FINAL-PLAN-DRAFT.md) และ [ผลตรวจช่องว่าง](PLAN-AUDIT.md) สำหรับ source และสถานการณ์รับงาน ยังไม่ปิด ticket เพราะกติกาหลายโปรแกรมและการอยู่ร่วมกับ game Presence ไม่ได้สรุปครบ
