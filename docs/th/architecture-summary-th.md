# สรุปสถาปัตยกรรม

> เอกสารฉบับนี้เป็นฉบับภาษาไทยสำหรับการอ่านและสื่อสารภายใน โดยเอกสารภาษาอังกฤษต้นฉบับใน repository เป็น source of truth

อ้างอิง: [architecture.md](../architecture.md)

## ภาพรวม

Access Management Portal ใหม่เป็นคนละ architecture domain กับ CURRENT PRODUCTION SYSTEM ซึ่งยังคงไม่เปลี่ยนแปลงและเป็น system of record. เส้นทางหลักคือ:

```text
Employee browser
  -> React web application
  -> Azure Functions API
  -> Portal-owned Azure SQL database

Azure Functions API
  -> Read-only connector boundary
     -> Existing SQL Server (guarded Admin reads)
     -> SharePoint (future)
     -> Azure DevOps / VSTS (future)
```

## Authentication และชั้นงาน

Microsoft Entra ID ยืนยันตัวตนที่ Web และ API. Web ใช้ MSAL สำหรับ redirect login/logout และ silent API token; API ตรวจ JWT signature, issuer/tenant/audience, lifetime, claims, scope และ roles ด้วยตนเอง. UI role visibility ช่วยประสบการณ์ใช้งานเท่านั้น — API authorization เป็น authoritative เสมอ

- `apps/web`: React SPA, routing และ authenticated UI
- `apps/api`: Azure Functions API; health endpoint ไม่มีการพึ่งพา auth/database/cloud/Legacy
- `packages/contracts`: transport types ที่ไม่ผูกกับ framework
- `packages/shared`: safety configuration แบบ fail-closed; ยอมรับเฉพาะ `READ_ONLY` และ capability flags เป็น `false`
- `packages/connectors`: legacy read operations เท่านั้น; ไม่มี create/update/delete/provision/revoke/automation methods
- `database`: Prisma สำหรับ Portal-owned DB ที่แยกจาก Legacy SQL โดยสิ้นเชิง

## Legacy read-only integration

Legacy SQL reads ถูกจำกัดด้วย SELECT-only guard, fixed identifiers/projections, parameters, bounded reads และ sanitized errors. Admin authorization ต้องผ่านก่อนสร้าง connector; SharePoint และ VSTS API clients ยังไม่เชื่อมต่อ. Legacy data ไม่ผ่าน Prisma repositories และ Portal DB ไม่ใช่สิทธิ์ให้ migrate หรือแก้ไข Legacy

## แยก Request, Approval และ Provisioning

M1 มีเส้นทาง Portal request ที่ยืนยัน actor จาก Entra object ID, snapshot active Portal catalog roles และสร้าง request/item/audit event แบบ atomic สำหรับ ADD/REMOVE/CHANGE. กระบวนการหยุดที่ `SUBMITTED`; ไม่เข้าสู่ Approval หรือ `AutomationJob` และไม่เรียก Legacy connector หรือ execution component

Approval, Resolution, governance, Activation และ Provisioning เป็นคนละการดำเนินการ. approval rule/model หรือ Legacy mapping ไม่ทำให้เกิด import, approval engine, connector activation หรือ production write โดยอัตโนมัติ

## สถานะหลักฐานและอำนาจ

| สถานะ | ความหมาย |
| --- | --- |
| `OBSERVED` | หลักฐานจากแหล่งข้อมูลตาม sample ที่ระบุ ไม่ใช่ entitlement หรือ authority |
| `RESOLVED` | การตีความหรือ mapping อย่างชัดเจน |
| `APPROVED` | การอนุมัติ exact scope/decision/version; ต่างจาก configuration governance หรือ employee access approval ตามบริบท |
| `ACTIVE` | การ Activate configuration ที่ได้รับอนุมัติแยก ไม่ใช่ Legacy Active |
| `PROVISIONED` | ผล target access ที่ยืนยันแล้วหลัง execution ที่ได้รับอนุมัติแยก |

`OBSERVED != RESOLVED != APPROVED != ACTIVE != PROVISIONED`: ไม่มีสถานะใดอนุมานสถานะถัดไปได้. Legacy `Active`, Manager strings, source names หรือ VSTS work-item closure ไม่ใช่หลักฐานของ authority, approval หรือ Provisioning
