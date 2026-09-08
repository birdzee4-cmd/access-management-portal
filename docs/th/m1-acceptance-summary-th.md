# สรุปการยอมรับ M1

> เอกสารฉบับนี้เป็นฉบับภาษาไทยสำหรับการอ่านและสื่อสารภายใน โดยเอกสารภาษาอังกฤษต้นฉบับใน repository เป็น source of truth

อ้างอิง: [m1-browser-acceptance.md](../m1-browser-acceptance.md) — สถานะ `PASS`, M1 operational acceptance `COMPLETE` ณ 2026-09-08. เอกสารต้นฉบับ database-backed API acceptance เป็นหลักฐานประกอบที่แยกต่างหาก

## สิ่งที่ M1 ทำได้

M1 เป็น Portal-native Request Engine สำหรับส่งและติดตาม intent การเข้าถึงใน Portal-owned DB. Actor ถูก resolve จาก verified Entra object ID; role catalog ที่ active ถูก snapshot; request, single item และ audit event ถูกสร้างแบบ atomic

รองรับ actions `ADD`, `REMOVE` และ `CHANGE`. คำขอหยุดที่ `SUBMITTED` และ item อยู่ที่ `PENDING`. ระบบมี version `1`, immutable role snapshots, audit และ Idempotency เพื่อให้ replay ของ payload/key เดิมคืนคำขอเดิมโดยไม่สร้าง request หรือ audit ซ้ำ

## สถานะการยอมรับ

- Browser Entra sign-in, catalog, ADD, owned history, audit และ idempotent replay ผ่านบน Azure SQL DEV ที่ได้รับอนุมัติ
- Portal Request Detail ของ synthetic `ADD`, `REMOVE` และ `CHANGE` โหลดผ่าน authenticated owned-detail endpoint โดยแสดงรูปร่าง current/requested role ที่เหมาะสมและสถานะ `SUBMITTED`/`PENDING`
- Back และ Refresh ผ่าน; การเปิด Detail เป็น GET-based และไม่เปลี่ยนจำนวนคำขอ
- เหตุการณ์ catalog/list HTTP 500 ชั่วคราวไม่เหลือเป็น acceptance blocker หลังตรวจวินิจฉัยแบบ read-only และลองใหม่สำเร็จ โดยไม่มี code, config, database หรือ process change
- Validation ที่บันทึกในเอกสารต้นฉบับ: `npm test`, `npm run typecheck`, `npm run build`, `npm run prisma:validate` และ `npm audit --audit-level=moderate` ผ่าน

## Azure SQL DEV และขอบเขต

การยอมรับใช้ Azure SQL DEV ที่ได้รับอนุมัติชัดเจน และใช้ synthetic data ตาม scope ที่อนุมัติ. การยืนยัน browser/API ไม่เท่ากับการอนุมัติหรือการเปิดใช้ Production. รายละเอียดระบุตัวตน, configuration และข้อมูลฐานข้อมูลที่ละเอียดอ่อนอยู่ในเอกสาร canonical และไม่ทำซ้ำในฉบับภาษาไทยนี้

## สิ่งที่ M1 ไม่ทำ

M1 ไม่ทำ Approval, Resolution, governance, Activation, Provisioning, revocation, automation หรือการเปลี่ยน target-system access. ไม่ทำ Legacy/Production read หรือ write, SharePoint, VSTS, Power Automate, migration, seed, Entra configuration change หรือ deployment ระหว่าง browser acceptance. M2 ยังไม่เริ่ม
