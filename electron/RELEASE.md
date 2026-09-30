# ปล่อยเวอร์ชันใหม่ของ Vibe Studio (desktop app)

แอปเดสก์ท็อปเช็คเวอร์ชันใหม่จาก **GitHub Releases** ของ `Xsmitylnwza/spotify-vibe`
เอง — เปิดแอปแล้วรอ ~20 วินาที หรือทุก 6 ชั่วโมง ถ้ามีเวอร์ชันใหม่กว่า
แบนเนอร์จะขึ้นใน Studio พร้อมปุ่ม **อัปเดตเลย**

## ก่อนปล่อยครั้งแรก (checklist)

1. **push โค้ดขึ้น GitHub ก่อน** — ตอนนี้ branch `redesign/soft-minimal`
   ยังอยู่แค่ในเครื่อง ถ้าไม่ push ระบบอัปเดตจะไม่มีอะไรให้ดึง
   (แอปจะไม่ error — มันแค่เงียบๆ บอกว่าไม่มีอัปเดต)
2. ตัดสินใจเรื่อง **code signing**:
   - **Windows**: ไม่มีใบรับรอง แอปจะโดน SmartScreen เตือนตอนติดตั้ง
     (กด "run anyway" ได้) ถ้าอยากให้เนียนต้องซื้อ code-signing certificate
   - **macOS**: ไม่มี signing/notarization ผู้ใช้ต้องคลิกขวา → Open
     ครั้งแรก ถ้าอยากให้เนียนต้องมี Apple Developer account ($99/ปี)

## ขั้นตอนปล่อยเวอร์ชัน

```bash
# 1. bump version (เช่น 1.0.0 → 1.1.0)
npm version minor --no-git-tag-version   # หรือแก้ package.json เอง

# 2. build installers
npm run dist:win   # ได้ dist/Vibe Studio Setup 1.1.0.exe (+ latest.yml)
npm run dist:mac   # ต้องรันบน macOS ถึงจะได้ .dmg; บน Linux ได้แค่ .zip

# 3. สร้าง GitHub Release
#    - Tag: v1.1.0  (ต้องตรงกับ version ใน package.json)
#    - อัปโหลดไฟล์จาก dist/ "ทุกไฟล์" โดยเฉพาะ:
#        *.exe / *.dmg / *.zip
#        latest.yml / latest-mac.yml   ← สำคัญ! updater อ่านไฟล์นี้
#    - กด Publish release
```

ภายใน ~6 ชั่วโมง (หรือรีสตาร์ทแอป) ผู้ใช้จะเห็นแบนเนอร์
"มีเวอร์ชันใหม่ของ Vibe Studio แล้ว" → กด **อัปเดตเลย** → โหลดเสร็จ
แบนเนอร์เปลี่ยนเป็น **รีสตาร์ทเลย** → แอปติดตั้งเวอร์ชันใหม่เอง

## หมายเหตุ

- `autoDownload = false` — แอปไม่โหลดเองเงียบๆ ผู้ใช้กดปุ่มเท่านั้น
  (ประหยัดเน็ต ตรงนิสัย set-and-forget)
- ถ้า GitHub ล่ม / ยังไม่มี release แอปจะไม่โชว์ error ใดๆ
- `npm run dev` = รัน Electron แบบ dev · `npm start` = รัน server
  เพียวๆ เปิดในเบราว์เซอร์เหมือนเดิม (ไม่มี tray/updater)
- ไฟล์ที่ updater ต้องการต่อ release: `latest.yml` (win),
  `latest-mac.yml` (mac) — electron-builder สร้างให้อัตโนมัติตอน build
