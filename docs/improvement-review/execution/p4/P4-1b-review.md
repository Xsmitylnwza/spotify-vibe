# R-P4-1b — narrow re-review

**Verdict: Accept.** F1/F2 ปิดแล้ว; ไม่พบ regression ใหม่ใน scope ที่ตรวจ

ตรวจ branch `improve/flow-ux`, uncommitted tree วันที่ 2026-10-02 แบบ read-only บน source; เขียนเฉพาะรายงานนี้ ไม่ commit. เป้าหมายคือไม่ให้ scan fault คืน catalog เก่าเป็น healthy และไม่ทิ้ง completed scan เพราะ collect ช้า. การใช้ failure exit/restart ที่มีอยู่กับการย้าย collection ก่อน timeout เป็น correction ที่เล็กพอ ไม่ต้องเพิ่ม recovery protocol

## Evidence

- **F1 closed — source-traced + reproduced with injected production-loop probe.** `C:/letmecook-lab/spotify-vibe/scripts/windows-apps.ps1:145` ส่ง empty/error แล้ว `:146` exit 1 จึงไม่มีรอบถัดไปส่ง catalog เก่า. Node failure guard/retry ที่ `C:/letmecook-lab/spotify-vibe/scripts/windows-apps.mjs:28` และ `:33` ให้ retry เดียวต่อ failed child; handler ที่ `:44` ปฏิเสธ old-child output. Recovery test ที่ `C:/letmecook-lab/spotify-vibe/scripts/tests/windows-apps.test.mjs:99` ยืนยันว่า old output และ new-helper heartbeat ไม่ restore healthy; fresh catalog จึง restore ได้
- **F2 closed — source-traced + reproduced with injected production-loop probe.** `C:/letmecook-lab/spotify-vibe/scripts/windows-apps.ps1:84` collect ก่อน timeout ที่ `:85`; `PollScan()` ที่ `:29` ตรวจ completion และ `:30` ล้าง pending ก่อน return/throw. Result พร้อมตอน collect ที่ 10,100 ms ถูกส่งสำเร็จโดยไม่มี error; unfinished scan ที่เวลาเดียวกันยังส่ง empty/error และ exit 1
- **Normal slow scans / restart / focus — source-traced + adapter coverage.** Pending scan อายุต่ำกว่า 10 s ไม่เข้า timeout (`C:/letmecook-lab/spotify-vibe/scripts/windows-apps.ps1:85`); collection ที่สำเร็จไม่เข้า failure exit. Scan scheduling (`:78`), foreground reads (`:76`, `:133`), change emission (`:136`), heartbeat (`:140`) และ 200 ms sampling (`:148`) ไม่เปลี่ยนจาก implementation ที่ review แล้ว. Tests ที่ `C:/letmecook-lab/spotify-vibe/scripts/tests/windows-apps.test.mjs:47`, `:62`, `:77`, `:88`, `:99` ผ่าน liveness, single retry, recovery และ independent foreground updates; ไม่พบ restart loop ที่เกิดจาก fix นี้

## Reviewer validation

รันแต่ละ command อย่างละครั้ง:

| Command | Observed result |
|---|---|
| `node --test C:/letmecook-lab/spotify-vibe/docs/improvement-review/execution/p4/probes/scan-boundary-probe.mjs` | 3 passed, 0 failed, 0 skipped; exit 0 |
| `node --test C:/letmecook-lab/spotify-vibe/scripts/tests/windows-apps.test.mjs C:/letmecook-lab/spotify-vibe/scripts/tests/app-presence.test.mjs C:/letmecook-lab/spotify-vibe/scripts/tests/studio-apps.test.mjs C:/letmecook-lab/spotify-vibe/scripts/tests/studio-boundary.test.mjs` | 32 passed, 0 failed, 0 skipped; exit 0 |
| `npm test` (cwd `C:/letmecook-lab/spotify-vibe`) | 123 passed, 0 failed, 0 skipped; exit 0 |

**Limits:** Probe รัน production PowerShell loop โดย inject scanner/clock/foreground/sleep; ไม่ได้วัด native scan timing, C# scheduling ภายใต้ heavy load หรือ real Discord. Completed probe models readiness ตอน collect ไม่ได้วัด native completion ที่ 9,950 ms; completion safety ของ native task มาจาก source trace. Unfinished scans เกิน 10 s และ persistent actual faults ยัง restart ตาม policy เดิม. ไม่ rerun footprint/latency captures; ไม่เปิด Electron/Studio หรือ real detector/RPC
