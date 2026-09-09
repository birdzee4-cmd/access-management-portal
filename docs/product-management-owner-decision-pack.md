# Product Management Owner Decision Pack

## วัตถุประสงค์และขอบเขต

เอกสาร PM-03D นี้แปลงหลักฐานจาก PM-03A และ
[PM-03C](product-management-policy-closure.md) ให้เป็นคำถามที่ Product Management
Owner, IT Support, System Owner และ Project Manager สามารถตัดสินใจได้ โดยไม่ต้อง
อ่าน source code เอกสารนี้ไม่อนุมัติหรือเปลี่ยนสถานะ PMD ใด ไม่เปลี่ยน schema
registry และไม่เปิด `submissionEnabled` หรือ real adapter

คำศัพท์สถานะต้องตีความแยกกัน: `CONFIRMED` คือข้อเท็จจริงจาก source contract,
`OBSERVED` คือหลักฐานจากตัวอย่าง/ประวัติ, `RESOLVED` คือมีการระบุ mapping แล้ว,
`APPROVED` คือผู้มีอำนาจอนุมัติ scope/version ที่แน่นอน, `ACTIVE` คือเปิดใช้งาน
โดยได้รับอนุญาตแยกต่างหาก และ `PROVISIONED` คือยืนยันผลที่ระบบปลายทางแล้ว
สถานะหนึ่งไม่ทำให้เกิดสถานะถัดไปโดยอัตโนมัติ

## Executive summary

| Decision ID | Business area | Evidence strength | Recommendation available | Owner required | Affected Topics | Risk if unresolved |
| --- | --- | --- | --- | --- | --- | --- |
| PMD-001 | Create Account Add-On transport | Strong source + supporting history | YES | YES | `Create New Account (ลูกค้าใหม่)` | Add-On intent อาจสูญหายหรือถูกส่งผิดที่ |
| PMD-002 | Customer email multiplicity | Strong historical; grammar UNKNOWN | YES | YES | `เพิ่ม Email เข้า Account(ลูกค้า)` | รับ/ปฏิเสธรายการ Email ผิดและแยกผู้รับไม่แน่นอน |
| PMD-005 | Internal Role authority | Strong lookup evidence; authority UNKNOWN | YES | YES | `ขอสิทธิ์เข้า Role(พนักงาน)`, `เพิ่ม App เข้า Role(พนักงาน)` | แสดง Role เกินสิทธิ์หรือไม่ครบ |
| PMD-006 | Matrix lifecycle/failure policy | Strong negative source evidence; policy UNKNOWN | YES | YES | สอง Internal Role Topics | รายการ Role ไม่แน่นอนหรือ fail open |
| PMD-007 | Add App requiredness | Strong source anomaly + supporting history | YES | YES | `เพิ่ม App เข้า Role(พนักงาน)` | ส่งคำขอ Add App ที่ไม่มี App หรือปฏิเสธ legacy-valid input |
| PMD-009 | Add-On overloaded fields | Strong end-to-end source evidence | YES | YES | `เพิ่ม Package Add On(ลูกค้า)` | ความหมายของ Role/Add-On ปะปนใน typed columns |
| PMD-011 | Change Provider mapping | Strong source mapping; no history/downstream confirmation | YES | YES | `เปลี่ยน Provider สำหรับ Account(ลูกค้า)` | Provider ถูกบันทึกเป็น Role อย่างกำกวม |
| PMD-012 | Transfer Owner provider mapping | Strong source + limited history; downstream UNKNOWN | YES | YES | `Tranfer Owner Account(ลูกค้า)` | Provider ถูกส่งหรือรายงานผิดความหมาย |
| PMD-013 | Transfer Owner target email | Input existence CONFIRMED; semantics UNKNOWN | YES | YES | `Tranfer Owner Account(ลูกค้า)` | โอน/แจ้งเตือนผิดบุคคล |
| PMD-015 | Notification typed destination | Strong source mapping; no history | YES | YES | `ขอเปิด/ปิดแจ้งเตือนการเปลี่ยนสิทธิ์ถึง Owner Account` | ค่ามีเพียงข้อความและไม่มี machine contract ที่อนุมัติ |

### การจัดกลุ่มเพื่อจัดลำดับการอนุมัติ

**A. มีหลักฐานแข็งแรงและน่าจะอนุมัติได้โดยตรงเมื่อ owner เลือก business choice:**
PMD-001, PMD-002, PMD-007 และ PMD-009

**B. ต้องกำหนด business/security policy อย่างชัดเจน:** PMD-005, PMD-006 และ
PMD-013

**C. ต้องอาศัย System Owner/downstream knowledge เพิ่มเติม:** PMD-011, PMD-012
และ PMD-015 ทั้งสามข้อมี recommendation ที่ปลอดภัย แต่ห้ามถือว่า legacy
destination ได้รับอนุมัติจนกว่า owner จะยืนยัน

## PMD-001 — ปลายทาง Package Add-On ตอนสร้าง Account

### A. Business question

เมื่อผู้ใช้เลือก Package Add-On ใน `Create New Account (ลูกค้าใหม่)` Portal ควร
เก็บและส่งค่านี้ไปที่ใด หรือควรตัดช่องนี้ออกจาก request contract อย่างชัดเจน?

### B. Why this decision is required

ถ้าไม่มีคำตอบ Portal ไม่สามารถรับ Add-On โดยมั่นใจได้ว่าความต้องการจะไม่สูญหาย
และไม่สามารถสร้าง legacy payload ที่มีความหมายแน่นอนได้

### C. Confirmed technical evidence

- `CONFIRMED`: Canvas เขียนหลายค่าเข้า `PackageHid(Product)` ด้วย delimiter
  `" , "`
- `CONFIRMED`: Product Management SQL insert, derived `Detail` และ VSTS mapping
  ที่ตรวจพบไม่ได้นำ `PackageHid(Product)` ไปใช้
- `UNKNOWN`: ไม่มี authoritative final destination ที่ได้รับอนุมัติ

### D. Historical evidence

`OBSERVED`: Create Account 16 records และ 0/16 มี Package Add-On หรือ
`PackageHid` marker ใน `Detail` หลักฐานนี้ corroborate การขาด transport แต่ไม่
พิสูจน์ว่า Add-On ไม่จำเป็นทางธุรกิจ

### E. Current legacy behavior

ระบบ legacy ดูเหมือนเก็บ selection ไว้ที่ SharePoint field แต่ไม่ส่งต่อผ่าน
`Detail` หรือ SQL/VSTS mapping ที่ตรวจพบ นี่คือพฤติกรรมที่สังเกต ไม่ใช่ policy
ที่ได้รับอนุมัติ

### F. Recommended Portal decision

เก็บ Add-On เป็น typed multi-value field ใน Portal และ block submission ของ Topic
นี้จนกว่า owner จะเลือก approved destination หรือ explicit omission rule

### G. Alternative options

- **ตัด Add-On ออกจาก Create Account:** benefit คือ contract ชัดและไม่มีค่าหาย;
  risk คือผู้ใช้ต้องขอ Add-On แยกภายหลัง; compatibility impact คือไม่ serialize
  `PackageHid(Product)`
- **คง SharePoint-only compatibility:** benefit คือใกล้ legacy ที่สุด; risk คือ
  downstream อาจไม่เห็น intent; compatibility impact คือต้องมี adapter mapping
  และ consumer/operational ownership ที่ระบุชัด

### H. Recommended compatibility rule

- Portal canonical: `packageAddOns: StableAddOnId[]`
- Legacy boundary: serialize ไป `PackageHid(Product)` เฉพาะเมื่อ mapping/version
  ได้รับอนุมัติ ห้ามให้ legacy field name รั่วเข้า Portal domain

### I. Owner response

Owner Decision:
[ ] APPROVE RECOMMENDATION
[ ] APPROVE WITH CHANGE
[ ] REJECT

Change / Comment:
____________________________

### J. Effect if approved

- Topic: `Create New Account (ลูกค้าใหม่)`
- อาจ resolve `UNKNOWN_SUBMISSION_MAPPING` เฉพาะเมื่อระบุ destination/omission
  และ compatibility rule ครบ
- metadata ที่อาจเปลี่ยน: `packageAddOn` submit destination/serialization และ
  Topic `partialReasons`
- Topic จะเป็น `CONFIRMED` ได้ต่อเมื่อไม่มี blocker อื่นและ PM-03B ตรวจครบ

## PMD-002 — รูปแบบรายการ Email ลูกค้า

### A. Business question

Portal ต้องรับ Email เดียวหรือหลาย Email และถ้าหลายค่าจะใช้ canonical grammar,
validation, duplicate และ ordering rule อย่างไร?

### B. Why this decision is required

การคัดลอก free text แบบ legacy ทำให้ API แยกผู้รับอย่างเชื่อถือไม่ได้ ขณะที่บังคับ
`SINGLE` จะปฏิเสธรูปแบบที่เคยใช้งานจริง

### C. Confirmed technical evidence

- `CONFIRMED`: legacy ใช้ `TextInput.Text` เดียวและส่ง raw text ไป
  `Emailลูกค้า(Product)`, SQL `Email_Customer` และ `Detail`
- `CONFIRMED`: ไม่มี `Split`, trim, delimiter validation หรือ full email validation
- `UNKNOWN`: canonical delimiter และ business multiplicity

### D. Historical evidence

`OBSERVED`: 363 records; extract segment ได้ 328; 74 มีอย่างน้อยสอง `@`, 48 มี
comma และ 5 มี semicolon จึงยืนยันว่ามี multiple-email-looking input และ grammar
ไม่สม่ำเสมอ แต่ไม่ถือว่าทุก comma/semicolon เป็น delimiter

### E. Current legacy behavior

legacy ยอมรับข้อความดิบและส่งต่อโดยไม่ normalize จึงรองรับ input ได้กว้างแต่ไม่มี
machine-readable list contract ที่แน่นอน

### F. Recommended Portal decision

ใช้ typed array ของ Email ที่ validate ทีละค่า ส่งผ่าน API เป็น JSON array และ
กำหนด duplicate policy แบบ case-insensitive โดยคงลำดับแรกที่ผู้ใช้ระบุ

### G. Alternative options

- **Email เดียว:** benefit คือเรียบง่าย; risk คือ incompatible กับประวัติหลายค่า;
  compatibility impact คือต้องแยกเป็นหลาย request หรือ reject
- **เก็บ raw text ต่อ:** benefit คือ legacy-compatible สูง; risk คือ ambiguity และ
  validation ต่ำ; compatibility impact น้อยแต่ย้าย legacy ambiguity เข้า domain ใหม่

### H. Recommended compatibility rule

- Portal canonical: `customerEmails: EmailAddress[]`, อย่างน้อยหนึ่งค่า,
  trim รายค่าและห้าม duplicate หลัง normalization
- Legacy boundary: adapter serialize ตาม grammar ที่ owner อนุมัติและ version ไว้;
  ห้าม parser เดาจาก delimiter หลายแบบโดยไม่แจ้ง error

### I. Owner response

Owner Decision:
[ ] APPROVE RECOMMENDATION
[ ] APPROVE WITH CHANGE
[ ] REJECT

Change / Comment:
____________________________

### J. Effect if approved

- Topic: `เพิ่ม Email เข้า Account(ลูกค้า)`
- อาจ resolve `UNKNOWN_MULTIPLICITY` เมื่อกำหนด multiplicity/grammar/validation ครบ
- metadata ที่อาจเปลี่ยน: `customerEmail` canonical type, multiplicity,
  validation และ adapter serialization
- ต้องตรวจ blocker ทั้ง Topic ก่อนเปลี่ยนเป็น `CONFIRMED`

## PMD-005 — Authority ของ Matrix สำหรับ Internal Role

### A. Business question

Matrix เป็นเพียงแหล่ง candidate สำหรับ dropdown หรือเป็น authoritative source
ของ Role ที่ requester มีสิทธิ์ขอ และต้องรักษา Manager-fallback แบบ legacy หรือไม่?

### B. Why this decision is required

ถ้า Portal ถือ candidate list เป็น entitlement/approval authority โดยไม่มี
authorization policy อาจเปิดเผยหรืออนุญาต Role ผิดขอบเขต

### C. Confirmed technical evidence

- `CONFIRMED`: effective forms ใช้ Matrix แยก TH, PH และ VN/MY/ID
- `CONFIRMED`: formula เลือก requester-as-Manager ก่อน มิฉะนั้นใช้ directory
  Manager fallback
- `CONFIRMED`: Matrix ใช้สร้าง dropdown candidate
- `UNKNOWN`: entitlement authority, approval authority และผู้ดูแล Matrix

### D. Historical evidence

`OBSERVED`: Request Role 209 records ใช้ `Role` 124 / `Role Internal` 85;
Add App to Role 409 records ใช้ `Role` 235 / `Role Internal` 174 ยืนยันหลายยุค
ของ label แต่ไม่พิสูจน์ authority

### E. Current legacy behavior

legacy แสดง candidate ตาม Manager comparison/fallback แต่การมองเห็น candidate
ไม่ใช่หลักฐานว่าผู้ใช้ได้รับอนุมัติหรือมี entitlement

### F. Recommended Portal decision

ใช้ Matrix เป็น candidate-discovery source เท่านั้น ให้ Portal API ตรวจ scope จาก
server-derived identity และแยก approval authorization ออกจาก lookup โดยเด็ดขาด

### G. Alternative options

- **Matrix เป็น authoritative entitlement source:** benefit คือ flow สั้น;
  risk สูงหากข้อมูล/ownership ไม่พร้อม; compatibility impact คือต้องมีกระบวนการ
  governance, freshness และ audit ที่ชัดก่อนใช้
- **ไม่ใช้ Matrix:** benefit คือไม่พึ่ง source ที่ authority ไม่ชัด; risk คือไม่มี
  candidate source; compatibility impact คือต้องระบุ authoritative catalog ใหม่

### H. Recommended compatibility rule

- Portal canonical: catalog candidate และ approval authority เป็นคนละ object/state
- Legacy boundary: adapter อ่าน Matrix แบบ allowlisted/minimized เท่านั้น;
  Manager string ห้ามกลายเป็น verified identity หรือ approval โดยอัตโนมัติ

### I. Owner response

Owner Decision:
[ ] APPROVE RECOMMENDATION
[ ] APPROVE WITH CHANGE
[ ] REJECT

Change / Comment:
____________________________

### J. Effect if approved

- Topics: `ขอสิทธิ์เข้า Role(พนักงาน)`, `เพิ่ม App เข้า Role(พนักงาน)`
- ช่วย resolve ส่วน authority ของ `UNKNOWN_LOOKUP_AUTHORITY`
- metadata ที่อาจเปลี่ยน: lookup authority, server-derived context และ failure gate
- PMD-006 และ PMD-007 ที่เกี่ยวข้องยังอาจทำให้ Topics เป็น `PARTIAL`

## PMD-006 — Active, Manager failure, duplicate และ ordering

### A. Business question

Owner ต้องเลือกสี่ sub-decisions: (1) ค่า `Active` ใดเลือกได้ (2) เมื่อ Manager
ว่าง/lookup error ให้ทำอย่างไร (3) duplicate `RoleName` จัดการอย่างไร และ
(4) เรียงลำดับ candidate ด้วย key ใด

### B. Why this decision is required

หากไม่กำหนด ผลลัพธ์อาจเปลี่ยนตาม source order, แสดง inactive Role, รวมคนละ Role
เข้าด้วยกัน หรือ fail open เมื่อ directory/Manager มีปัญหา

### C. Confirmed technical evidence

- `CONFIRMED`: effective formulas ไม่ filter `Active`
- `CONFIRMED`: ไม่มี blank/error guard และไม่มี `Sort`/`Distinct`
- `CONFIRMED`: source มี `RoleName`, `Manager`, `Department`, `Active`
- `UNKNOWN`: lifecycle semantics, stable key และ duplicate identity

### D. Historical evidence

`OBSERVED`: 618 records ในสอง Role Topics แสดง label-era drift แต่ request history
ไม่มี authoritative Matrix lifecycle หรือ duplicate-resolution decision

### E. Current legacy behavior

legacy คืน filter result ตาม source order และไม่ตีความ `Active` ใน effective form
พฤติกรรมนี้ไม่ใช่ approved Portal policy

### F. Recommended Portal decision

1. เลือกเฉพาะ row ที่มี approved active value
2. blank/error Manager ให้ fail closed และแสดง unavailable state
3. duplicate stable key ให้ block; duplicate display name ห้าม merge จน resolve
4. เรียงด้วย stable key ที่ owner อนุมัติ โดยใช้ display name เป็น presentation เท่านั้น

### G. Alternative options

- **Preserve legacy unfiltered/source order:** benefit คือใกล้ legacy; risk คือ
  inactive/ไม่ deterministic; compatibility impact ต่ำแต่ไม่เหมาะเป็น canonical
- **Deduplicate ด้วย display name:** benefit คือรายการสั้น; risk คือรวม Role คนละตัว;
  compatibility impact คือสูญเสีย provenance
- **Manager fallback ไป broad list:** benefit คือ availability; risk สูงและ fail open;
  ไม่แนะนำ

### H. Recommended compatibility rule

- Portal canonical: candidate ต้องมี stable ID, lifecycle eligibility และ provenance;
  unresolved duplicate/Manager context เป็น explicit blocker
- Legacy boundary: map approved `Active` values และ preserve ทุก source row ก่อน
  resolution; adapter ห้าม deduplicate หรือ sort แบบไม่มี versioned rule

### I. Owner response

Owner Decision:
[ ] APPROVE RECOMMENDATION
[ ] APPROVE WITH CHANGE
[ ] REJECT

Active policy: ____________________________
Blank/error Manager: ______________________
Duplicate RoleName: _______________________
Ordering: _________________________________
Change / Comment: _________________________

### J. Effect if approved

- Topics: `ขอสิทธิ์เข้า Role(พนักงาน)`, `เพิ่ม App เข้า Role(พนักงาน)`
- ร่วมกับ PMD-005 อาจ resolve `UNKNOWN_LOOKUP_AUTHORITY`
- metadata ที่อาจเปลี่ยน: `activePolicy`, failure behavior, duplicate policy,
  stable key และ ordering
- `เพิ่ม App เข้า Role(พนักงาน)` ยังมี `LEGACY_REQUIREDNESS_ANOMALY` จนปิด PMD-007

## PMD-007 — App ต้อง REQUIRED หรือไม่

### A. Business question

สำหรับ request ใหม่ของ `เพิ่ม App เข้า Role(พนักงาน)` ต้องเลือก App อย่างน้อยหนึ่ง
รายการหรือไม่?

### B. Why this decision is required

ชื่อ Topic สื่อว่าเพิ่ม App แต่ legacy guard ตรวจเฉพาะ Internal Role การคง optional
อาจสร้าง request ที่ไม่มีสิ่งให้เพิ่ม ขณะที่เปลี่ยนเป็น required โดยไม่อนุมัติอาจ
ปฏิเสธ input ที่ legacy เคยรับ

### C. Confirmed technical evidence

- `CONFIRMED`: submit guards ทั้งห้า form require Internal Role แต่ไม่ require App
- `CONFIRMED`: App control เป็น multi-select และมี App Name/App ID era drift
- `UNKNOWN`: business requiredness สำหรับ Portal ใหม่

### D. Historical evidence

`OBSERVED`: 409 records; App Name label 386 และ App ID label 23; parser-level
missing/blank ภายใต้ App Name shape 28 ซึ่งรวม alternate App ID shapes จึงไม่ใช่
หลักฐานว่า 28 requests ว่างจริง

### E. Current legacy behavior

legacy ดูเหมือนอนุญาต submit โดยไม่ตรวจ App และรองรับชื่อ label ต่างยุค

### F. Recommended Portal decision

กำหนด App เป็น `REQUIRED` และ `MULTIPLE` สำหรับ request ใหม่; legacy empty/ID-only
records เป็น migration/compatibility exceptions ไม่ใช่ canonical default

### G. Alternative options

- **คง optional:** benefit คือ legacy-compatible; risk คือ request ไม่มี actionable
  App; compatibility impact ต่ำ
- **แยก Topic สำหรับ Role-only change:** benefit คือ intent ชัด; risk คือเพิ่ม
  catalog/workflow scope; compatibility impact ต้องมี mapping ใหม่

### H. Recommended compatibility rule

- Portal canonical: `appIds: StableAppId[]` มีอย่างน้อยหนึ่งค่า
- Legacy boundary: adapter serialize display/App ID ตาม approved version และอ่าน
  legacy empty/ID-only เป็น historical exception โดยไม่ทำให้ new validation อ่อนลง

### I. Owner response

Owner Decision:
[ ] APPROVE RECOMMENDATION
[ ] APPROVE WITH CHANGE
[ ] REJECT

App for new Portal requests: [ ] REQUIRED  [ ] OPTIONAL
Change / Comment:
____________________________

### J. Effect if approved

- Topic: `เพิ่ม App เข้า Role(พนักงาน)`
- อาจ resolve `LEGACY_REQUIREDNESS_ANOMALY`
- metadata ที่อาจเปลี่ยน: App requiredness, minimum cardinality และ validation
- Topic ยัง `PARTIAL` จน PMD-005/006 ปิด `UNKNOWN_LOOKUP_AUTHORITY`

## PMD-009 — Role/Add-On ที่ใช้ legacy fields คนละความหมาย

### A. Business question

Portal ควรยอมรับ compatibility mapping Customer Role → `ProductName(Product)`
และ Package Add-On → `AppName(Product)` หรือกำหนด destination ใหม่?

### B. Why this decision is required

ถ้าใช้ชื่อ legacy เป็น domain model ความหมาย Role/Product และ Add-On/App จะปะปน
และผู้ดูแล downstream อาจตีความผิด

### C. Confirmed technical evidence

- `CONFIRMED`: Customer Role เขียน `ProductName(Product)` และ SQL `ProductName`
- `CONFIRMED`: Add-On เขียน `AppName(Product)` และ SQL `AppName`
- `CONFIRMED`: labels และ `Detail` แสดง business meaning ที่แท้จริง
- `UNKNOWN`: การยอมรับ overloaded mapping เป็น future compatibility policy

### D. Historical evidence

`OBSERVED`: 16 records; 15 ใช้ Role Name/Package Add On shape ปัจจุบัน และหนึ่งใช้
Product Name/App Name legacy shape ยืนยันว่าทั้งสอง semantic shapes เคยเกิดจริง

### E. Current legacy behavior

legacy reuse fields ตาม storage ที่มีและอธิบายความหมายผ่าน labels/`Detail`
พฤติกรรมนี้ใช้งานได้เชิง transport แต่ชื่อ typed columns ไม่ตรง business semantics

### F. Recommended Portal decision

ใช้ typed `customerRoleIds` และ `packageAddOnIds` ใน Portal; ทำ overloaded mapping
เฉพาะใน versioned legacy adapter

### G. Alternative options

- **สร้าง typed downstream columns ใหม่:** benefit คือความหมายตรง; risk คือเป็น
  integration/schema project แยกและต้องได้รับอนุญาต; compatibility impact สูง
- **คง overloaded mapping ทุกชั้น:** benefit คือทำเร็ว; risk คือ technical debt และ
  semantic error สูง; ไม่แนะนำ

### H. Recommended compatibility rule

- Portal canonical: Role/Add-On เป็นคนละ typed identities
- Legacy boundary: adapter map Role → `ProductName(Product)` และ Add-On →
  `AppName(Product)` เฉพาะ approved compatibility version พร้อม audit provenance

### I. Owner response

Owner Decision:
[ ] APPROVE RECOMMENDATION
[ ] APPROVE WITH CHANGE
[ ] REJECT

Change / Comment:
____________________________

### J. Effect if approved

- Topic: `เพิ่ม Package Add On(ลูกค้า)`
- อาจ resolve `UNAPPROVED_LEGACY_FIELD_REUSE`
- metadata ที่อาจเปลี่ยน: canonical field identities, legacy destinations,
  serialization version และ compatibility evidence status
- ต้องตรวจว่าไม่มี blocker อื่นก่อนเปลี่ยน Topic เป็น `CONFIRMED`

## PMD-011 — New Provider ผ่าน Role field

### A. Business question

สำหรับ `เปลี่ยน Provider สำหรับ Account(ลูกค้า)` จะอนุมัติให้ legacy adapter ส่ง
New Provider ผ่าน `RoleName(Product)`/SQL `RoleName` หรือกำหนด destination อื่น?

### B. Why this decision is required

Portal ไม่ควรเรียก Provider ว่า Role ใน canonical contract และยังไม่มี downstream
evidence ยืนยันว่า overloaded destination ปลอดภัย

### C. Confirmed technical evidence

- `CONFIRMED`: dropdown New Provider เขียน `RoleName(Product)` และ SQL `RoleName`
- `CONFIRMED`: `Detail`/VSTS แสดงความหมายเป็น New Provider
- `CONFIRMED`: `emailList` เป็น raw-text passthrough
- `UNKNOWN`: approved Provider destination/downstream consumer

### D. Historical evidence

`OBSERVED`: ไม่พบ Change Provider records ใน accessible history การไม่มีตัวอย่าง
ไม่พิสูจน์ว่า Topic ไม่ถูกใช้และห้ามนำไป infer mapping

### E. Current legacy behavior

source contract ดูเหมือน reuse Role field เพื่อ transport Provider แต่ไม่มี
historical corroboration หรือ downstream metadata จาก PM-03C

### F. Recommended Portal decision

ใช้ typed `newProvider` ใน Portal และอนุญาต Provider-to-Role translation เฉพาะใน
legacy adapter หลัง System/Integration Owner ยืนยัน consumer

### G. Alternative options

- **typed downstream destination ใหม่:** benefit คือ semantic ถูกต้อง; risk คือ
  ต้องเปลี่ยน integration ที่ยังไม่ได้รับอนุญาต; compatibility impact สูง
- **ไม่รองรับ Topic จนมี downstream owner:** benefit คือปลอดภัย; risk คือยังต้องใช้
  legacy process; compatibility impact คือ Portal remains blocked

### H. Recommended compatibility rule

- Portal canonical: `newProvider: ProviderCode`, `emailList` แยก typed/raw policy
- Legacy boundary: map `newProvider` → `RoleName(Product)` เฉพาะ approved adapter
  version; ห้าม expose ชื่อ Role field ต่อ API consumer

### I. Owner response

Owner Decision:
[ ] APPROVE RECOMMENDATION
[ ] APPROVE WITH CHANGE
[ ] REJECT

Change / Comment:
____________________________

### J. Effect if approved

- Topic: `เปลี่ยน Provider สำหรับ Account(ลูกค้า)`
- อาจ resolve `UNAPPROVED_LEGACY_FIELD_REUSE` เมื่อ destination/consumer ได้รับยืนยัน
- metadata ที่อาจเปลี่ยน: `newProvider` canonical binding, legacy destination และ
  adapter serialization
- raw `emailList` contract ถูก source-resolved แล้ว แต่ Topic ต้องไม่มี blocker อื่น

## PMD-012 — Provider mapping ใน Transfer Owner

### A. Business question

Transfer Owner จำเป็นต้องเปลี่ยน Provider ด้วยหรือไม่ และถ้าจำเป็นจะอนุมัติ
Provider-to-`RoleName(Product)` compatibility mapping หรือเลือก destination อื่น?

### B. Why this decision is required

Topic name กล่าวถึง ownership แต่ form บังคับ New Provider หากไม่ยืนยัน intent
Portal อาจรวมหรือส่งสอง business actions อย่างผิดความหมาย

### C. Confirmed technical evidence

- `CONFIRMED`: forms ทั้งห้าใช้ New Provider และ reuse `RoleName(Product)`
- `CONFIRMED`: Provider-labelled fragment ถูกส่งผ่าน `Detail` ไป VSTS
- `UNKNOWN`: downstream typed use และเหตุผลทางธุรกิจที่ Transfer Owner ต้องมี Provider

### D. Historical evidence

`OBSERVED`: Transfer Owner 6 records มี New Provider label ครบ 6/6 สนับสนุนว่า
input นี้เกิดขึ้นจริง แต่ไม่อนุมัติ downstream mapping

### E. Current legacy behavior

legacy เก็บ Provider ใน Role field และอธิบายผ่าน `Detail` ระหว่างการขอโอน Owner

### F. Recommended Portal decision

ใช้ `newProvider` เป็น typed field แยกจาก ownership identity และคง Provider-to-Role
translation เฉพาะ adapter หาก owner ยืนยันว่า Provider เป็นส่วนจำเป็นของ action

### G. Alternative options

- **แยก Change Provider เป็นคนละ request:** benefit คือ intent/audit ชัด; risk คือ
  ผู้ใช้ทำสองขั้นตอน; compatibility impact ต้อง orchestration ใหม่ในอนาคต
- **ตัด Provider จาก Transfer Owner:** benefit คือ Topic ตรงชื่อ; risk คือ legacy
  downstream อาจขาดข้อมูล; ต้องให้ System Owner ยืนยันก่อน

### H. Recommended compatibility rule

- Portal canonical: ownership target และ `newProvider` เป็นคนละ fields/actions
- Legacy boundary: Provider → `RoleName(Product)` เฉพาะ approved version; `Detail`
  เป็น display/audit text ไม่ใช่ canonical field

### I. Owner response

Owner Decision:
[ ] APPROVE RECOMMENDATION
[ ] APPROVE WITH CHANGE
[ ] REJECT

Provider required during transfer: [ ] YES  [ ] NO
Change / Comment:
____________________________

### J. Effect if approved

- Topic: `Tranfer Owner Account(ลูกค้า)`
- อาจ resolve Provider portion ของ `UNAPPROVED_LEGACY_FIELD_REUSE`
- metadata ที่อาจเปลี่ยน: provider requiredness, canonical field และ legacy mapping
- `UNKNOWN_TARGET_EMAIL_SEMANTICS` ยังอยู่จน PMD-013 ได้รับอนุมัติ

## PMD-013 — ความหมายของ Email ใน Transfer Owner

### A. Business question

Email ที่บังคับกรอกหมายถึง `new owner`, account contact, notification recipient
หรือ business identity ประเภทอื่น และต้อง validate/authorize อย่างไร?

### B. Why this decision is required

หากชื่อ field ไม่ตรงผู้รับ การโอน ownership หรือ notification อาจเกิดกับคนผิด
และ API ไม่สามารถบังคับ authorization scope ได้

### C. Confirmed technical evidence

- `CONFIRMED`: form มี required free-text Email และ append หลัง `Email : ` ใน
  `Detail`
- `CONFIRMED`: ไม่มี typed destination หรือ exported email validation ที่พบ
- `UNKNOWN`: target-person semantics และ authority

### D. Historical evidence

`OBSERVED`: มี Transfer Owner 6 records แต่ PM-03C ไม่อ่านหรือ infer identity จาก
ค่าจริง จึงไม่มีหลักฐานที่มีอำนาจบอกว่าบุคคลนั้นมี role ใด

### E. Current legacy behavior

legacy ส่งข้อความ Email ผ่าน `Detail` โดย label กว้างกว่าความหมายใน Topic

### F. Recommended Portal decision

ถ้า process คือโอน ownership จริง ให้กำหนดเป็น typed `newOwnerEmail` และตรวจ
directory identity/eligibility ฝั่ง server; ถ้าไม่ใช่ owner ต้องตั้งชื่อ semantic
ใหม่ตาม business identity ที่ owner ระบุ

### G. Alternative options

- **Account contact:** benefit คือรองรับ external contact; risk คือไม่ใช่ owner;
  compatibility impact ต้องเปลี่ยน label/approval logic
- **Notification recipient:** benefit คือไม่อ้าง ownership; risk คือ Topic name
  misleading; compatibility impact ควรแยกจาก transfer action
- **Free-text other identity:** benefit ยืดหยุ่น; risk สูงด้าน authorization/audit;
  ไม่แนะนำ

### H. Recommended compatibility rule

- Portal canonical: typed semantic identity reference; server derives/verifies
  issuer/scope และไม่เชื่อ browser-supplied authority
- Legacy boundary: serialize display Email เข้า `Detail` เท่าที่จำเป็นหลัง approval;
  legacy text ไม่กลายเป็น verified identity

### I. Owner response

Owner Decision:
[ ] APPROVE RECOMMENDATION
[ ] APPROVE WITH CHANGE
[ ] REJECT

Target email means:
[ ] NEW OWNER  [ ] ACCOUNT CONTACT  [ ] NOTIFICATION RECIPIENT
Approved validation/authority rule: ______________________________
Change / Comment: _______________________________________________

### J. Effect if approved

- Topic: `Tranfer Owner Account(ลูกค้า)`
- อาจ resolve `UNKNOWN_TARGET_EMAIL_SEMANTICS`
- metadata ที่อาจเปลี่ยน: field name/type, requiredness, identity validation,
  server-authority rule และ serialization
- Topic ยังต้องปิด PMD-012 ก่อนจึงอาจพิจารณา `CONFIRMED`

## PMD-015 — Typed destination สำหรับ notification setting

### A. Business question

Portal ควรเก็บคำสั่งเปิด/ปิด notification เป็น typed state/action ที่ระบบอ่านได้
หรือยอมรับ `Detail`-only transport แบบ legacy?

### B. Why this decision is required

`Detail` เหมาะกับข้อความแสดงผลแต่ไม่มี machine contract ที่แน่นอนสำหรับการเปิด/ปิด
setting และไม่ระบุ authoritative consumer

### C. Confirmed technical evidence

- `CONFIRMED`: ค่า `เปิด`/`ปิด` ถูกนำเข้า hidden `Detail`
- `CONFIRMED`: SQL/VSTS รับ `Detail`; ไม่พบ dedicated typed field
- `UNKNOWN`: authoritative destination, consumer และ allowed state transition

### D. Historical evidence

`OBSERVED`: ไม่พบ notification-toggle records ใน accessible history การไม่มี
sample ไม่ได้พิสูจน์ว่า Topic ไม่ถูกใช้หรือไม่จำเป็น

### E. Current legacy behavior

legacy ดูเหมือนขนส่ง intent เป็น human-readable `Detail` เท่านั้นจากหลักฐานที่มี

### F. Recommended Portal decision

ใช้ typed `notificationAction` (`ENABLE`/`DISABLE`) และระบุ target setting/consumer
อย่างชัดเจน; `Detail` เป็น display/audit projection เท่านั้น

### G. Alternative options

- **ยอมรับ Detail-only:** benefit คือ legacy-compatible; risk คือ parse เปราะและ
  machine execution ไม่ชัด; compatibility impact ต่ำแต่ technical risk สูง
- **ไม่รองรับ Topic ใน Portal:** benefit คือ fail closed; risk คือผู้ใช้ต้องใช้
  legacy/manual channel; compatibility impact ไม่มีจนกว่าจะมี consumer

### H. Recommended compatibility rule

- Portal canonical: typed action, target Account reference และ explicit current/
  requested state ตาม policy ที่อนุมัติ
- Legacy boundary: render approved localized `Detail` จาก typed value; ห้าม parse
  free text กลับมาเป็น authority หรือ execute อัตโนมัติ

### I. Owner response

Owner Decision:
[ ] APPROVE RECOMMENDATION
[ ] APPROVE WITH CHANGE
[ ] REJECT

Authoritative destination/consumer: ______________________________
Change / Comment: _______________________________________________

### J. Effect if approved

- Topic: `ขอเปิด/ปิดแจ้งเตือนการเปลี่ยนสิทธิ์ถึง Owner Account`
- อาจ resolve `UNKNOWN_SUBMISSION_MAPPING` เมื่อ destination/consumer และ state
  contract ได้รับอนุมัติครบ
- metadata ที่อาจเปลี่ยน: typed field, allowed values, destination, serialization
  และ Topic `partialReasons`
- ห้ามระบุ `CONFIRMED` จน PM-03B ตรวจว่า blocker ทั้งหมดถูกลบจริง

## Owner sign-off summary

ผู้อนุมัติควรกรอก response ในแต่ละ PMD และระบุชื่อบทบาทผู้รับผิดชอบ, วันที่,
contract version และข้อแก้ไขที่ต้องการ การเลือก checkbox ในเอกสารที่ยังไม่ผ่าน
governance ไม่ทำให้เกิด `APPROVED` หรือเปลี่ยน runtime

Workflow ที่กำหนดคือ:

```text
PM-03A
  -> PM-03C Evidence
  -> PM-03D Owner Decision Pack
  -> Owner Approval
  -> PM-03B Apply Decisions
```

หลัง PM-03D สถานะยังคงเป็น `5 CONFIRMED / 8 PARTIAL`, PMD ที่ resolve ใหม่เท่ากับ
0, OPEN เท่ากับ 10, Product Management submission เป็น `DISABLED`, real adapter
เป็น `DISABLED` และ Production integration เป็น `NOT IMPLEMENTED`
