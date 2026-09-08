# ขอบเขตความปลอดภัย Production

> เอกสารฉบับนี้เป็นฉบับภาษาไทยสำหรับการอ่านและสื่อสารภายใน โดยเอกสารภาษาอังกฤษต้นฉบับใน repository เป็น source of truth

อ้างอิง: [production-safety-boundary.md](../production-safety-boundary.md) ซึ่งเป็น authoritative detailed safety reference

## หลักการบังคับใช้

Legacy Production — Power Apps, SharePoint, Power Automate, SQL Server และ VSTS — เป็น system of record และเป็น `READ ONLY` เว้นแต่ future task จะอนุมัติ scoped exception อย่างชัดเจน. Portal-owned DB เป็นขอบเขตฐานข้อมูลแยกต่างหาก ไม่ให้สิทธิ์ migrate หรือแก้ไข Legacy SQL

ค่า default controls ต้องคงเดิม: `LEGACY_INTEGRATION_MODE=READ_ONLY` และ `ENABLE_SHAREPOINT_WRITE`, `ENABLE_LEGACY_SQL_WRITE`, `ENABLE_VSTS_WRITE`, `ENABLE_ACCESS_PROVISIONING`, `ENABLE_ACCESS_REVOCATION`, `ENABLE_AUTOMATION` เป็น `false`. ห้ามเปลี่ยน guards หรือ safety flags หากไม่มีการ review ที่ได้รับอนุมัติอย่างชัดเจน

## สิ่งที่ห้ามโดย default

- Legacy SQL DML/DDL, schema change หรือ migration
- SharePoint item/list write
- VSTS work-item create/close, membership, permission, repository หรือ pipeline change
- Power Automate editing, triggering, enabling หรือ disabling
- Provisioning, revocation และ automation
- Power Apps, Entra configuration, cloud resource change และ deployment
- Portal DB write, migration, `db push`, seed และ import หากไม่มี explicit scope และ verified target

Roadmap หรือ milestone description ไม่ใช่การอนุมัติ execution. Production read ต้องมี explicit source/projection/limit/output scope; ห้ามใช้ configured read API หรือ refresh Production เพื่อจัดทำเอกสาร

## การจัดการข้อมูลและ secrets

ห้าม print, stage, commit หรือ export secrets, tokens, Authorization headers, credentials, connection strings, certificates/PATs, real tenant/client/user identifiers, production personal data, raw Manager values หรือ raw production rows. ใช้ ignored local configuration, committed placeholders และ synthetic fixtures เท่านั้น; อย่าตรวจ secret files เพียงเพื่อ refresh เอกสาร

API ต้องยืนยัน JWT และไม่เชื่อ actor/role ที่ browser ส่งมา. Portal roles ไม่ให้ Legacy permissions. SPA ไม่ควรเก็บ token ใน application state/logs/localStorage

## เงื่อนไขการอนุมัติแบบชัดเจน

Portal DB operation, Production read และข้อยกเว้น write ทุกกรณีต้องได้รับ explicit approval ตาม scope. ข้อยกเว้น write ในอนาคตต้องมี target/action scope ที่ review แล้ว, least privilege, audit, verification, recovery และ stop conditions ก่อนดำเนินการ. การเปลี่ยน environment variable อย่างเดียวไม่ใช่ authorization

สำหรับ M1 การเขียนที่มีอยู่จำกัดเฉพาะ Portal-owned request writes ภายใต้ explicit Portal database ownership guard; บันทึก intent/audit แล้วหยุดที่ `SUBMITTED` โดยไม่เรียก Legacy connector หรือ execution component

## หลักฐานไม่ใช่อำนาจ

ต้องแยก `OBSERVED`, `RESOLVED`, `APPROVED`, `ACTIVE` และ `PROVISIONED` ออกจากกันเสมอ. Manager strings, source labels, SharePoint `StatusVSTS`, VSTS `State`, approval fields, timestamps หรือ work-item closure ไม่พิสูจน์ identity, authority, approval หรือ Provisioned access
