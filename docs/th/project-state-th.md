# สถานะโครงการ

> เอกสารฉบับนี้เป็นฉบับภาษาไทยสำหรับการอ่านและสื่อสารภายใน โดยเอกสารภาษาอังกฤษต้นฉบับใน repository เป็น source of truth

อ้างอิง: [project-state.md](../project-state.md) — สถานะ ณ 2026-09-08

## วัตถุประสงค์ปัจจุบัน

โครงการคือ Access Management Portal ศูนย์กลางสำหรับพนักงาน โดย Legacy ยังคงเป็น system of record ส่วน Portal รองรับการส่งคำขอเข้าถึงด้วยตนเองแล้ว แต่ยังไม่มี approval หรือ execution engine. VSTS เป็น provisioning pilot ที่วางแผนไว้ลำดับแรกเท่านั้น

โครงสร้างหลักใช้ React/TypeScript/Vite Web, Azure Functions v4 TypeScript API, contracts และ shared safety policy, read-only connectors และ Prisma สำหรับ Portal-owned DB ที่แยกขอบเขตจาก Legacy SQL

## สิ่งที่พัฒนาแล้ว

- การยืนยันตัวตนด้วย MSAL และ Entra JWT validation ที่ API; บทบาท `Admin`, `Approver`, `Viewer` โดย API authorization เป็นแหล่งตัดสินสิทธิ์หลัก
- authenticated shell, health endpoint ที่ไม่มี external I/O, `/api/auth/me` และ Admin test endpoint
- Admin-only legacy matrix และ Access Catalog view แบบลดข้อมูลส่วนบุคคล รวมถึง legacy request list/detail แบบ read-only ที่มีขอบเขตการอ่านและการกรองที่กำหนดไว้
- M1: การส่งคำขอ ADD/REMOVE/CHANGE, รายการและรายละเอียดคำขอของผู้ส่ง, catalog snapshot ที่ไม่เปลี่ยน, version `1`, atomic audit และ Idempotency
- M1 operational acceptance เสร็จสมบูรณ์แล้ว: การยืนยันผ่าน browser และ database-backed API บน Azure SQL DEV ที่ได้รับอนุมัติไว้ผ่านตามขอบเขตที่ระบุในเอกสารต้นฉบับ

## สิ่งที่เป็น design-only หรือยังไม่ทำ

- SharePoint/VSTS API ยังไม่เชื่อมต่อ; VSTS observations ที่มีอยู่มาจาก SQL backup data
- approval execution, Resolution persistence/governance/Activation, Provisioning, reconciliation และ JML เป็นงานอนาคต
- 07N/07O เป็น historical analysis ที่มีขอบเขตและไม่ถูก register ใน runtime/API/UI
- 07P เป็น synthetic, memory-only draft UI; 07Q เป็น design contracts/helpers เท่านั้น ไม่มี Prisma change, persistence, write endpoint, audit emission หรือ UI wiring

## สถานะความปลอดภัย

Legacy Production เป็น `READ ONLY`; integration mode คือ `READ_ONLY` และ flag การเขียน, Provisioning, revocation และ automation เป็น `false` ทั้งหมด. Portal-owned DB เป็นขอบเขตแยกต่างหาก ไม่ใช่สิทธิ์ให้แก้ไข Legacy. การอ่าน Production ต้องมี source/projection/limit/output scope ที่อนุมัติชัดเจน และงานเอกสารไม่อนุญาตให้ refresh ข้อมูล Production

## สถานะต้องแยกจากกัน

`OBSERVED` คือหลักฐานจากแหล่งข้อมูล, `RESOLVED` คือการตีความหรือ mapping ที่ชัดเจน, `APPROVED` คือการอนุมัติ exact scope/decision/version, `ACTIVE` คือการ Activate configuration ที่อนุมัติแยกต่างหาก และ `PROVISIONED` คือผลการเข้าถึง target ที่ได้รับการตรวจสอบหลัง execution ที่อนุมัติแยกต่างหาก. ไม่มีสถานะใดสื่อถึงสถานะถัดไปโดยอัตโนมัติ

## POLICY REQUIRED ที่ยังไม่ปิด

ยังต้องมีนโยบาย/การตัดสินใจที่ชัดเจนสำหรับ: การขอแทนบุคคลอื่น; การตรวจสอบ current target access และ inactive historical roles สำหรับ REMOVE/CHANGE; catalog ownership/applicability; ความหมายของ source/department/context และ stable keys; collisions/duplicates และความครบถ้วนของหลักฐาน; อำนาจ Manager และ identity/group ที่มีสิทธิ์; ANY/ALL/SEQUENTIAL และลำดับ; ownership, reviewer scope, self-approval/separation, delegation/escalation; อำนาจ governance/Activation; material drift และ old active-version; retention/privacy/reasons, exceptional deletion/backups; รวมถึง idempotency/replay windows/recovery

อย่าใช้ observations เพื่อตัดสิน policy และอย่าเริ่ม M2 โดยอัตโนมัติ
