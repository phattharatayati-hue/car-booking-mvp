# ระบบจองรถเช่า (Car Booking MVP) — เอกสารส่งมอบฉบับรวม

เอกสารนี้รวมเอกสารทั้งหมดของโปรเจกต์ไว้ในไฟล์เดียว เพื่อให้ผู้รับช่วงอ่านจากที่เดียวได้ครบ
รวมเมื่อวันที่ 17 ต.ค. 2569 จากไฟล์ .md เดิม 12 ไฟล์ (ไม่ตัดเนื้อหา ยกเว้นลดระดับหัวข้อลงหนึ่งระดับและเปลี่ยนชื่อไฟล์ที่อ้างถึงเป็น "ภาคที่ N")

**อ่านอย่างไร:** ถ้าจะรับช่วงดูแลระบบ ให้อ่านภาคที่ 1–3 ก่อน แล้วค่อยเปิดภาคอื่นเมื่อต้องใช้
ภาคที่ 10–11 และ 13 เป็นประวัติการตรวจและการแก้ไข ไม่จำเป็นต้องอ่านทั้งหมด

**ไม่ได้รวมไว้ในไฟล์นี้:** `AGENTS.md` และ `CLAUDE.md` (ตั้งค่าเครื่องมือเขียนโค้ด ไม่ใช่เอกสารของระบบ)
และ `NOTES-local-db.md` (บันทึกปัญหาฐานข้อมูลในเครื่องของผู้พัฒนา ไม่เกี่ยวกับระบบนี้)

<a id="toc"></a>

## สารบัญ

1. [ภาคที่ 1 — ภาพรวมและการติดตั้ง](#part-1) — เริ่มที่นี่: ระบบทำอะไร ใช้เทคโนโลยีอะไร ติดตั้งและรันอย่างไร
2. [ภาคที่ 2 — เอกสารโปรเจกต์หลัก](#part-2) — สถาปัตยกรรม ฐานข้อมูล กฎธุรกิจ ตัวแปรสภาพแวดล้อม วิธี deploy ข้อจำกัด และรายการที่ยังค้าง
3. [ภาคที่ 3 — ส่งออกข้อมูลและการเปลี่ยนมาใช้ Vercel Hobby](#part-3) — หน้า /admin/export ที่ใช้ส่งออกข้อมูลตอนส่งมอบ และข้อจำกัดของแผน Hobby
4. [ภาคที่ 4 — แผนย้าย LINE OA (ทฤษฎี)](#part-4) — ขั้นตอนทั่วไปในการย้าย LINE OA ไปตัวจริง
5. [ภาคที่ 5 — แผนย้าย LINE ไปบัญชีของบริษัท](#part-5) — กรณีย้าย Provider/Channel ไปอยู่ใต้บัญชีบริษัทผู้ว่าจ้าง
6. [ภาคที่ 6 — แผนย้ายมาใช้ LINE OA ตัวจริง](#part-6) — เช็กลิสต์ขึ้นระบบจริงกับ OA ของบริษัท
7. [ภาคที่ 7 — เชื่อมปฏิทิน Google](#part-7) — การตั้งค่าและแก้ปัญหาการเชื่อมปฏิทิน
8. [ภาคที่ 8 — เชื่อมระบบกับเพจ Facebook](#part-8) — ผลการศึกษาและข้อสรุป
9. [ภาคที่ 9 — โทนสีแบรนด์](#part-9) — ค่าสีที่บริษัทส่งมาและตาราง contrast
10. [ภาคที่ 10 — ผลตรวจ UX/UI รอบแรก](#part-10) — บันทึกการตรวจหน้าจอทั้งระบบ (ประวัติ)
11. [ภาคที่ 11 — ผลตรวจ UX/UI รอบสอง](#part-11) — ผลตรวจรอบสองและสิ่งที่แก้แล้ว (ประวัติ)
12. [ภาคที่ 12 — รายการคลิปสอนใช้งาน](#part-12) — รายชื่อคลิปในโฟลเดอร์ คลิปสอนใช้งาน
13. [ภาคที่ 13 — บันทึกการเปลี่ยนแปลง](#part-13) — ประวัติการแก้ไขเรียงจากใหม่ไปเก่า

---

<a id="part-1"></a>

## ภาคที่ 1 — ภาพรวมและการติดตั้ง

_ที่มา: `README.md` (รวมเข้าเอกสารนี้แล้ว)_

Next.js + Prisma + Neon Postgres + Auth.js + Vercel Blob

### สิ่งที่มีในรอบนี้

- หน้าบ้าน: เลือกรถ, จองวันที่, กรอกข้อมูลลูกค้า, อัปโหลดสลิปมัดจำ, ดูสถานะการจอง
- หลังบ้าน (ต้อง login): แดชบอร์ด, จัดการรถ, ตรวจสอบ/ยืนยัน/ปฏิเสธสลิปมัดจำ
- ยังไม่มี: LINE OA, Bank API/OCR อัตโนมัติ, ระบบแจ้งเตือน (เป็นเฟสถัดไป)

### ตั้งค่าครั้งแรก (ทำในเครื่องตัวเอง)

1. ติดตั้ง [Vercel CLI](https://vercel.com/docs/cli): `npm i -g vercel`
2. ที่โฟลเดอร์โปรเจกต์ รัน `vercel link` แล้วเลือกโปรเจกต์ `car-booking-mvp`
3. ดึง environment variables จาก Vercel ลงมาเป็น `.env.local`: `vercel env pull .env.local`
4. สร้างค่า `AUTH_SECRET` แล้วใส่ในไฟล์ `.env.local`: `npx auth secret` (คำสั่งนี้จะเพิ่มให้อัตโนมัติ)
5. ติดตั้ง dependencies: `npm install`
6. สร้างตารางในฐานข้อมูล Neon: `npm run db:push`
7. สร้างบัญชีแอดมินคนแรก (แก้ไอเมล/รหัสผ่านใน `.env.local` ก่อนได้ตามต้องการ): `npm run db:seed`
8. รันดูในเครื่อง: `npm run dev` แล้วเปิด http://localhost:3000 (หน้าบ้าน) และ http://localhost:3000/login (หลังบ้าน)

### Deploy ขึ้น Vercel

โปรเจกต์เชื่อมกับ Vercel ไว้แล้ว ทุกครั้งที่ push โค้ดขึ้น branch `main` จะ deploy ให้อัตโนมัติ

ก่อน deploy ครั้งแรกให้จริง ต้องตั้งค่า Environment Variable `AUTH_SECRET` ในหน้า Vercel Dashboard → Settings → Environment Variables ด้วย (ค่าเดียวกับที่ใช้ตอนรันในเครื่อง หรือสร้างใหม่ก็ได้)

หลัง deploy แล้วต้องรัน `npm run db:push` และ `npm run db:seed` อีกครั้งจากเครื่องตัวเอง (ชี้ไปที่ฐานข้อมูล Neon เดียวกัน) เพื่อสร้างตารางและบัญชีแอดมินบนฐานข้อมูลจริง

[↑ กลับสารบัญ](#toc)

---

<a id="part-2"></a>

## ภาคที่ 2 — เอกสารโปรเจกต์หลัก

_ที่มา: `PROJECT.md` (รวมเข้าเอกสารนี้แล้ว)_

เอกสารสรุปโปรเจกต์ — เว็บจองรถเช่าเชียงใหม่ พร้อมหลังบ้านและ LINE OA deploy บน Vercel

> **สถานะ:** ใช้งานได้จริงทั้ง 3 ช่องทาง — เว็บ, LIFF ในแอป LINE, และแชท LINE
> จองรถ → ชำระค่าจอง → ส่งเอกสาร → แอดมินตรวจ → ยืนยัน ครบวงจร
> จองรถ → ค่าจอง → เอกสาร → รับรถ → คืนรถ → คืนเงินประกัน → ใบเสร็จ ครบวงจร
> **ยังไม่ทำ:** Bank API เช็คยอดอัตโนมัติ, OCR อ่านสลิป, VAT ในใบเสร็จ

---

### 1. ภาพรวม

**ฝั่งลูกค้า**

| หน้า | ทำอะไร |
|---|---|
| `/` | หน้าแรก รถแนะนำ แถบโปรโมท LINE |
| `/cars` | รถทั้งหมด กรองยี่ห้อ เรียงราคา แสดงว่าง/ไม่ว่างวันนี้ |
| `/cars/[id]/book` | จองรถ — ปฏิทินวันว่าง เลือกเวลา จุดรับ-ส่ง กรอกข้อมูล |
| `/booking/[id]` | สถานะการจอง อัปโหลดสลิปค่าจอง ส่งเอกสาร เลือกจุดรับ-ส่ง |
| `/booking/[id]/refund` | ลูกค้าแจ้งพร้อมเพย์/บัญชีรับเงินประกันคืน + ติ๊กว่ารีวิวแล้ว |
| `/receipt/[token]` | หน้าใบเสร็จสำหรับลูกค้า (+ `/pdf` ดาวน์โหลดไฟล์จริง) |
| `/job/[token]` | หน้างานของคนไปส่ง/รับรถ — รูปสภาพรถ เลขไมล์ ปิดงาน |
| `/my` | ประวัติการจอง (**เข้าด้วย LINE Login เท่านั้น** — เลิกใช้ OTP ทางเบอร์แล้ว) |
| `/how-to-book` | 5 ขั้นตอนการจอง + คำถามที่พบบ่อย 7 ข้อ |
| `/line/connect` | เชื่อมต่อ LINE เพื่อรับแจ้งเตือน |
| `/contact` | เบอร์โทร เวลาทำการ |

**ฝั่งแอดมิน** (ต้อง login)

| หน้า | ทำอะไร |
|---|---|
| `/admin` | แดชบอร์ด ยอดจอง รายได้ งานค้าง |
| `/admin/bookings` | รายการจอง อนุมัติคำขอ ตรวจสลิป ตรวจเอกสารรายใบ |
| `/admin/schedule` | ตารางคิวรับ-ส่งรถรายวัน/เดือน ปิดงาน พิมพ์ ดาวน์โหลด CSV |
| `/admin/receipts` | ใบเสร็จรับเงิน — ออก แก้ ยกเลิก พิมพ์ ส่งเข้า LINE |
| `/admin/refunds` | คิวคืนเงินประกัน เรียงตามกำหนดที่สัญญาไว้ |
| `/admin/handoffs` | รูปสภาพรถที่คนรับ-ส่งถ่ายไว้ |
| `/admin/calendar` | ปฏิทินการจองทุกคัน |
| `/admin/cars` | จัดการรถ ราคา รูป สถานะ |
| `/admin/partners` | คลังรถพาร์ทเนอร์ (นายหน้า) |
| `/admin/pickup-points` | จุดรับ-ส่งรถ ตั้งค่าบริการรายจุด |
| `/admin/settings` | ค่าจอง เงินประกัน เงื่อนไขบริการ แจ้งเตือนคืนรถ |
| `/admin/after-hours` | ช่วงเวลาและราคาค่าบริการรับ-คืนรถนอกเวลา |
| `/admin/storage` | พื้นที่เก็บไฟล์ที่ใช้ไป แยกตามประเภท |
| `/admin/users` | จัดการแอดมิน ผูก LINE |
| `/admin/account` | บัญชีตัวเอง |

**ฝั่ง LINE OA** — รวมทุกอย่างในแชท

- Rich menu 6 ปุ่ม: จองรถ / รถทั้งหมด / เช็คสถานะ / วิธีจอง / ติดต่อ / เชื่อมบัญชี
- จองได้ในแชทเลย (ปุ่ม postback + Flex carousel) หรือเปิด LIFF เพื่อใช้ปฏิทินเต็มจอ
- ส่งรูปสลิปเข้าแชทได้ ระบบผูกเข้าการจองให้เอง
- แจ้งแอดมินทุกครั้งที่มีจองใหม่ / สลิปเข้า / เอกสารครบ
- แจ้งลูกค้าเมื่อยืนยันจอง / เอกสารไม่ผ่าน / เตือนก่อนคืนรถ

---

### 2. เทคโนโลยี

| ส่วน | ใช้อะไร |
|---|---|
| Framework | Next.js 16 App Router (Turbopack) |
| ภาษา | TypeScript |
| UI | Tailwind CSS v4, ฟอนต์ Noto Sans Thai |
| ORM | Prisma 7 + `@prisma/adapter-pg` |
| ฐานข้อมูล | Neon Postgres (ผ่าน Vercel Storage) |
| Auth แอดมิน | NextAuth v5 beta (Credentials + JWT + bcryptjs) |
| ไฟล์ | Vercel Blob (**Private** store) |
| Cron | Vercel Cron (เตือนคืนรถ) |
| แชท | LINE Messaging API + LINE Login + LIFF |
| Hosting | Vercel (แผน Hobby) |

---

### 3. โครงสร้างฐานข้อมูล

```
AdminUser        id, email(unique), passwordHash, name, role,
                 lineUserId?, lineLinkCode?(unique), lineLinkExpiresAt?
Car              id, name, brand, licensePlate(unique), pricePerDay,
                 costPerDay?, photoUrl?, source, status, partnerId?
Partner          id, name, phone, lineId?, note?, isActive
Customer         id, fullName, phone, email?, idCardNumber?,
                 isBlacklisted, lineUserId?
Booking          id, carId→Car, customerId→Customer, startDate, endDate,
                 totalPrice, status, pickupPlace?, returnPlace?,
                 note?, adminNote?, returnReminderSentAt?
Deposit          id, bookingId→Booking(unique), amount, slipImageUrl,
                 status, confirmedBy?, confirmedAt?
BookingDocument  id, bookingId→Booking, kind, fileUrl, status,
                 rejectReason?, reviewedBy?, reviewedAt?
                 @@unique([bookingId, kind])
PickupPoint      id, name, fee, isActive, sortOrder
Settings         id="default", bookingFee, securityDeposit, serviceNote,
                 returnReminderOn, returnReminderMinutesBefore
AfterHoursRate   id, label, startMinute, endMinute, fee, isActive
BookingAssignment id, bookingId→Booking, kind, adminUserId→AdminUser,
                 meetAt, place?, note?, googleEventId?, syncedAt?, syncError?,
                 notifiedAt?  @@unique([bookingId, kind, adminUserId])
LineDraft        id, lineUserId(unique), step, carId?, startDate?, endDate?
```

**Enum**

- `HandoffKind` — `DELIVERY` (ไปส่งรถ) / `PICKUP` (ไปรับรถคืน)
- `CarSource` — `OWN` / `PARTNER`
- `CarStatus` — `AVAILABLE` / `UNAVAILABLE`
- `BookingStatus` — `REQUESTED` / `REJECTED` / `PENDING_DEPOSIT` / `CONFIRMED` / `CANCELLED` / `COMPLETED`
- `DepositStatus` — `PENDING` / `CONFIRMED` / `REJECTED`
- `DocumentKind` — `ID_CARD` / `DRIVER_LICENSE` / `TRAVEL_PROOF`
- `DocumentStatus` — `PENDING` / `APPROVED` / `REJECTED`

---

### 4. กฎธุรกิจสำคัญ

**ค่าจอง vs เงินประกัน** — คนละอย่าง อย่าสับสน

- **ค่าจอง** (ค่าเริ่มต้น 500 บาท) — โอนล่วงหน้าเพื่อกันวัน เก็บผ่านเว็บ ลูกค้าอัปสลิป
- **เงินประกันรถ** (ค่าเริ่มต้น 3,000 บาท) — จ่ายวันรับรถ **ไม่ได้เก็บผ่านเว็บ** ระบบแค่แจ้งให้ทราบ คืนหลังส่งรถ

ทั้งสองค่าตั้งได้ที่ `/admin/settings` — ทุกที่ในระบบดึงจากค่านี้ ไม่มีเลขฝังในโค้ด

**รถพาร์ทเนอร์ (นายหน้า)** — รถที่มี `partnerId` หรือ `source = PARTNER`

1. ลูกค้าเห็นปุ่ม "ขอจอง" ไม่ใช่ "จองรถ"
2. การจองเข้าสถานะ `REQUESTED` — **ยังไม่ต้องโอนค่าจอง**
3. แอดมินติดต่อเจ้าของรถ แล้วกดอนุมัติ (`PENDING_DEPOSIT`) หรือปฏิเสธ (`REJECTED`)
4. อนุมัติแล้วลูกค้าจึงโอนค่าจอง
5. ระบบเก็บ `costPerDay` เพื่อคำนวณกำไรให้แอดมินเห็น

**รับ-คืนรถได้ทุกเวลา + ค่าบริการนอกเวลา** — ไม่มีการบล็อกเวลาแล้ว (เลิกใช้ `openHour`/`closeHour`)
ช่วงที่คิดเงินเก็บในตาราง `AfterHoursRate` ตั้งเองได้ที่ `/admin/after-hours`
คิด **แยกทั้งเวลารับและเวลาคืน แล้วบวกกัน** เช่น รับ 23:00 (+200) คืน 06:00 (+100) = +300
ค่าเริ่มต้น (จาก `prisma/seed-after-hours.ts`): 07:00-20:00 ฟรี · 05:00-07:00 และ 20:00-22:00 +100 · 22:00-05:00 +200
ช่วงที่ `endMinute <= startMinute` คือช่วงข้ามเที่ยงคืน · ถ้าเผลอตั้งทับกัน ระบบคิดอันที่แพงที่สุด
(หน้าหลังบ้านกันไม่ให้บันทึกช่วงที่ทับกันอยู่แล้ว)

**คิดราคาที่เดียว** — `lib/pricing.ts` (ไม่มี prisma ใช้ได้ทั้ง client และ server)
ทั้งเว็บ LIFF แชท LINE และ `create-booking.ts` เรียก `quoteBooking()` ตัวเดียวกัน
ราคาที่ลูกค้าเห็นก่อนกดจองจึงตรงกับที่บันทึกลงฐานข้อมูลเสมอ

**มอบหมายงานรับ-ส่งรถ** — หนึ่งการจองมีสองงาน (ส่งรถ / รับรถคืน) มอบหมายที่ `/admin/bookings`
มอบหมาย **หลายคนต่อหนึ่งงาน** ได้ และคนละคนกันระหว่างงานส่งกับงานรับได้
`meetAt` คือเวลานัดลูกค้าจริง ตั้งต้นจาก `startDate`/`endDate` แต่แอดมินแก้ได้
เวลาลงปฏิทินจะกันเวลาเดินทาง 30 นาที (นัด 09:00 → 08:30-09:30) ดู `TRAVEL_BUFFER_MIN` ใน `lib/assignments.ts`
คนที่ถูกมอบหมายได้ข้อความ LINE ทันที · งานที่ยังไม่มีคนรับและเหลือไม่ถึง 24 ชม.
จะถูกทวงเข้าแอดมินทุกคนโดย `/api/cron/reminders`

**ปฏิทินของแอดมิน** — แต่ละคนกดเชื่อมเองที่ `/admin/account` ระบบขอ scope เดียว
`calendar.app.created` แล้วสร้างปฏิทินแยกชื่อ "งานรับส่งรถ · CM Car Rent" ให้
**เข้าไม่ถึงปฏิทินอื่นของแอดมินเลย** · refresh token เข้ารหัส AES-256-GCM ก่อนเก็บ
event กันเวลาเดินทาง 30 นาที และเตือนล่วงหน้า 1 วัน + 1 ชั่วโมง
ถ้าซิงก์พลาด ข้อความผิดพลาดจะขึ้นในกล่องมอบหมายพร้อมปุ่ม "ลองซิงก์ใหม่"

**ปฏิทินเลือกวัน** — สามสถานะต่อวัน: ว่างทั้งวัน (ขาว) · **ว่างบางเวลา** (เหลือง มีสัญลักษณ์ ◗)
คือวันที่มีคนรับหรือคืนรถ ยังจองได้ · ไม่ว่าง (แดง มี ✕) คือติดทั้งวัน
เมื่อเลือกวัน ระบบบอกใต้ปฏิทินว่าวันนั้นติดช่วงไหนและว่างตั้งแต่กี่โมง
และ **ปิดตัวเลือกเวลาที่ชนกับการจองอื่น** ทั้งบนเว็บและ LIFF
ถ้าเวลาที่เลือกไว้กลายเป็นเวลาที่ชน ระบบเลื่อนไปเวลาว่างแรกของวันนั้นให้เอง
ส่วนเคส "คร่อม" (รับก่อน คืนหลังช่วงที่ติด) ตรวจด้วย `rangeBusy()` แล้วเตือนก่อนกดส่ง
— ด่านสุดท้ายยังเป็น `lib/create-booking.ts` เหมือนเดิม

**กันจองทับ** — `lib/create-booking.ts` เป็นจุดเดียวที่สร้างการจอง ใช้ร่วมกันทั้งเว็บ LIFF และแชท
เช็คช่วงเวลาทับกับสถานะที่ยังใช้งานอยู่ (`REQUESTED`, `PENDING_DEPOSIT`, `CONFIRMED`) เสมอ

**Blacklist** — เช็คจาก Customer เดิมที่หาด้วยเบอร์โทร **ก่อน** สร้างเรคคอร์ดใหม่

**แจ้งลูกค้าหลังจองสำเร็จ** — `createBooking` จะ push ข้อความทาง LINE ให้ลูกค้าที่ผูกบัญชีไว้เสมอ
บอกยอดค่าจอง เลขบัญชี จุดรับ-ส่ง และลิงก์ไปแนบสลิป/ส่งเอกสาร
สำคัญกับการจองผ่าน LIFF เพราะปิดหน้าต่างแล้วข้อมูลบนจอหายหมด ไม่มีอะไรค้างในแชท
ถ้าเป็นรถพาร์ทเนอร์จะไม่ส่งเลขบัญชี แต่บอกว่ายังไม่ต้องโอนจนกว่าจะยืนยัน

**เอกสาร 3 อย่าง** — บัตรประชาชน/Passport, ใบขับขี่, เอกสารจองเดินทางหรือที่พัก
แอดมินกดผ่าน/ไม่ผ่านแยกรายใบพร้อมเหตุผล ลูกค้าส่งใหม่ได้ สถานะกลับเป็นรอตรวจอัตโนมัติ

**แจ้งเตือนก่อนคืนรถ** — นับจาก `endDate` (เวลานัดคืนรถของการจองนั้น) ถอยหลังตาม
`Settings.returnReminderMinutesBefore` (ค่าเริ่มต้น 120 นาที = 2 ชั่วโมง ตั้งได้ 5 นาที–7 วันที่ `/admin/settings`)
`/api/cron/reminders` จะส่งให้การจอง `CONFIRMED` ที่ `returnReminderSentAt` ยังว่าง และเหลือเวลาถึงกำหนดคืน
ไม่เกินค่าที่ตั้งไว้ ส่งครั้งเดียวต่อการจอง · ใส่ `?force=1` เพื่อตามเก็บรายการที่เลยเวลานัดคืนไปแล้ว
**ความแม่นขึ้นกับความถี่ cron** — ต้องยิงทุก ~15 นาทีจึงจะตรง แต่ Hobby รันได้วันละครั้ง
`vercel.json` ตั้ง `/api/cron/reminders` = `0 2 * * *` (≈ 09:00 ไทย, คลาดได้ ±59 นาที) สำหรับสรุปแอดมินวันละรอบ
ส่วนการเตือนลูกค้าให้ยิง `/api/cron/customer-reminders` ทุก 15 นาทีด้วย GitHub Actions
(`.github/workflows/customer-reminders.yml`) — ต้องตั้ง GitHub Secrets: `CRON_SECRET` และ `SITE_URL`
(เช่น `https://app.example.com` ไม่มี `/` ท้าย) · เมื่ออัปเป็น Pro จะย้ายกลับมาใส่ใน `vercel.json` ก็ได้

**กันจองเล่น: ไม่แจ้ง LINE ตอนกดจอง + กันคิว 30 นาที** — ตอนสร้างการจองระบบ **ไม่ push หาใครเลย**
(ยกเว้นรถพาร์ทเนอร์ที่ยังต้องแจ้งแอดมินให้ไปถามเจ้าของรถ) เพราะใบที่ไม่จ่ายจริงกินโควตาข้อความฟรี
`Booking.holdUntil` ตั้งตอนสร้างใบ (รถพาร์ทเนอร์ตั้งตอนอนุมัติ) ตาม `Settings.holdMinutes` (ค่าเริ่มต้น 30)
พออัปสลิป `holdUntil` ถูกล้างเป็น null = ล็อกคิวถาวร และ **ตอนนั้นเองที่แอดมินได้แจ้งเตือน**
ใบที่เลยเวลาถูกยกเลิกด้วย **lazy sweep** (`lib/unpaid-hold.ts` → `sweepUnpaidHolds()`) ที่เรียกก่อนเช็คทับคิว
ไม่ใช่ cron เพราะ Hobby รัน cron ได้วันละครั้ง — ใช้ cron ไม่ทันกับเวลา 30 นาที

**ยกเลิกใบจอง = ต้องเคลียร์ปฏิทินและคนส่งรถด้วยเสมอ** — event ใน Google Calendar ผูกกับ
`BookingAssignment` ไม่ได้ผูกกับ `Booking` ถ้าเปลี่ยนสถานะใบจองอย่างเดียว งานมอบหมายจะยังอยู่
event ค้างในปฏิทินของคนส่งรถ และการ์ดงานใน LINE ก็ยังอยู่ — มีคนขับไปตามนัดที่ยกเลิกไปแล้วได้จริง

ใช้ `clearBookingAssignments(bookingId)` ใน `lib/calendar-sync.ts` ตัวเดียวทุกที่
(แจ้ง LINE คนรับงาน → ลบ event → ลบแถว) เรียกจาก 3 จุด:

| จุด | ไฟล์ |
|---|---|
| แอดมินกดยกเลิกการจอง | `app/admin/bookings/page.tsx` → `cancelBookingAction` |
| แอดมินกดปฏิเสธคำขอ (รถไม่ว่าง) | `app/admin/bookings/page.tsx` → `rejectRequestAction` |
| ระบบยกเลิกอัตโนมัติเพราะไม่อัปสลิปทัน | `lib/unpaid-hold.ts` → `sweepUnpaidHolds` |

ฟังก์ชันไม่ throw ออกมา — Google ล่มต้องไม่ทำให้การยกเลิกใบจองล้ม

**ลบใบจองทิ้ง ≠ ยกเลิก** — `BookingAssignment` ถูกลบตาม cascade พา `googleEventId` หายไปด้วย
ทำให้ event ค้างในปฏิทินแบบตามไปลบไม่ได้อีกเลย สคริปต์ใดก็ตามที่ลบ `Booking` **ต้องถอน event ก่อน**
(`scripts/cleanup-test.ts` และ `scripts/reset-bookings.ts` ทำแล้ว)

**เอกสารส่งได้หลังมีสลิปเท่านั้น** — ช่องอัปโหลดเอกสารในหน้า `/booking/[id]` ปิดอยู่จนกว่าจะมี `deposit`
กันคนส่งรูปบัตรประชาชนมาแล้วไม่จอง — เก็บเอกสารของคนที่ยังไม่ใช่ลูกค้าจริงคือความเสี่ยงเปล่า ๆ

**เปลี่ยนรถกลางคัน** — `swapCarAction` ใน `app/admin/bookings/actions` เลือกได้เฉพาะคันที่ว่างจริงในช่วงนั้น
(คำนวณในหน่วยความจำจาก fleet + busy ชุดเดียว ไม่ยิงฐานข้อมูลรายคัน) เหตุผลมาจาก `SWAP_REASONS` ใน `lib/car-swap.ts`
ค่าตั้งต้นคือคงราคาเดิม แต่แก้ยอดได้ · เขียนลง `internalNote` แบบต่อท้ายพร้อมเวลา และ **ส่งการ์ดงานใหม่ให้คนขับอัตโนมัติ**

**คืนเงินประกัน + รีวิว** — `lib/return-flow.ts` + `lib/refund.ts`
ปิดงาน PICKUP ที่ไหนก็ได้ (ลิงก์งานหรือหน้า schedule) จะ `completeReturn()` เหมือนกัน — สร้างแถว `DepositRefund`
และ push การ์ด "รับรถคืนเรียบร้อย" ครั้งเดียว (กันซ้ำด้วย `Booking.returnNotifiedAt`)
ลูกค้าแจ้งบัญชีที่ `/booking/[id]/refund` · ติ๊กว่ารีวิวแล้ว → กำหนดโอน `Settings.refundReviewedHours` (1 ชม.)
ไม่รีวิว → `refundNormalHours` (12 ชม.) · `addBusinessHours()` เดินนาฬิกาเฉพาะ 08:00-20:00 น. (ตั้งได้)
รีวิวยิงไปที่ LINE OA ด้วย `https://line.me/R/oaMessage/<OA id>/?<ข้อความตั้งต้น>`
**เลขบัญชีไม่เคยถูกเขียนลง audit log** และถูกลบอัตโนมัติหลังโอน `ACCOUNT_RETENTION_DAYS` (30 วัน)

**ใบเสร็จรับเงิน** — `lib/receipt.ts`, `components/ReceiptDoc.tsx` (เว็บ/พิมพ์), `lib/receipt-pdf.tsx` (PDF จริง)

- เลขที่ `RE-<พ.ศ.>-<5 หลัก>` รันด้วย `upsert` + `increment` บน `ReceiptCounter` (atomic ไม่ใช่ `count()+1`) เริ่มใหม่ทุกปี
- **บังคับกรอก 4 ช่อง**: ชื่อ, เลขผู้เสียภาษี (หรือเลขพาสปอร์ต), ที่อยู่, เบอร์โทร
- ยังไม่มี VAT · **ไม่ใส่เงินประกันในบิล** เพราะเป็นเงินรับฝาก ไม่ใช่รายได้
- **snapshot ทุกค่าตอนออก** ไม่คำนวณใหม่ตอนเปิดดู — ราคาที่เปลี่ยนทีหลังต้องไม่กระทบใบที่ออกไปแล้ว
- **แก้ได้ทุกกรณี** (รวมใบที่ยกเลิกไปแล้ว) เลขเดิมไม่เปลี่ยน ทุกครั้งบันทึก audit พร้อมยอดก่อน-หลัง
- **ยกเลิก ไม่ลบ** — ขึ้นลายน้ำ VOID แต่เลขยังอยู่ในระบบ
- ส่งเข้า LINE เป็น **Flex card + ปุ่มดาวน์โหลด PDF** เพราะ LINE push ไฟล์ PDF เข้าแชทตรง ๆ ไม่ได้
- **ลายเซ็นทั้งสองช่อง** (ผู้รับเงิน + ผู้มีอำนาจลงนาม) ใช้ลายเซ็นของ `Settings.signerAdminUserId`
  เจ้าตัวเท่านั้นที่อัปได้ผ่าน `/api/me/signature` (ไม่มีพารามิเตอร์เลือกคนอื่น) · ตราประทับอยู่ที่ `Settings.stampUrl`
  **เลิกให้ลูกค้าเซ็นรับบนหน้าจอแล้ว** — `/api/job/[token]/receipt-sign` ตอบ 410
- ฟอนต์ไทยใน PDF ต้อง register hyphenation callback ที่ตัดเป็น grapheme cluster
  ไม่งั้นคำไทยยาว ๆ (ไม่มีช่องว่าง) จะล้นกรอบแล้วโดนตัดทิ้ง

**กล่องยืนยันเป็นของเราเอง ไม่ใช่ `window.confirm`** — `components/ConfirmDialog.tsx`
`window.confirm` บล็อกทั้งหน้าและใน in-app browser ของ LINE บางรุ่นทำให้หน้าค้าง
ส่วนช่องเซ็นลายเซ็นเปิดเป็น `components/SignatureModal.tsx` แบบเต็มจอ ล็อก body ด้วย `position: fixed`
และดัก `touchmove` แบบ non-passive — ไม่งั้นการลากนิ้วตอนเซ็นจะไปโดน "ลากลงเพื่อปิด" ของ LINE

**เวลา** — ใช้ Asia/Bangkok ตลอด ผ่าน `Intl.DateTimeFormat` ใน `lib/settings.ts` ไม่พึ่ง timezone ของเซิร์ฟเวอร์

**ข้อความ LINE ต้องสร้างจากฟังก์ชันกลาง ห้ามพิมพ์ข้อความฝังในหน้า** — หน้า `/admin/notifications`
แท็บ "ตัวอย่างข้อความทั้งหมด" วาดตัวอย่างทุกข้อความ (37 แบบ) จากฟังก์ชันตัวเดียวกับที่ส่งจริง
แก้ถ้อยคำหรือหน้าตาการ์ดที่ไหน ตัวอย่างเปลี่ยนตามเอง — ถ้าพิมพ์ข้อความตรง ๆ ในหน้า
ตัวอย่างจะไม่ตรงกับของจริงโดยไม่มีใครรู้

| ข้อความ | อยู่ที่ |
|---|---|
| การ์ด Flex ทั่วไป | `lib/line-flex.ts` |
| การ์ดงาน · การ์ดรับทราบ · ปิดงาน · ถอนงาน (คนส่งรถ) | `lib/driver-cards.ts` (ฟังก์ชันล้วน ไม่แตะ DB) |
| ข้อความที่แอดมินกดส่ง (อนุมัติ/ปฏิเสธคำขอ สลิป/เอกสารไม่ผ่าน เปลี่ยนรถ) | `lib/customer-texts.ts` |
| ข้อความต้อนรับ · คำแนะนำคนส่งรถ · ตอบค่าปรับ | `lib/line-help.ts` |
| รายการตัวอย่างทั้งหมด | `lib/line-message-catalog.ts` — **เพิ่มข้อความใหม่เมื่อไหร่ต้องเพิ่มที่นี่ด้วย** |

ข้อความตัวหนังสือล้วนถูก `lib/line.ts` แปลงเป็นการ์ดตอนส่ง (บรรทัดแรก = หัวการ์ด อีโมจินำหน้ากำหนดสี
ลิงก์กลายเป็นปุ่ม) แคตตาล็อกจึงห่อด้วย `flexFromText` ให้เห็นแบบเดียวกับที่ลูกค้าเห็น

**ค่าเช่าแยกช่วงราคา — ใช้ `rentBreakdown()` ตัวเดียว** (`lib/rent-breakdown.ts`)
เรียก `quoteBooking` แบบเดียวกับตอนสร้างใบจอง จำนวนวันจึงนับตรงกันทุกที่
ใช้ใน 3 ที่: การ์ดสลิปของแอดมิน · การ์ดรับทราบงาน · โน้ตใน Google Calendar

- จองคร่อมหลายช่วงราคา → แสดงแยกบรรทัด `1,200 × 2 = 2,400` / `+ 1,500 × 1 = 1,500`
  ห้ามรวบเป็นคูณเดียว เพราะราคาต่อวันไม่เท่ากัน
- ยอดจองไม่เท่าค่าเช่าล้วน (ค่าส่งรถ ค่านอกเวลา แผนเดินทาง ส่วนลด) → ใส่ส่วนต่างเป็นบรรทัดแยก
  ยอดรวมจะได้บวกลงตัวเสมอ
- คืน `null` ถ้าคำนวณไม่ได้ — การ์ด/ปฏิทินต้องส่งต่อได้โดยไม่มีส่วนนี้ **ห้ามทำให้แจ้งเตือนหาย**

**การ์ดรับทราบงาน = โน้ตใน Google Calendar** — คนส่งรถกด "รับทราบ" ได้การ์ดสรุป
(บรรทัดแรก "รถ (เบอร์ลูกค้า)" · รับ/คืน วันเวลาสถานที่ · จำนวนวัน · ค่าเช่า × วัน · ประกัน · รวม)
พร้อมปุ่มโทรหาลูกค้า และ **ระบบซิงก์ปฏิทินใหม่ทันที** ให้โน้ตมีข้อมูลชุดเดียวกัน
(ทั้งสองที่สร้างจาก `jobSummaryLines` / `flexJobAck` ใน `lib/driver-cards.ts`)

⚠️ "รวม" ในการ์ดนี้คือ ค่าเช่า + ประกัน **ไม่ใช่ยอดเก็บหน้างาน** (ลูกค้าโอนค่าจองมาแล้ว)
ยอดที่ต้องเก็บจริงอยู่ในการ์ดงานเดิม ("เก็บเงินหน้างาน") ซึ่งไม่ได้เปลี่ยน

**ลิงก์ในโน้ตปฏิทินเป็นหน้างาน `/job/<viewToken>` ไม่ใช่หลังบ้าน** — คนส่งรถเปิดเอกสารได้โดยไม่ต้องล็อกอิน
ใช้โทเคนเดียวกับปุ่มในการ์ด LINE · ถอนงานแล้วลิงก์ตาย · ปิดเองเมื่อพ้นนัด 1 วัน · ทุกครั้งที่เปิดถูกบันทึก
**ปฏิทิน "งานรับส่งรถ PHUPING" จึงห้ามแชร์ให้คนนอกทีมส่งรถ** เพราะเห็นลิงก์ = เปิดบัตรประชาชนลูกค้าได้

**แดชบอร์ดกรองช่วงวันที่ได้** (`lib/dashboard-range.ts`) — `?range=today|7d|month|lastmonth|year|all|custom`
`&from=&to=` `&by=start|created` ค่าเริ่มต้นคือ "เดือนนี้" นับตามวันรับรถ ตัดวันตามเวลาไทย

| กรองตามช่วง | ไม่กรอง — สถานะตอนนี้เสมอ |
|---|---|
| ยืนยันแล้ว · การจอง · ค่าจองที่รับแล้ว · มูลค่าการจอง · รายการการจอง | รอตรวจเอกสาร · รถทั้งหมด · งานวันนี้ · ยังไม่มีคนรับ 7 วัน |

ฝั่งขวาไม่กรองเพราะเป็นงานที่ต้องทำตอนนี้ ถ้ากรองตามเดือนที่แล้วงานค้างจะหายจากหน้าจอ

---

### 5. ไฟล์ที่ควรรู้จัก

| ไฟล์ | หน้าที่ |
|---|---|
| `lib/create-booking.ts` | **จุดเดียวที่สร้างการจอง** กฎตรวจสอบทั้งหมดอยู่ที่นี่ |
| `lib/pricing.ts` | **จุดเดียวที่คิดราคา** ค่าเช่า + ค่านอกเวลา (**ห้ามใส่ prisma**) |
| `lib/assignments.ts` | ป้ายกำกับงานรับ-ส่ง เวลาเผื่อเดินทาง (**ห้ามใส่ prisma**) |
| `lib/google-calendar.ts` | คุย Google Calendar API + ลิงก์ OAuth |
| `lib/calendar-sync.ts` | ซิงก์งานมอบหมายขึ้นปฏิทิน (ไม่ throw ออกข้างนอก) |
| `lib/crypto.ts` | เข้ารหัส refresh token + เซ็น state ของ OAuth |
| `app/admin/assignments/actions.ts` | มอบหมาย/ถอนงาน + แจ้ง LINE คนที่รับงาน |
| `components/AssignmentBox.tsx` | กล่องมอบหมายในการ์ดการจอง |
| `lib/after-hours-server.ts` | ดึงช่วงค่าบริการนอกเวลาจากฐานข้อมูล |
| `lib/settings.ts` | อ่านค่าตั้งค่า + ตัวช่วยเรื่องเวลาไทยทั้งหมด |
| `lib/availability.ts` | คำนวณวันว่าง/ไม่ว่าง + ช่วงที่ติด (`getBusySpans`) |
| `lib/day-slots.ts` | ปิดเวลาที่ชน + ข้อความบอกช่วงติด (**ห้ามใส่ prisma**) |
| `lib/booking-status.ts` | ป้ายสถานะ สี และ `needsApproval()` |
| `lib/line.ts` | ส่งข้อความ LINE, ตรวจ signature, รายชื่อแอดมิน |
| `lib/line-booking.ts` | flow การจองในแชท (postback ทีละขั้น) |
| `lib/line-flex.ts` | Flex Message ทุกแบบ |
| `lib/documents.ts` | ชนิดเอกสาร ป้ายสถานะ (ไม่มี prisma) |
| `lib/pickup-points.ts` | ค่าคงที่/helper จุดรับ-ส่ง (**ห้ามใส่ prisma**) |
| `lib/pickup-points-server.ts` | ดึงจุดรับ-ส่งจากฐานข้อมูล |
| `lib/image-resize.ts` | ย่อรูปในเบราว์เซอร์ก่อนอัปโหลด |
| `lib/contact.ts` | เบอร์โทร เวลาทำการ **เลขบัญชีรับโอน** (แก้ที่เดียวเปลี่ยนทุกที่) |
| `lib/customer-session.ts` | เซสชันลูกค้าสำหรับหน้า `/my` (payload เป็น `{cid, exp}`) |
| `lib/line-login.ts` | LINE Login ฝั่งเว็บ — state, nonce, ตรวจ id_token |
| `lib/schedule.ts` | รวมคิวรับ-ส่งของวัน/เดือนให้หน้า `/admin/schedule` (**ห้ามใส่ JSX**) |
| `lib/device-bookings.ts` | จำการจองไว้ในเครื่องลูกค้า (localStorage ไม่มีวันหมดอายุ) |
| `lib/google-health.ts` | เช็คว่า token ปฏิทินยังใช้ได้ + แจ้งเตือนเมื่อหลุด |
| `lib/ui.ts` | **คลาสปุ่มกลาง (`BTN`) กล่องแจ้งผล (`NOTICE`) ข้อความยืนยัน (`CONFIRM`)** |
| `lib/unpaid-hold.ts` | กันคิวรถของใบที่ยังไม่โอน + sweep ใบที่เลยเวลา (เคลียร์ปฏิทินให้ด้วย) |
| `lib/calendar-sync.ts` | ซิงก์/ลบ event ปฏิทิน · **`clearBookingAssignments()` ใช้ตอนยกเลิกใบจอง** |
| `lib/car-swap.ts` | เหตุผลการเปลี่ยนรถ (**ห้ามใส่ prisma**) |
| `lib/return-flow.ts` | ปิดงานรับรถคืน → สร้างคิวคืนเงินประกัน + ชวนรีวิว |
| `lib/refund.ts` | คำนวณกำหนดโอนตามเวลาทำการ + ตรวจเลขบัญชี |
| `lib/receipt.ts` | เลขที่ใบเสร็จ อ่านจำนวนเงินเป็นตัวอักษร รวมยอด |
| `components/ReceiptDoc.tsx` | ใบเสร็จบนเว็บและตอนพิมพ์ (A4) |
| `lib/receipt-pdf.tsx` | ใบเสร็จเป็นไฟล์ PDF จริง (react-pdf + ฟอนต์ Sarabun) |
| `components/SignatureModal.tsx` | ช่องเซ็นเต็มจอ กันหน้าเลื่อน/ถูกลากปิดบนมือถือ |
| `components/ConfirmDialog.tsx` | กล่องยืนยันแทน `window.confirm` |
| `components/ActionButton.tsx` | ปุ่มส่งฟอร์มที่ถามยืนยันก่อน + กันกดซ้ำ (`useFormStatus`) |
| `components/AutoRefresh.tsx` | รีเฟรชหน้าเองทุก 60 วิ (หยุดเมื่อแท็บไม่ได้เปิดอยู่) |
| `components/PrintButton.tsx` | สั่งพิมพ์ — สไตล์อยู่ใน `@media print` ของ `globals.css` |
| `app/admin/schedule/actions.ts` | เปลี่ยนสถานะงานรับ-ส่งจากหน้าเว็บ (DRIVER แก้ได้แค่งานตัวเอง) |
| `lib/driver-cards.ts` | การ์ด LINE ของคนส่งรถ + `jobSummaryLines` สำหรับโน้ตปฏิทิน (**ห้ามใส่ prisma**) |
| `lib/customer-texts.ts` | ข้อความที่แอดมินกดส่งหาลูกค้าจากหลังบ้าน |
| `lib/line-help.ts` | ข้อความต้อนรับ · คำแนะนำคนส่งรถ · ข้อความตอบค่าปรับ |
| `lib/line-message-catalog.ts` | รายการตัวอย่างข้อความ LINE ทั้งหมดสำหรับหน้า `/admin/notifications` |
| `lib/rent-breakdown.ts` | ค่าเช่าแยกช่วงราคาของใบจอง (คืน `null` ถ้าคำนวณไม่ได้) |
| `lib/dashboard-range.ts` | แปลงช่วงวันที่ของแดชบอร์ดจาก URL เป็นช่วงเวลาไทย |
| `components/LinePreview.tsx` | วาดตัวอย่างข้อความ LINE/Flex บนเว็บ (`full` = ไม่จำกัดความสูง) |

---

### 6. ติดตั้งและรันบนเครื่อง

#### ครั้งแรก

```bash
npm install

vercel env pull .env.local --environment=production
copy .env.local .env

# เติมค่าที่ Vercel ส่งออกมาเป็น [SENSITIVE] ด้วยมือ (ดูหัวข้อ 7)

npm run db:push
npx tsx prisma/seed-cars.ts
npx tsx prisma/seed-pickup-points.ts
```

#### รันทุกครั้ง

```bash
npm run dev
```

#### สคริปต์

| คำสั่ง | ทำอะไร |
|---|---|
| `npm run db:push` | อัปเดตโครงสร้างตารางตาม `schema.prisma` |
| `npx prisma generate` | สร้าง Prisma Client (Vercel รันเองผ่าน postinstall) |
| `npx tsx prisma/seed-cars.ts` | ใส่/อัปเดตรถจริง 7 คันพร้อมราคา |
| `npx tsx prisma/seed-pickup-points.ts` | ใส่จุดรับ-ส่ง 3 จุดเริ่มต้น |
| `npx tsx prisma/seed-after-hours.ts` | ใส่ช่วงค่าบริการนอกเวลาเริ่มต้น 3 ช่วง |
| `npx tsx prisma/cleanup-demo-cars.ts` | เก็บกวาดรถเดโม (ใส่ `--apply` เพื่อลงมือจริง) |
| `npx tsx scripts/setup-richmenu.ts` | ติดตั้ง rich menu ขึ้น LINE OA |
| `npx tsx scripts/cleanup-test.ts` | ลบเฉพาะข้อมูลทดสอบ เก็บใบจองจริง (ไม่ใส่ `--yes` = ดูเฉย ๆ) |
| `npx tsx scripts/sweep-dead-events.ts` | กวาด event ที่ค้างในปฏิทินของใบจองที่จบไปแล้ว (ไม่ใส่ `--yes` = ดูเฉย ๆ) |
| `npx tsx scripts/resync-calendar.ts` | อัปเดตโน้ตใน event ปฏิทินที่มีอยู่ให้เป็นแบบล่าสุด (ไม่ใส่ `--yes` = ดูเฉย ๆ · `--all` = รวมงานเก่า) — **รันหลัง deploy** |
| `npm run build` | **ต้องรันก่อน push ทุกครั้ง** |
| `npx tsc --noEmit` | ตรวจ type |

---

### 7. ตัวแปร Environment

| ตัวแปร | ใช้ทำอะไร |
|---|---|
| `DATABASE_URL` | Neon Postgres (Sensitive — ต้องเอาจาก Neon dashboard) |
| `AUTH_SECRET` | NextAuth + เซ็นเซสชันลูกค้า และ state/nonce ของ LINE Login |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob |
| `NEXT_PUBLIC_SITE_URL` | โดเมนเว็บ ใช้ในลิงก์ที่ส่งทาง LINE |
| `LINE_CHANNEL_ACCESS_TOKEN` | Messaging API |
| `LINE_CHANNEL_SECRET` | ตรวจ signature ของ webhook |
| `LINE_ADMIN_USER_ID` | LINE ID แอดมินสำรอง (นอกจากที่ผูกในหลังบ้าน) |
| `LINE_LOGIN_CHANNEL_ID` | ตรวจ idToken ฝั่ง server |
| `NEXT_PUBLIC_LIFF_ID` | LIFF หน้าเชื่อมบัญชี |
| `NEXT_PUBLIC_LIFF_BOOKING_ID` | LIFF หน้าจองรถ |
| `NEXT_PUBLIC_LINE_OA_ID` | LINE OA id เช่น `@606ugqjs` |
| `CRON_SECRET` | ป้องกัน endpoint เตือนคืนรถ |
| `GOOGLE_OAUTH_CLIENT_ID` | เชื่อมปฏิทินของแอดมิน |
| `GOOGLE_OAUTH_CLIENT_SECRET` | เชื่อมปฏิทินของแอดมิน (Sensitive) |
| `GOOGLE_TOKEN_ENC_KEY` | คีย์ AES-256 เข้ารหัส refresh token (Sensitive) |

`NEXT_PUBLIC_*` ถูกฝังตอน build — **แก้แล้วต้อง redeploy** และอย่าตั้งเป็น Sensitive

---

### 8.1 ตั้งค่า Google Calendar

1. Google Cloud Console → สร้างโปรเจกต์ → เปิด **Google Calendar API**
2. OAuth consent screen — ถ้าองค์กรมี Google Workspace เลือก **Internal** (ไม่ต้องส่ง Google ตรวจ)
   ถ้าใช้ Gmail ทั่วไปเลือก External + โหมด Testing แล้วใส่อีเมลแอดมินเป็น test user (ได้ถึง 100 คน)
3. สร้าง **OAuth client ID** แบบ Web application ใส่ redirect URI สองตัว:
   `https://<โดเมน>/api/google/callback` และ `http://localhost:3000/api/google/callback`
4. ใส่ env 3 ตัว (ดูหัวข้อ 7) แล้ว redeploy
5. แอดมินแต่ละคนเข้า `/admin/account` กดเชื่อมเอง

> scope ที่ขอคือ `calendar.app.created` เท่านั้น — สร้างปฏิทินของแอปเองและจัดการ event ในนั้นได้
> ไม่เห็นและไม่แก้ปฏิทินอื่นของแอดมิน

### 8. ตั้งค่า LINE

**Provider เดียวกันสำคัญมาก** — Messaging API channel และ LINE Login channel
ต้องอยู่ใต้ provider เดียวกัน (`car-booking-test`) ไม่งั้น LINE userId จะไม่ตรงกัน ผูกบัญชีไม่ได้

| ของ | ค่า |
|---|---|
| LINE OA | `@606ugqjs` (test-car-booking) |
| LINE Login channel | CM Car Rent Login — ID `2011133017` |
| LIFF Connect | `2011133017-nj2ok701` → `/line/connect` (Tall) |
| LIFF Booking | `2011133017-Yl8trlid` → `/line/book` (Full) |

**ต้องตั้งใน LINE OA Manager**

- Webhooks: **เปิด**
- Auto-response messages: **ปิด** (ไม่งั้นจะแย่งตอบก่อน bot)
- Greeting message: ปิดหรือแก้ตามต้องการ

**ต้องตั้งใน LINE Developers Console**

- LIFF scopes: `openid` **และ** `profile` (ขาด `openid` แล้ว `getIDToken()` คืน null)
- Linked LINE Official Account: ผูกกับ `@606ugqjs`
- Channel status: **Published** (ถ้าเป็น Developing คนอื่นจะโดน 400)

---

### 9. รูปภาพและความปลอดภัย

Blob store เป็น **Private** ทั้งหมด เข้าถึงผ่าน `/api/file?p=<pathname>` เท่านั้น

| โฟลเดอร์ | เนื้อหา | ใครดูได้ |
|---|---|---|
| `cars/` | รูปรถ | ทุกคน |
| `slips/` | สลิปค่าจอง (มีข้อมูลธนาคาร) | เฉพาะแอดมินที่ login |
| `documents/` | บัตรประชาชน ใบขับขี่ เอกสารเดินทาง | เฉพาะแอดมินที่ login |

`/api/file` ใช้ **allowlist** — เปิดสาธารณะแค่ `cars/` นอกนั้นต้องมี session
โฟลเดอร์ใหม่ที่เพิ่มในอนาคตจะถูกปิดโดยปริยาย ไม่หลุดเงียบๆ

**ความปลอดภัยอื่น**

- หน้า `/my` เข้าได้ทาง LINE Login อย่างเดียว — ไม่มีทางเข้าด้วยเบอร์โทรอีกแล้ว
  เพราะการกรอกเบอร์อย่างเดียวเปิดให้ไล่เดาเบอร์คนอื่นเพื่อดูประวัติการจองได้
- `Customer.lineUserId` (`@unique`) คือตัวตนของลูกค้า — เบอร์โทรเป็นเพียงข้อมูลติดต่อ
  การจองแบบไม่ล็อกอินจะผูกเข้าบัญชีที่ยืนยัน LINE แล้วไม่ได้ (ดู `lib/create-booking.ts`)
- เซสชันลูกค้าเป็น cookie httpOnly เซ็น HMAC เทียบแบบ timing-safe
- LINE webhook ตรวจ signature HMAC-SHA256 ทุก request
- `idToken` จาก LIFF ตรวจกับ `api.line.me/oauth2/v2.1/verify` ฝั่ง server เสมอ **ไม่เชื่อ userId ที่ client ส่งมา**
- API เอกสารรับเฉพาะ path ที่ออกจาก `/api/upload` ของเราเอง

---

### 10. ปัญหาที่เจอและวิธีแก้

#### Prisma 7 — `url` ใน schema ใช้ไม่ได้แล้ว
`datasource` มีแค่ `provider` ต้องส่ง connection string ผ่าน driver adapter (`PrismaPg`) ใน `lib/prisma.ts`

#### `prisma.config.ts` ไม่โหลด .env เอง
ใส่ `import "dotenv/config";` เป็นบรรทัดแรก

#### Prisma CLI อ่าน `.env` ไม่ใช่ `.env.local`
`copy .env.local .env` ทุกครั้งที่ดึง env ใหม่

#### `vercel env pull` ได้ค่าไม่ครบ
ต้องใส่ `--environment=production` และตัวแปรที่ตั้งเป็น **Sensitive** จะได้ `[SENSITIVE]` เสมอ
อ่านค่าจริงไม่ได้ทั้งจาก CLI และ dashboard — ต้องไปเอาจากต้นทาง (Neon → Quickstart → Show secret)

#### Next.js 16 — `middleware.ts` เปลี่ยนชื่อเป็น `proxy.ts`

#### อัปโหลดสลิปขึ้น "Unexpected end of JSON input"
Blob store เป็น Private แต่โค้ดสั่ง `access: "public"` → แก้เป็น `"private"` + ดึงผ่าน `/api/file`
และใส่ try/catch ให้ทุก route ตอบ JSON เสมอ

#### LINE bot ตอบข้อความ default
Webhooks toggle ปิดอยู่ใน LINE OA Manager

#### Rich menu บันทึกไม่ได้ "Enter a display period"
Display period เป็นช่องบังคับ ต้องใส่ช่วงวันที่

#### `react-hooks/purity` error
เรียก `Date.now()` ตอน render → ย้ายไป module scope หรือ `useEffect`

#### Build fail: `Module not found: Can't resolve 'dns'`
มี client component import โมดูลที่ `import prisma` เข้ามา → Turbopack ลาก `pg` ไป bundle ฝั่ง browser
**แยกไฟล์**: helper ที่ client ใช้ต้องไม่มี prisma (ดู `lib/pickup-points.ts` vs `-server.ts`)

#### กดเลือกรถใน LINE แล้ววนกลับมาหน้าเลือกรถไม่จบ
LINE ส่งพารามิเตอร์ของลิงก์ LIFF มาเป็น `liff.state` เช่น `?liff.state=%3Fcar%3Dabc`
ปกติ LIFF SDK แกะให้ตอน `liff.init()` แต่หน้าที่ไม่ได้เรียก init จะไม่มีใครแกะ
พอเด้งไปล็อกอินแล้ว LINE ส่งกลับมาที่ endpoint เปล่าๆ จึงวนซ้ำ
**แก้:** แกะ `liff.state` เองฝั่ง server แล้ว redirect + ใส่ตัวกันวนลูปตอนเรียก `liff.login`

#### อัปโหลดรูปขึ้น 413
Vercel จำกัด request body ของ serverless function ไว้ราว **4.5MB** และปฏิเสธก่อนถึงโค้ดเรา
แก้ด้วยการย่อรูปในเบราว์เซอร์ก่อนส่ง (`lib/image-resize.ts`)

#### ปุ่มในโหมดมืดเป็นพื้นขาวตัวหนังสือขาว มองไม่เห็น

ใช้ `bg-slate-900 text-white` เป็นปุ่ม/แท็บที่เลือกอยู่ — โหมดมืดสลับ `slate-900` เป็นสีอ่อน
แต่ `text-white` ไม่สลับ ตัวหนังสือจึงจมหาย (เจอที่ตัวกรองแดชบอร์ดและแท็บหน้าแจ้งเตือน)

**ใช้ `bg-blue-600 text-white` หรือคลาสใน `BTN` (`lib/ui.ts`) แทน** — `blue-600` ถูกแมปเป็นเขียวแบรนด์
และไม่สลับในโหมดมืด

#### ย้ายค่าคงที่ออกจาก `route.ts` ก่อนเอาไปใช้ที่อื่น

ไฟล์ `app/**/route.ts` ของ Next.js export ได้เฉพาะ handler (`GET` `POST` …) กับค่าตั้งค่า
export อย่างอื่นแล้ว `next build` ล้ม — จึงย้าย `HELP_TEXT` จาก webhook ไป `lib/line-help.ts`
ก่อนให้หน้าตัวอย่างข้อความ import ไปใช้

#### `TS2304: Cannot find name 'settings'`
ลืมว่าฟังก์ชันนั้นไม่มี `settings` ในขอบเขต → ใช้ `(await getSettings())` ที่จุดใช้งาน
**ESLint จับ error ประเภทนี้ไม่ได้** ต้องรัน `npx tsc --noEmit`

---

### 11. ขั้นตอน deploy

```bash
npm run db:push        # ถ้า schema.prisma เปลี่ยน
npx tsc --noEmit
npm run build          # จับ error ที่ tsc จับไม่ได้
```

แล้ว commit + push → Vercel deploy อัตโนมัติใน 1-2 นาที

`prisma generate` ไม่ต้องรันเอง — อยู่ใน `postinstall` แล้ว Vercel รันให้ทุก build
แต่ **`db:push` ไม่อยู่ในขั้นตอน build** ถ้าลืมรัน เว็บจะ error ตอนใช้งานจริง

**ดู error:** build fail → Deployments → Build Logs · เว็บ error ตอนใช้ → Logs (runtime)

---

### 12. ข้อจำกัดของแผน Hobby

| เรื่อง | ข้อจำกัด |
|---|---|
| Cron | วันละครั้ง คลาดเคลื่อน ±59 นาที — งานถี่ (เตือนลูกค้า) ใช้ GitHub Actions ยิงเข้า `/api/cron/customer-reminders` แทน |
| Request body | ~4.5MB (เหตุของ 413) |
| Logs | ย้อนได้แค่ 1 ชั่วโมง |
| ToS | **ห้ามใช้เชิงพาณิชย์** — ถ้าเปิดรับเงินจริงต้องอัปเป็น Pro |

**ข้อจำกัดของ LINE**

- datetimepicker ปิดวันที่รายวันไม่ได้ → ใช้ LIFF เมื่อต้องการปฏิทินที่ปิดวันไม่ว่างได้
- reply message ฟรีไม่จำกัด แต่ push message มีโควตา

---

### 13. สิ่งที่ยังไม่ได้ทำ / ค่าที่ยังเป็นของสมมติ

**ต้องแก้ก่อนใช้จริง**

- [ ] **เลขบัญชีธนาคาร** — ยังเป็น `123-4-56789-0` แก้ที่ `lib/contact.ts` → `BANK_ACCOUNT`
      (ตอนนี้ระบบส่งเลขนี้ไปให้ลูกค้าทาง LINE แล้ว ควรแก้ก่อนเปิดใช้จริง)
- [ ] รหัสผ่านแอดมิน — ยังเป็น `changeme123`
- [ ] ทะเบียนรถ — ยังเป็นรหัสชั่วคราว (`ATIV-01`, `CITYT-01` …)
- [ ] รูปรถทั้ง 7 คัน — อัปที่ `/admin/cars`
- [ ] LINE ID ในหน้าเว็บ — ยังเป็น `@cmcarrent` ของจริงคือ `@606ugqjs`
- [ ] อัปเกรด Vercel เป็น Pro ก่อนรับเงินจริง

**ฟีเจอร์ที่ยังไม่มี**

- [ ] **ค่าบริการจุดรับ-ส่ง (`PickupPoint.fee`) ยังไม่ถูกคิดเงิน** — ป้ายบนเว็บบอก "+N บาท"
      แต่ `totalPrice` ไม่ได้รวมไว้ ถ้าจะคิดจริงต้องเพิ่มใน `lib/pricing.ts`
- [ ] เงินประกันแยกรายรุ่นรถ (ตอนนี้ค่าเดียวใช้ทุกคัน แต่ FAQ บอกว่าบางรุ่นต่างกัน)
- [ ] Bank API เช็คยอดอัตโนมัติ / OCR อ่านสลิป
- [ ] ลูกค้ายกเลิกหรือเลื่อนวันเองในเว็บ (ตอนนี้ต้องติดต่อแอดมิน)
- [ ] ระบบรีวิว / คูปองส่วนลด
- [ ] รายงานยอดขายแบบละเอียด export ได้

**ยกเลิกแล้ว ไม่ต้องทำ**

- ~~ระบบสองภาษา (i18n)~~ — รื้อออกหมดแล้ว เหลือภาษาไทยเดียว
  (`lib/i18n.ts`, `lib/locale*.ts`, `components/LangToggle.tsx` ถูกลบทิ้ง)
- ~~OTP ทางเบอร์โทรสำหรับหน้า `/my`~~ — เปลี่ยนไปใช้ LINE Login อย่างเดียว (`model CustomerOtp` ถูกลบ)
- ~~Bank API / OCR อ่านสลิป~~ — ตกลงกันว่าไม่ทำ
- ~~ซิงก์ Google Sheets จากหน้าตารางงาน~~ — ใช้ดาวน์โหลด CSV แทน
- ~~ระบบรีวิว~~

---

### 14. ข้อควรระวังเวลาแก้โค้ด

1. **`lib/pickup-points.ts` ห้าม import prisma** — client component ใช้ไฟล์นี้ ถ้าใส่เข้าไป build จะพัง
2. **สร้างการจองใหม่ต้องผ่าน `lib/create-booking.ts`** อย่าเขียน `prisma.booking.create` ตรงๆ ไม่งั้นกฎกันจองทับ/blacklist จะหลุด
3. **ราคาและค่าธรรมเนียมดึงจาก Settings และ `lib/pricing.ts`** อย่า hardcode ตัวเลข
   และอย่าคำนวณ `days * pricePerDay` เองที่อื่น ให้เรียก `quoteBooking()` เสมอ ไม่งั้นค่านอกเวลาจะหลุด
4. **รัน `npm run build` ก่อน push ทุกครั้ง** — `tsc` และ ESLint จับ error เรื่อง bundling ไม่ได้
5. **แก้ schema แล้วต้อง `db:push`** ก่อนโค้ดขึ้น production
6. **โฟลเดอร์ Blob ใหม่จะเป็น private อัตโนมัติ** ถ้าต้องการให้สาธารณะต้องเพิ่มใน allowlist ของ `/api/file` เอง
7. **หน้า LIFF ใหม่ต้องแกะ `liff.state`** ถ้าหน้านั้นไม่ได้เรียก `liff.init` เอง
8. **เวลาทุกที่ใช้ Asia/Bangkok** ผ่าน helper ใน `lib/settings.ts` อย่าใช้ `new Date()` คำนวณวันตรงๆ
9. **ปุ่มที่ลบข้อมูลหรือส่ง LINE ออกไป ต้องใช้ `<ActionButton confirm=...>`** ไม่ใช่ `<button>` เปล่า
   ข้อความยืนยันเอาจาก `CONFIRM` ใน `lib/ui.ts` จะได้เหมือนกันทุกหน้า
10. **CSS ที่เขียนนอก `@layer` ใน `globals.css` ชนะ utility ของ Tailwind v4 ทุกตัว**
    กฎ `min-height: 2.75rem` ของปุ่มจึงมีทางหนีเป็น `:not(.min-h-0)` — ปุ่มเล็กต้องใส่ `min-h-0`
11. **รูปเอกสารที่แอดมิน/คนรับ-ส่งต้องตรวจ ให้ใส่ `data-no-dim`** ไม่งั้นโหมดมืดจะหรี่รูปจนดูไม่ออก
12. **อะไรที่ไม่ควรติดไปบนกระดาษ ให้ใส่ class `no-print`**

[↑ กลับสารบัญ](#toc)

---

<a id="part-3"></a>

## ภาคที่ 3 — ส่งออกข้อมูลและการเปลี่ยนมาใช้ Vercel Hobby

_เนื้อหาใหม่ เพิ่มตอนเตรียมส่งมอบระบบ_

### 3.1 หน้าส่งออกข้อมูลทั้งระบบ

หน้า `/admin/export` (เมนู "ส่งออกข้อมูล" ในหลังบ้าน) ใช้รวมข้อมูลทั้งหมดเป็นไฟล์ ZIP เดียวสำหรับส่งมอบ ประกอบด้วย

- ไฟล์ CSV 19 ไฟล์ — ไฟล์หลักคือ `bookings.csv` (ใบจองละหนึ่งแถว รวมลูกค้า รถ ค่าจอง เงินประกัน เลขที่ใบเสร็จ) ไฟล์อื่นเชื่อมกันด้วย "รหัสการจอง" และ "เลขที่ใบเสร็จ"
- ใบเสร็จ PDF ทุกใบ (รวมใบที่ยกเลิก) ในโฟลเดอร์ `receipts/`
- `README.txt` บอกวิธีเปิดไฟล์ จำนวนแถวของแต่ละไฟล์ สิ่งที่ไม่รวม และ SHA-256 ของทุกไฟล์ไว้ตรวจว่าไฟล์ไม่ถูกแก้

**ไม่รวมในไฟล์ส่งออก (ตั้งใจ):** รูปและเอกสารใน Vercel Blob ทั้งหมด (บัตรประชาชน ใบขับขี่ เอกสารเดินทาง สลิป รูปสภาพรถ รูปรถ ลายเซ็น ตราประทับ), เลขบัตรประชาชนลูกค้า, รหัสผ่านและโทเคนทุกชนิด, เลขบัญชีคืนเงินของรายที่โอนคืนแล้ว
เลขบัญชีของรายที่ **ยังไม่ได้โอนคืน** จะอยู่ใน `refunds.csv` เพื่อให้บริษัทโอนต่อได้

**สิทธิ์และความปลอดภัย:** เข้าได้เฉพาะบัญชี DEV — ถ้าตั้ง env `EXPORT_OWNER_EMAIL` จะล็อกให้เหลืออีเมลเดียว
ทุกครั้งที่ส่งออกถูกบันทึกในประวัติการใช้งาน (`/admin/audit`) ไฟล์ที่ได้มีข้อมูลส่วนบุคคลของลูกค้า ควรส่งมอบให้ผู้ที่บริษัทมอบหมายเท่านั้น
และกำหนดระยะเก็บตามนโยบาย PDPA ของบริษัท

**ตัวเลือกการดาวน์โหลด:** ทั้งหมด (CSV + PDF), เฉพาะ CSV, และแยกใบเสร็จ PDF ทีละปี (ใช้เมื่อโหลดทั้งหมดแล้ว PDF ไม่ครบ
เพราะ Vercel Hobby จำกัดเวลาฟังก์ชัน 300 วินาที ระบบหยุดสร้าง PDF ที่ 230 วินาทีและบันทึกรายชื่อที่ข้ามไว้ใน README.txt)

**ตรวจก่อนลบระบบ:** แตกไฟล์ ZIP, เปิด `bookings.csv` ด้วย Excel (ภาษาไทยต้องไม่เพี้ยน จำนวนแถวตรงกับหน้าส่งออก),
สุ่มเปิด PDF 3–5 ใบเทียบกับ `receipts.csv`, แล้วให้ผู้รับของบริษัทยืนยันว่าเปิดอ่านได้ก่อนลบข้อมูล

ไฟล์โค้ด: `app/admin/export/page.tsx`, `app/admin/export/download/route.ts`, `lib/export-data.ts`, `lib/export-guard.ts`, `lib/zip-stream.ts`

### 3.2 ข้อจำกัดหลังเปลี่ยนมาใช้ Vercel Hobby

- Cron บน Hobby รันได้วันละครั้งและคลาดเคลื่อนได้ ±59 นาที จึงตั้ง `/api/cron/reminders` เป็นวันละครั้ง (`0 2 * * *` ประมาณ 09:00 เวลาไทย) ใน `vercel.json`
  ถ้าตั้งถี่กว่านี้ deploy จะไม่ผ่าน
- การเตือนลูกค้าก่อนรับรถและก่อนคืนรถต้องยิงถี่ (แนะนำทุก 15 นาที) จึงย้ายไปให้ GitHub Actions
  (`.github/workflows/customer-reminders.yml`) ยิง `/api/cron/customer-reminders` — ต้องตั้ง Repository secrets `CRON_SECRET` และ `SITE_URL`
  GitHub Actions อาจเลื่อนรอบได้หลายนาทีช่วงโหลดสูง
- Hobby จำกัดให้ใช้แบบไม่ใช่เชิงพาณิชย์ รายละเอียดล็อกย้อนหลังได้ 1 ชั่วโมง และมีโควตาพื้นที่ Blob จำกัด
- ถ้าอัปเกรดเป็น Pro หรือย้ายโฮสต์ จะย้าย cron ถี่กลับมาใส่ใน `vercel.json` หรือรันบนเซิร์ฟเวอร์เองก็ได้

[↑ กลับสารบัญ](#toc)

---

<a id="part-4"></a>

## ภาคที่ 4 — แผนย้าย LINE OA (ทฤษฎี)

_ที่มา: `LINE-OA-MIGRATION.md` (รวมเข้าเอกสารนี้แล้ว)_

เขียนวันที่ 9 ก.ย. 2569 · เตรียมไว้ล่วงหน้า ยังไม่ต้องทำตอนนี้
สถานะปัจจุบัน: ใช้ OA ทดสอบชื่อ **test-car-booking** (Messaging API) คู่กับ **CM Car Rent Login** (LINE Login)
ทั้งสองอยู่ใต้ Provider **car-booking-test** (id 2005442788)

---

### กฎข้อเดียวที่ต้องจำ

> **LINE User ID ผูกกับ Provider ไม่ใช่ Channel**

คนคนเดียวกันจะมี ID เดียวกันทุกแชนแนลที่อยู่ใต้ Provider เดียวกัน
แต่พอข้าม Provider ID จะเปลี่ยนทั้งชุด

ผลที่ตามมาต่อระบบเรา — `Customer.lineUserId` คือ**ตัวตนของลูกค้า** ใช้ทั้งเข้าสู่ระบบบนเว็บ
ดูประวัติการจอง และส่งแจ้งเตือน ถ้า ID เปลี่ยน ลูกค้าทุกคนจะกลายเป็นคนใหม่หมด
ประวัติการจองเดิมจะเข้าถึงไม่ได้ และแจ้งเตือนจะส่งไม่ถึง

**สรุป: ห้ามย้าย Provider เด็ดขาด** ทำอะไรก็ได้ที่อยู่ใต้ `car-booking-test` เดิม

---

### เลือกทางไหน

#### ทาง A — ใช้ OA ตัวเดิม เปลี่ยนแค่ชื่อและรูป (แนะนำ)

เหมาะเมื่อ OA ทดสอบยังไม่มีเพื่อนที่เป็นคนนอก และไม่ติดใจว่า ID เดิมเป็นชื่อสุ่ม

ทำที่ **LINE Official Account Manager** (manager.line.biz) ไม่ต้องแตะโค้ดเลย

1. เปลี่ยนชื่อ OA เป็นชื่อร้านจริง
2. เปลี่ยนรูปโปรไฟล์และภาพหน้าปก
3. ซื้อ Premium ID ถ้าต้องการ ID สวย (เช่น `@phuping`) — ถ้าซื้อ **ต้องแก้ `LINE_OA_ID` ใน `lib/contact.ts` ด้วย** เพราะโค้ดฝังค่า `@606ugqjs` ไว้เป็นค่าเริ่มต้น
4. เปลี่ยนแผนราคาถ้าจะส่งข้อความเยอะกว่าโควตาฟรี

**สิ่งที่ไม่ต้องทำเลย** — ไม่ต้องแก้ env ไม่ต้องย้าย ID ลูกค้า ไม่ต้องให้ใครแอดใหม่ เพื่อนเดิมยังอยู่ครบ

**เวลาที่ใช้** ครึ่งชั่วโมง

---

#### ทาง B — สร้าง OA ตัวใหม่ ใต้ Provider เดิม

เหมาะเมื่อ OA ทดสอบสกปรกเกินกว่าจะเอามาใช้จริง (มีข้อความทดสอบเยอะ หรือเคยเผยแพร่ผิด)

**ยังปลอดภัยเรื่อง ID** เพราะอยู่ Provider เดิม `lineUserId` ทุกค่ายังใช้ได้เหมือนเดิม
แต่มีต้นทุนหนึ่งอย่างที่เลี่ยงไม่ได้

> **ความเป็นเพื่อนผูกกับ OA ไม่ใช่ Provider**
> ลูกค้าเดิมทุกคนต้องแอด OA ตัวใหม่ ไม่งั้น push แจ้งเตือนจะโดนปฏิเสธ (403)
> ทั้งที่ ID ในฐานข้อมูลถูกต้อง

##### ขั้นตอน

**1. สร้างแชนแนล**

- LINE Developers Console → Provider `car-booking-test` → Create a new channel → **Messaging API**
- **ห้ามสร้าง Provider ใหม่**

**2. เก็บค่าจากแชนแนลใหม่**

| ค่า | อยู่ที่ | เอาไปใส่ |
|---|---|---|
| Channel secret | Basic settings | `LINE_CHANNEL_SECRET` |
| Channel access token (long-lived) | Messaging API → กด Issue | `LINE_CHANNEL_ACCESS_TOKEN` |
| Bot basic ID (`@xxxxx`) | Messaging API | `NEXT_PUBLIC_LINE_OA_ID` และ `LINE_OA_ID` ใน `lib/contact.ts` |

**3. ตั้งค่าในแชนแนลใหม่**

- **Webhook URL** = `https://<โดเมนจริง>/api/line/webhook` แล้วกด Verify ต้องขึ้น Success
- เปิด **Use webhook**
- ปิด **Auto-reply messages** และ **Greeting messages** (ไม่งั้นบอทตอบชนกับข้อความอัตโนมัติของ LINE)
- ปิด **Allow bot to join group chats** ถ้าไม่ได้ใช้แจ้งเตือนเข้ากลุ่ม

**4. LIFF — ไม่ต้องแตะ**

LIFF ผูกกับ **LINE Login channel** ซึ่งไม่ได้เปลี่ยน `NEXT_PUBLIC_LIFF_ID`
และ `NEXT_PUBLIC_LIFF_BOOKING_ID` ใช้ค่าเดิมได้

**5. Rich menu ต้องสร้างใหม่**

Rich menu ผูกกับแชนแนล ของเดิมไม่ตามมา

```
npx tsx scripts/setup-richmenu.ts
```

สคริปต์อ่าน `LINE_CHANNEL_ACCESS_TOKEN` และ `NEXT_PUBLIC_SITE_URL` จาก env
ลบเมนูเก่าทิ้งแล้วอัปโหลดใหม่พร้อมตั้งเป็นเมนูเริ่มต้นให้อัตโนมัติ
ถ้าไม่มีไฟล์ `scripts/richmenu.png` ให้รัน `python3 scripts/make-richmenu-image.py` ก่อน

**6. แอดมินต้องผูก LINE ใหม่ทุกคน**

`AdminUser.lineUserId` ยังถูกต้อง (Provider เดิม) แต่แอดมินยังไม่ได้แอด OA ใหม่
จึงส่งแจ้งเตือนไม่ถึง ให้แอดมินทุกคนแอด OA ใหม่เป็นเพื่อน แล้วทดสอบด้วยการจองหนึ่งครั้ง
ถ้าไม่เข้า ให้เข้าหน้า `/admin/users` กดสร้างรหัส 6 หลักแล้วพิมพ์ในแชท OA ใหม่

**7. `LINE_ADMIN_USER_ID` ใช้ค่าเดิมได้** — ID ไม่เปลี่ยนเพราะ Provider เดิม

**8. ชวนลูกค้าเดิมย้าย** (ถ้ามีลูกค้าจริงแล้ว)

ส่งข้อความสุดท้ายจาก OA เก่าบอกให้แอด OA ใหม่ พร้อมลิงก์
`https://line.me/R/ti/p/<Bot basic ID ใหม่>` แล้วปิด OA เก่า

**เวลาที่ใช้** ครึ่งวัน รวมทดสอบ

---

#### ทาง C — Provider ใหม่ (อย่าทำ)

ID ลูกค้าเปลี่ยนทั้งหมด ประวัติการจองทุกคนขาดจากบัญชี แจ้งเตือนส่งไม่ถึง
ต้องให้ลูกค้าทุกคนล็อกอินใหม่แล้วไล่เก็บการจองทีละใบ
ทำเฉพาะกรณีถูกบังคับจริงๆ เช่นย้ายเจ้าของบริษัท และต้องวางแผนแยกต่างหาก

---

### รายการค่า env ทั้งหมดที่เกี่ยวกับ LINE

ตรวจให้ครบทั้งใน `.env.local` (เครื่องตัวเอง) และ Vercel → Settings → Environment Variables

| ตัวแปร | มาจากแชนแนล | ทาง A | ทาง B |
|---|---|---|---|
| `LINE_CHANNEL_ACCESS_TOKEN` | Messaging API | เหมือนเดิม | **เปลี่ยน** |
| `LINE_CHANNEL_SECRET` | Messaging API | เหมือนเดิม | **เปลี่ยน** |
| `NEXT_PUBLIC_LINE_OA_ID` | Messaging API | เปลี่ยนถ้าซื้อ Premium ID | **เปลี่ยน** |
| `LINE_ADMIN_USER_ID` | — | เหมือนเดิม | เหมือนเดิม |
| `LINE_LOGIN_CHANNEL_ID` | LINE Login | เหมือนเดิม | เหมือนเดิม |
| `LINE_LOGIN_CHANNEL_SECRET` | LINE Login | เหมือนเดิม | เหมือนเดิม |
| `NEXT_PUBLIC_LIFF_ID` | LINE Login | เหมือนเดิม | เหมือนเดิม |
| `NEXT_PUBLIC_LIFF_BOOKING_ID` | LINE Login | เหมือนเดิม | เหมือนเดิม |
| `NEXT_PUBLIC_SITE_URL` | — | ต้องเป็นโดเมนจริง | ต้องเป็นโดเมนจริง |

**อย่าลืม** — ค่าที่ขึ้นต้นด้วย `NEXT_PUBLIC_` ถูกฝังตอน build ต้อง **redeploy** ถึงจะมีผล
แก้ใน Vercel เฉยๆ ไม่พอ

---

### ตอนย้ายขึ้นโดเมนจริง (ทำพร้อมกันได้)

1. ตั้ง `NEXT_PUBLIC_SITE_URL` เป็นโดเมนจริง
2. LINE Login channel → แท็บ LINE Login → **Callback URL** เพิ่ม `https://<โดเมนจริง>/api/line/callback`
3. LIFF → แก้ **Endpoint URL** ของทุก LIFF app ให้ชี้โดเมนจริง
4. Messaging API → **Webhook URL** ชี้โดเมนจริง แล้วกด Verify
5. รัน `npx tsx scripts/setup-richmenu.ts` ใหม่ เพราะปุ่มในเมนูฝัง URL ไว้
6. ตั้ง `CRON_SECRET` ใน Vercel ให้ตรงกับที่ Cron ใช้ ไม่งั้นตัวเตือนคืนรถจะถูกปฏิเสธ 401

---

### จุดที่เพิ่มมาหลังเขียนเอกสารนี้ (อัปเดต 13 ก.ย. 2569)

ฟีเจอร์ที่เพิ่มเข้ามาทีหลังและ **พึ่ง OA ตัวนี้** — ต้องไล่เช็คตอนย้ายด้วย

| ฟีเจอร์ | พึ่งอะไรของ OA | ถ้าย้ายแบบ B ต้องทำอะไร |
|---|---|---|
| การ์ดงานรับ-ส่งรถของคนขับ | push หาแอดมิน/คนขับ | ทุกคนต้องแอด OA ใหม่ ไม่งั้น push โดน 403 |
| การ์ดสลิปเข้า / เอกสารครบ | push หาแอดมิน | เหมือนกัน |
| การ์ดใบเสร็จ + ปุ่มดาวน์โหลด PDF | push หาลูกค้า + ลิงก์ https | ตรวจว่าปุ่มเปิด PDF ได้จริง |
| ข้อความ "รับรถคืนเรียบร้อย" + ปุ่มรีวิว | **deep link `line.me/R/oaMessage/<OA id>`** | **ต้องแก้ `LINE_OA_ID` ใน `lib/contact.ts`** ไม่งั้นปุ่มรีวิวพาไปหา OA เก่า |
| ข้อความแจ้งโอนเงินประกันคืน | push หาลูกค้า | ทุกคนต้องแอด OA ใหม่ |
| สรุปใบที่ยังไม่โอนรายวัน | push หาแอดมิน | เหมือนกัน |

> `LINE_OA_ID` เป็นค่าคงที่ในโค้ด (`lib/contact.ts` = `@606ugqjs`) ไม่ใช่ env
> ใช้ทั้งในฟุตเตอร์เว็บและปุ่มรีวิว — **เปลี่ยน OA เมื่อไรต้องแก้ไฟล์นี้แล้ว redeploy ทุกครั้ง**

---

### เช็คลิสต์หลังย้าย — ต้องผ่านครบ 13 ข้อ

- [ ] ทักแชท OA พิมพ์ **ไอดี** → ตอบ LINE User ID กลับมา (webhook ทำงาน)
- [ ] พิมพ์ **จองรถ** → ขึ้นการ์ดเลือกรถ จองจนจบได้ ได้การ์ดยืนยันพร้อมปุ่ม
- [ ] แอดมินได้การ์ดแจ้งเตือน "มีการจองใหม่"
- [ ] กดปุ่มในการ์ดแล้วเปิดเว็บได้ (ต้องเป็น https ไม่งั้น LINE ไม่ให้กด)
- [ ] เข้าเว็บ กด "เข้าสู่ระบบ" → กลับมาแล้วเห็นชื่อตัวเองที่หัวเว็บ
- [ ] `/my` แสดงการจองที่เพิ่งทำในแชท (พิสูจน์ว่า ID ตรงกันข้ามช่องทาง)
- [ ] อัปโหลดสลิปจากหน้าเว็บ → แอดมินได้การ์ด "ลูกค้าอัปโหลดสลิปแล้ว"
- [ ] Rich menu 6 ปุ่มขึ้นครบและกดได้ทุกปุ่ม
- [ ] มอบหมายงานรับ-ส่งรถ → คนที่รับงานได้การ์ดในแชท และกดลิงก์งานเปิดได้
- [ ] ออกใบเสร็จแล้วกด "ส่งให้ลูกค้าทาง LINE" → ได้การ์ด กดดาวน์โหลด PDF ได้ไฟล์จริง
- [ ] ปิดงานรับรถคืน → ลูกค้าได้ข้อความ พร้อมปุ่มรีวิวที่**เปิดไปหา OA ตัวใหม่** (ไม่ใช่ตัวเก่า)
- [ ] ลูกค้าแจ้งบัญชี แล้วแอดมินกดโอน → ลูกค้าได้ข้อความแจกแจงยอด
- [ ] ฟุตเตอร์เว็บแสดงไอดี OA ตัวใหม่

---

### แผนถอย

ทาง A ถอยได้ทันที เปลี่ยนชื่อกลับ
ทาง B ถอยด้วยการชี้ค่า env สามตัวกลับไปที่ OA เก่า แล้ว redeploy — **ห้ามลบ OA เก่าจนกว่าจะผ่านเช็คลิสต์ครบ**
อย่างน้อยหนึ่งสัปดาห์ค่อยลบ

[↑ กลับสารบัญ](#toc)

---

<a id="part-5"></a>

## ภาคที่ 5 — แผนย้าย LINE ไปบัญชีของบริษัท

_ที่มา: `LINE-OA-HANDOVER.md` (รวมเข้าเอกสารนี้แล้ว)_

เขียนวันที่ 9 ก.ย. 2569 · เตรียมไว้ล่วงหน้า
ต่อยอดจาก ภาคที่ 4 ซึ่งครอบคลุมกรณีเปลี่ยน OA ใต้ Provider เดิม
ฉบับนี้ว่าด้วยกรณีที่หนักกว่า — **ย้ายไปอยู่ใต้บัญชีของบริษัท**

**สถานะปัจจุบัน** ทุกอย่างอยู่ใต้ Provider `car-booking-test` (id 2005442788)
ซึ่งผูกกับ LINE Business ID ของผู้พัฒนา ไม่ใช่ของบริษัท

---

### อ่านตรงนี้ก่อนตัดสินใจ

ประเด็นทั้งหมดขึ้นกับคำถามเดียว: **Provider เปลี่ยนหรือไม่**

> Provider เป็นของ LINE Business ID บัญชีหนึ่ง และ **ย้าย Provider ข้ามบัญชีไม่ได้**
> แต่ **เพิ่มบัญชีของบริษัทเข้ามาเป็น Admin ของ Provider เดิมได้**

`LINE User ID` ผูกกับ Provider ดังนั้น

| ทางเลือก | Provider | ID ลูกค้า | ประวัติการจอง |
|---|---|---|---|
| **ทาง 1** เพิ่มบริษัทเป็น Admin ของ Provider เดิม | เดิม | ไม่เปลี่ยน | อยู่ครบ |
| **ทาง 2** บริษัทสร้าง Provider ของตัวเอง แล้วย้ายทุกอย่างไปใหม่ | **ใหม่** | **เปลี่ยนทั้งหมด** | **ขาดจากบัญชีลูกค้า** |

---

### ทาง 1 — ส่งมอบโดยไม่ย้าย Provider (แนะนำอย่างยิ่ง)

บริษัทได้สิทธิ์ควบคุมเต็มเหมือนเป็นเจ้าของ โดยไม่มีอะไรพังสักอย่าง

**ขั้นตอน**

1. บริษัทสมัคร LINE Business ID (ถ้ายังไม่มี) แล้วส่งอีเมลที่ใช้สมัครมาให้
2. LINE Developers Console → Provider `car-booking-test` → แท็บ **Roles** → **Add** อีเมลนั้นเป็น **Admin**
3. ทำแบบเดียวกันที่ **OA Manager** (manager.line.biz) → ตั้งค่า → ผู้ดูแล → เพิ่มบริษัทเป็น **ผู้ดูแลระดับสูงสุด**
4. เปลี่ยนชื่อ Provider จาก `car-booking-test` เป็นชื่อบริษัท (Settings → แก้ชื่อได้ ไม่กระทบ ID)
5. เปลี่ยนชื่อ OA / รูป / ซื้อ Premium ID ตาม ภาคที่ 4 ทาง A
6. เมื่อบริษัทพร้อม ถอดสิทธิ์ของผู้พัฒนาออกได้ (หรือลดเหลือ Tester)

**สิ่งที่ต้องแก้ในโค้ด** — ไม่มีเลย ยกเว้นซื้อ Premium ID ใหม่ ต้องแก้ `LINE_OA_ID` ใน `lib/contact.ts`

**เวลาที่ใช้** หนึ่งชั่วโมง · **ความเสี่ยง** แทบไม่มี

> ถ้าบริษัทยืนยันว่าต้องอยู่ใต้ Provider ของตัวเองเท่านั้น (นโยบายบัญชี/การเงิน)
> ค่อยไปทาง 2 — แต่ควรถามก่อนว่าทาง 1 ยอมรับได้ไหม เพราะประหยัดงานไปมาก

---

### ทาง 2 — ย้ายไป Provider ของบริษัท

#### สิ่งที่จะพังแน่นอน

1. **`Customer.lineUserId` เดิมใช้ไม่ได้ทั้งตาราง** ลูกค้าล็อกอินเว็บด้วย LINE เดิมจะกลายเป็นลูกค้าใหม่ ประวัติไม่ขึ้น
2. **`AdminUser.lineUserId` เดิมใช้ไม่ได้** แอดมินทุกคนต้องผูกใหม่ด้วยรหัส 6 หลัก
3. **แจ้งเตือนถึงลูกค้าเดิมส่งไม่ได้** push ไปที่ ID เก่าจะโดนปฏิเสธ
4. **ความเป็นเพื่อนหาย** ลูกค้าต้องแอด OA ใหม่
5. **LIFF ID เปลี่ยน** เพราะ LIFF ผูกกับ LINE Login channel ซึ่งต้องสร้างใหม่

#### จังหวะที่ควรทำ

**ทำก่อนเปิดใช้จริง** ตอนนี้ข้อมูลยังเป็นของทดสอบ ต้นทุนเท่ากับศูนย์
ถ้าเปิดใช้จริงไปแล้วค่อยย้าย ต้นทุนจะกลายเป็นการไล่ตามลูกค้าทีละคน

#### ขั้นตอน

**ระยะ 1 — เตรียม (ทำล่วงหน้าได้ ไม่กระทบระบบที่รันอยู่)**

1. บริษัทสมัคร LINE Business ID และสร้าง Provider ของตัวเอง
2. เพิ่มผู้พัฒนาเป็น Admin ของ Provider ใหม่ (ไม่งั้นตั้งค่าให้ไม่ได้)
3. ใน Provider ใหม่ สร้างสองแชนแนล **ใต้ Provider เดียวกันเท่านั้น**
   - **Messaging API** — OA ตัวจริง
   - **LINE Login** — สำหรับเข้าสู่ระบบบนเว็บและ LIFF
4. ใน LINE Login channel สร้าง LIFF app ให้ครบเท่าของเดิม (ดูจำนวนและ Endpoint URL จากของเดิม)
5. จดค่าทั้งหมดใส่ไฟล์เตรียมไว้ ยังไม่ต้องเอาขึ้น

**ระยะ 2 — ตัดสวิตช์ (เลือกเวลาที่คนใช้น้อยที่สุด)**

6. ประกาศล่วงหน้าในแชท OA เก่า อย่างน้อย 3 วัน พร้อมลิงก์แอด OA ใหม่
7. เปลี่ยนค่า env ทั้งหมดใน Vercel พร้อมกัน (ตารางด้านล่าง) แล้ว **redeploy**
8. ตั้ง Webhook URL ในแชนแนลใหม่แล้วกด Verify · เปิด Use webhook · ปิด Auto-reply และ Greeting
9. เพิ่ม Callback URL `https://<โดเมนจริง>/api/line/callback` ใน LINE Login channel ใหม่
10. รัน `npx tsx scripts/setup-richmenu.ts` สร้าง Rich menu ในแชนแนลใหม่
11. **ล้าง ID เก่าออกจากฐานข้อมูล** — ค่าที่ค้างอยู่ไม่มีประโยชน์แล้วและกันไม่ให้ระบบเข้าใจผิดว่าลูกค้าผูกบัญชีแล้ว

```sql
-- ตัดการผูก LINE ของลูกค้าทั้งหมด (การจองยังอยู่ครบ ไม่ได้ลบอะไร)
UPDATE "Customer" SET "lineUserId" = NULL;

-- แอดมินต้องผูกใหม่ด้วยรหัส 6 หลักเช่นกัน
UPDATE "AdminUser" SET "lineUserId" = NULL, "lineLinkCode" = NULL, "lineLinkExpiresAt" = NULL;
```

12. แอดมินทุกคนแอด OA ใหม่ แล้วผูกบัญชีที่ `/admin/users` (สร้างรหัส 6 หลัก → พิมพ์ในแชท)

**ระยะ 3 — พาลูกค้าเดิมกลับเข้าบัญชี**

ระบบมีทางรองรับอยู่แล้ว ไม่ต้องเขียนเพิ่ม

13. ลูกค้าแอด OA ใหม่ แล้วเปิด **ลิงก์การจองเดิมที่เคยได้รับ** (`/booking/<id>`)
14. กด "เข้าสู่ระบบด้วย LINE" แล้วกด **"เก็บเข้าบัญชีของฉัน"** → `/api/my/claim` จะย้ายการจองเข้าบัญชีใหม่ให้
15. ลูกค้าที่หาลิงก์ไม่เจอ ให้แอดมินส่งลิงก์ให้จากหน้า `/admin/bookings`

> การจองที่ไม่มีใครมาเก็บ ยังอยู่ในระบบครบและแอดมินเห็นทุกใบตามปกติ
> กระทบเฉพาะการที่ลูกค้าเปิดดูเองจากหน้า `/my` เท่านั้น

---

### ตาราง env สำหรับทาง 2 — เปลี่ยนทั้งหมดยกเว้นบรรทัดสุดท้าย

| ตัวแปร | มาจาก | ต้องเปลี่ยน |
|---|---|---|
| `LINE_CHANNEL_ACCESS_TOKEN` | Messaging API ใหม่ | ✅ |
| `LINE_CHANNEL_SECRET` | Messaging API ใหม่ | ✅ |
| `NEXT_PUBLIC_LINE_OA_ID` | Messaging API ใหม่ | ✅ |
| `LINE_LOGIN_CHANNEL_ID` | LINE Login ใหม่ | ✅ |
| `LINE_LOGIN_CHANNEL_SECRET` | LINE Login ใหม่ | ✅ |
| `NEXT_PUBLIC_LIFF_ID` | LIFF ใหม่ | ✅ |
| `NEXT_PUBLIC_LIFF_BOOKING_ID` | LIFF ใหม่ | ✅ |
| `LINE_ADMIN_USER_ID` | ID ของแอดมินใน Provider ใหม่ | ✅ (ล้างไว้ก่อน แล้วเติมหลังผูกใหม่) |
| `NEXT_PUBLIC_SITE_URL` | โดเมนจริง | ตามเดิม |

**อย่าลืม** `NEXT_PUBLIC_*` ฝังตอน build — แก้ใน Vercel แล้วต้อง redeploy
และต้องแก้ `LINE_OA_ID` ใน `lib/contact.ts` ด้วย เพราะโค้ดฝังค่าไว้เป็นค่าเริ่มต้น

---

### เช็คลิสต์หลังตัดสวิตช์ — ต้องผ่านครบ

- [ ] ทักแชท OA ใหม่ พิมพ์ **ไอดี** → ได้ ID กลับมา (webhook ทำงาน)
- [ ] พิมพ์ **จองรถ** → จองจบได้ ได้การ์ดยืนยันพร้อมปุ่ม
- [ ] แอดมินได้การ์ด "มีการจองใหม่" (พิสูจน์ว่าผูก LINE แอดมินใหม่สำเร็จ)
- [ ] เข้าเว็บ กด "เข้าสู่ระบบ" → กลับมาเห็นชื่อตัวเองที่หัวเว็บ
- [ ] `/my` แสดงการจองที่เพิ่งทำในแชท (ID ตรงกันข้ามช่องทาง)
- [ ] เปิดลิงก์การจองเก่า → เห็นปุ่ม "เก็บเข้าบัญชีของฉัน" แล้วกดได้จริง
- [ ] อัปโหลดสลิป → แอดมินได้การ์ดแจ้งเตือน
- [ ] Rich menu 6 ปุ่มขึ้นครบและกดได้
- [ ] ตัวเตือนคืนรถทำงาน (ยิง `/api/cron/reminders` พร้อม `CRON_SECRET` แล้วดูว่าส่งถึง)

---

### แผนถอย

เก็บ OA เก่าและแชนแนลเก่าไว้**อย่างน้อยหนึ่งเดือน** อย่าเพิ่งลบ

ถ้าต้องถอย — ชี้ env กลับไปชุดเดิมแล้ว redeploy แต่ **`lineUserId` ที่ล้างไปแล้วไม่กลับมาเอง**
ดังนั้นก่อนรัน SQL ล้าง ID ในข้อ 11 ให้สำรองไว้ก่อน

```sql
CREATE TABLE "CustomerLineBackup" AS
SELECT id, phone, "lineUserId" FROM "Customer" WHERE "lineUserId" IS NOT NULL;
```

ถอยเมื่อไรก็เขียนกลับได้จากตารางนี้

---

### สิ่งที่ต้องขอจากบริษัทก่อนเริ่ม

1. อีเมลที่ใช้สมัคร LINE Business ID
2. คำตอบว่ารับทาง 1 ได้ไหม (ประหยัดงานมหาศาลถ้ารับได้)
3. ถ้าจะทาง 2 — ยืนยันว่าจะทำ **ก่อน** เปิดใช้จริง
4. ชื่อ OA · รูปโปรไฟล์ · ภาพหน้าปก · Premium ID ที่ต้องการ
5. โดเมนจริงที่จะใช้

[↑ กลับสารบัญ](#toc)

---

<a id="part-6"></a>

## ภาคที่ 6 — แผนย้ายมาใช้ LINE OA ตัวจริง

_ที่มา: `LINE-OA-GO-LIVE.md` (รวมเข้าเอกสารนี้แล้ว)_

เขียนวันที่ 13 ก.ย. 2569 · ต่อจาก ภาคที่ 4 (ทฤษฎี) ฉบับนี้คือ **แผนลงมือจริง**

**ปลายทาง** ย้ายจาก OA ทดสอบ `test-car-booking` (`@606ugqjs`) มาใช้
OA จริง **Phuping Corporation `@623oohcz`** ซึ่งมีเพื่อนอยู่แล้ว 1,503 คน และเราเป็น Admin แล้ว

---

### ด่านแรก: OA นี้ต้องอยู่ใต้ Provider `car-booking-test`

นี่คือข้อเดียวที่ตัดสินว่างานนี้ง่ายหรือยาก **ต้องเช็คก่อนทำอะไรทั้งสิ้น**

`LINE User ID` ผูกกับ Provider ถ้า Messaging API ของ OA จริงไปอยู่คนละ Provider กับ
LINE Login ที่เว็บใช้อยู่ ระบบจะได้ ID คนละชุด — ลูกค้าล็อกอินบนเว็บเป็นคนหนึ่ง
แต่ push หาอีกคนหนึ่ง จับคู่กันไม่ได้เลย

**วิธีเช็ค** OA Manager (`manager.line.biz/account/@623oohcz`) → ตั้งค่า → **Messaging API**

| สิ่งที่เห็น | แปลว่า | ไปทางไหน |
|---|---|---|
| ยังไม่ได้เปิดใช้ Messaging API (มีปุ่ม "ใช้ Messaging API") | **ดีที่สุด** ยังเลือก Provider ได้ | **ทาง 1** |
| เปิดแล้ว และ Provider ชื่อ `car-booking-test` | ดี ใช้ได้เลย | **ทาง 1** (ข้ามขั้นเปิด) |
| เปิดแล้ว แต่ Provider เป็นชื่ออื่น | Provider เปลี่ยนไม่ได้ | **ทาง 2** |

---

### ทาง 1 — เปิด Messaging API ใต้ Provider `car-booking-test` (เป้าหมาย)

ได้ทุกอย่าง: เพื่อน 1,503 คนอยู่ครบ, ID ลูกค้าเดิมไม่เปลี่ยน, LIFF และ LINE Login ไม่ต้องแตะ

#### ขั้นตอน

1. **OA Manager → ตั้งค่า → Messaging API → ใช้ Messaging API**
   - เลือก Provider = **`car-booking-test`** ← จุดตายอยู่ตรงนี้ เลือกแล้วเปลี่ยนไม่ได้
2. **LINE Developers Console** → แชนแนลใหม่ที่เพิ่งโผล่มา → เก็บค่า
   - Basic settings → **Channel secret**
   - Messaging API → **Issue** channel access token (long-lived)
3. **ตั้งค่าแชนแนล**
   - Webhook URL = `https://<โดเมนจริง>/api/line/webhook` → **Verify** ต้องขึ้น Success
   - Use webhook = **เปิด**
   - Auto-reply messages / Greeting messages = **ปิด** (ไม่งั้นบอทตอบชนกับข้อความอัตโนมัติของ OA)
4. **แก้ env ที่ Vercel** (Production + Preview + Development)
   - `LINE_CHANNEL_SECRET` = ค่าใหม่
   - `LINE_CHANNEL_ACCESS_TOKEN` = ค่าใหม่
   - `NEXT_PUBLIC_LINE_OA_ID` = `@623oohcz`
5. **แก้โค้ด** `lib/contact.ts` → `LINE_OA_ID = "@623oohcz"`
   (ค่านี้ไม่ใช่ env ใช้ทั้งฟุตเตอร์เว็บและ **ปุ่มรีวิวในข้อความคืนเงินประกัน**)
6. **Redeploy**
7. **สร้าง Rich menu บน OA ใหม่** — `npx tsx scripts/setup-richmenu.ts` (อ่าน token จาก env)
8. **แอดมินทุกคนผูก LINE ใหม่** — `/admin/account` → ขอรหัสผูก → ทักหา OA ใหม่
   (ID เดิมยังใช้ได้ถ้า Provider เดิม แต่ต้องเป็นเพื่อนกับ OA ใหม่ ไม่งั้น push โดน 403)
9. **ตั้ง `LINE_ADMIN_USER_ID`** ให้ตรงกับคนที่จะรับแจ้งเตือนส่วนกลาง

#### ความจริงที่ต้องรับ แม้ทำทาง 1

- **เพื่อน 1,503 คนเรายัง push หาไม่ได้จนกว่าเขาจะทักมาหรือล็อกอินบนเว็บ**
  เพราะเรายังไม่มี `userId` ของเขาในฐานข้อมูล ไม่ใช่ข้อผิดพลาด เป็นวิธีทำงานของ LINE
  คนเก่าจะทยอยเข้าระบบเองเมื่อใช้บริการครั้งถัดไป
- ลูกค้าที่เคยเป็นเพื่อนกับ OA **ทดสอบ** เท่านั้น (ไม่กี่คน) ต้องแอด OA จริงเพิ่ม

---

### ทาง 2 — ถ้า Messaging API ถูกเปิดใต้ Provider อื่นไปแล้ว

Provider ย้ายไม่ได้ จึงต้องเลือกอย่างใดอย่างหนึ่ง

**2ก. ย้ายทั้งชุดไปอยู่ Provider ของ OA จริง** (แนะนำถ้าจำเป็นต้องเลือก)

- สร้าง **LINE Login channel ใหม่** + **LIFF app ใหม่ 2 ตัว** ใต้ Provider นั้น
- แก้ env: `LINE_LOGIN_CHANNEL_ID`, `LINE_LOGIN_CHANNEL_SECRET`, `NEXT_PUBLIC_LIFF_ID`, `NEXT_PUBLIC_LIFF_BOOKING_ID` + สามตัวของ Messaging API
- **`Customer.lineUserId` เดิมใช้ไม่ได้ทั้งหมด** ต้องล้างค่าทิ้ง (ตั้งเป็น null) แล้วให้ลูกค้าล็อกอินใหม่
  — ตอนนี้ในระบบมีลูกค้าที่ผูก LINE จริงอยู่ไม่กี่ราย **ยิ่งย้ายเร็วยิ่งเจ็บน้อย**
- ประวัติการจองไม่หาย (ผูกกับเบอร์โทร ไม่ใช่ LINE ID) แต่ลูกค้าต้องล็อกอินใหม่ถึงจะเห็นในบัญชี

**2ข. ใช้ OA ทดสอบเดิมต่อไป แล้วเปลี่ยนชื่อ/รูปให้เป็นร้าน** — เร็วที่สุด ไม่มีอะไรพัง
แต่ทิ้งเพื่อน 1,503 คนของ OA จริง

---

### เรื่องที่ต้องคุยก่อนกดปุ่ม: โควตาข้อความ

หน้า OA Manager ตอนนี้ขึ้น **14,700 / 15,000 ข้อความ**

ข้อความที่ระบบเราส่ง (การ์ดงานคนขับ, แจ้งลูกค้า, ใบเสร็จ, คืนเงินประกัน) **นับรวมในโควตาเดียวกันกับ broadcast**
ถ้าโควตาเต็ม **ข้อความของระบบจะส่งไม่ออก** และลูกค้าจะไม่ได้รับแจ้งเตือนใด ๆ โดยไม่มี error ให้เห็นบนเว็บ

ประเมินคร่าว ๆ: หนึ่งการจองใช้ราว **6-10 ข้อความ** ตลอดวงจร (ยืนยันจอง → การ์ดงาน 2 ใบ → รับรถคืน → ใบเสร็จ → คืนเงินประกัน)
100 การจอง/เดือน ≈ 600-1,000 ข้อความ

**ที่ต้องทำ**

- ดูว่าเดือนนี้เหลือโควตาเท่าไร ก่อนย้ายมาใช้จริง
- ลดความถี่ broadcast หรืออัปแพ็กเกจถ้าจะยิง broadcast ต่อ
- ระบบออกแบบมาประหยัดอยู่แล้ว (ไม่แจ้งตอนกดจอง แจ้งตอนมีสลิปเท่านั้น, สรุปใบค้างโอนวันละครั้ง)

---

### เช็คลิสต์หลังย้าย — ต้องผ่านครบก่อนปิด OA ทดสอบ

- [ ] ทักแชท OA จริง พิมพ์ **ไอดี** → ตอบ LINE User ID กลับมา (webhook ทำงาน)
- [ ] พิมพ์ **จองรถ** → จองจนจบในแชทได้
- [ ] แอดมินได้การ์ด "มีการจองใหม่" / "ลูกค้าอัปโหลดสลิปแล้ว"
- [ ] กดปุ่มในการ์ดแล้วเปิดเว็บได้ (ต้องเป็น https)
- [ ] เข้าเว็บ กดเข้าสู่ระบบด้วย LINE → เห็นชื่อตัวเองที่หัวเว็บ
- [ ] `/my` แสดงการจองที่เพิ่งทำในแชท (**พิสูจน์ว่า ID ตรงกันข้ามช่องทาง — ข้อสำคัญที่สุด**)
- [ ] Rich menu 6 ปุ่มขึ้นครบและกดได้ทุกปุ่ม
- [ ] มอบหมายงานรับ-ส่งรถ → คนขับได้การ์ด กดลิงก์งานเปิดได้
- [ ] ออกใบเสร็จ → ส่งเข้า LINE ได้ กดดาวน์โหลด PDF ได้ไฟล์จริง
- [ ] ปิดงานรับรถคืน → ลูกค้าได้ข้อความ **และปุ่มรีวิวเปิดไปหา OA จริง** ไม่ใช่ตัวทดสอบ
- [ ] แอดมินกดโอนเงินประกัน → ลูกค้าได้ข้อความแจกแจงยอด
- [ ] ฟุตเตอร์เว็บแสดง `@623oohcz`

---

### แผนถอย

ชี้ `LINE_CHANNEL_SECRET`, `LINE_CHANNEL_ACCESS_TOKEN`, `NEXT_PUBLIC_LINE_OA_ID` กลับไปที่ OA ทดสอบ
แล้ว revert `lib/contact.ts` + redeploy — ใช้เวลาไม่เกิน 10 นาที

**ห้ามลบ OA ทดสอบจนกว่าจะผ่านเช็คลิสต์ครบและใช้งานจริงมาแล้วอย่างน้อย 1 สัปดาห์**

[↑ กลับสารบัญ](#toc)

---

<a id="part-7"></a>

## ภาคที่ 7 — เชื่อมปฏิทิน Google

_ที่มา: `GOOGLE-CALENDAR.md` (รวมเข้าเอกสารนี้แล้ว)_

### อาการ "เชื่อมแล้วหลุดเองทุกไม่กี่วัน"

ไม่ใช่บั๊กในโค้ด แต่เป็นกฎของ Google

> **OAuth consent screen ที่อยู่สถานะ Testing → refresh token หมดอายุใน 7 วันเสมอ**

พอหมดอายุ การขอ access token ใหม่จะได้ `invalid_grant` กลับมา
ระบบจึงขึ้นว่า "ปฏิทินไม่ผ่าน · สิทธิ์เชื่อมปฏิทินหมดอายุแล้ว"

#### วิธีแก้ให้อยู่ถาวร (ต้องทำในคอนโซล ไม่ใช่ในโค้ด)

1. เปิด https://console.cloud.google.com
2. เลือกโปรเจกต์ที่สร้าง OAuth client ไว้ (ตัวเดียวกับที่อยู่ใน `GOOGLE_OAUTH_CLIENT_ID`)
3. เมนู **APIs & Services → OAuth consent screen**
4. ดูช่อง **Publishing status**
   - ขึ้น **Testing** → กด **PUBLISH APP** แล้วยืนยัน เปลี่ยนเป็น *In production*
   - หรือถ้าโปรเจกต์อยู่ใน Google Workspace ขององค์กร เปลี่ยน **User type** เป็น **Internal** ก็ได้ผลเดียวกัน และไม่ต้องผ่านการตรวจสอบใดๆ
5. ให้แอดมินทุกคนเข้าหน้า **บัญชีของฉัน** กด **ตัดการเชื่อม** แล้ว **เชื่อมใหม่** หนึ่งรอบ
   — token เดิมที่ตายไปแล้วไม่ฟื้นเอง

หลังจากนั้น refresh token จะอยู่ถาวร จนกว่าจะเข้าเงื่อนไขข้อใดข้อหนึ่ง

- ผู้ใช้กดถอนสิทธิ์เองที่หน้า Google Account
- เปลี่ยนรหัสผ่านบัญชี Google
- ไม่มีการใช้งานเลยเกิน 6 เดือน
- แอปขอ token ใหม่ให้ผู้ใช้คนเดิมเกิน 100 ครั้ง (ตัวเก่าสุดจะถูกไล่ออก)

#### ถ้ากด Publish แล้ว Google ขอ verification

scope ที่ระบบใช้คือ `calendar.app.created` ซึ่งแตะได้เฉพาะปฏิทินที่แอปสร้างเอง
เข้าไม่ถึงปฏิทินอื่นของผู้ใช้เลย ปกติจึงไม่เข้าข่ายต้องยื่นตรวจ
ถ้า Google ขอจริง ให้ใช้ทาง **Internal** แทน หรือส่งเรื่องมาปรึกษาก่อนยื่น

---

### สาเหตุอื่นที่ทำให้ "เหมือนหมดอายุ" ทั้งที่ไม่ใช่

**`GOOGLE_TOKEN_ENC_KEY` ไม่ตรงกัน** — refresh token ถูกเข้ารหัสด้วยคีย์นี้ก่อนเก็บลงฐานข้อมูล
ถ้าค่าในเครื่องตัวเองกับบน Vercel เป็นคนละค่า จะถอดรหัสไม่ออก แล้วขึ้นอาการเหมือน token เสีย
ตรวจว่าเป็นค่าเดียวกันทั้งสองที่ และ **ห้ามเปลี่ยนคีย์นี้หลังมีคนเชื่อมปฏิทินแล้ว**
ถ้าจำเป็นต้องเปลี่ยน ทุกคนต้องเชื่อมใหม่หมด

---

### ตาข่ายรองรับที่ระบบทำให้อัตโนมัติ

**1. รู้ทันทีที่หลุด ไม่ต้องรอให้งานพัง**

เดิมระบบรู้ว่าปฏิทินหลุดก็ต่อเมื่อมอบหมายงานแล้ว sync ไม่ผ่าน ตอนนี้เมื่อเจอ `invalid_grant`
จะตัดสถานะการเชื่อมทิ้งแล้ว **ส่ง LINE บอกเจ้าตัวทันที** พร้อมลิงก์ไปหน้าบัญชีของฉัน

แยกจาก error ชั่วคราวอย่างเน็ตล่มหรือ Google ล่ม ซึ่งจะไม่ตัดการเชื่อม เพราะหายเองได้

**2. ตรวจล่วงหน้าทุกสัปดาห์**

`/api/cron/google-health` ทำงานทุกวันจันทร์ตี 3 (ตั้งไว้ใน `vercel.json`)
ไล่ต่ออายุ token ของแอดมินทุกคนที่เชื่อมไว้ ใครหลุดจะได้รับ LINE แจ้งก่อนมีงานเข้า

เรียกเองเพื่อทดสอบได้

```
curl -H "Authorization: Bearer <CRON_SECRET>" https://<โดเมน>/api/cron/google-health
```

**3. ชื่อปฏิทินแก้ตัวเอง**

ชื่อปฏิทินปัจจุบันคือ **งานรับส่งรถ PHUPING** (ค่าคงที่ `CALENDAR_NAME` ใน `lib/google-calendar.ts`)
ปฏิทินที่สร้างไว้ก่อนหน้าจะถูกเปลี่ยนชื่อให้เองทั้งตอนเชื่อมใหม่และตอน cron รายสัปดาห์
ไม่ต้องให้ใครไปแก้ในปฏิทินทีละคน

**4. เชื่อมใหม่แล้วใช้ปฏิทินใบเดิม**

ตอนตัดการเชื่อม ระบบเก็บ `googleCalendarId` ไว้ พอเชื่อมใหม่จึงกลับไปใช้ปฏิทินใบเดิม
ไม่สร้างใบใหม่ทุกครั้งที่หลุด งานเก่าจึงไม่กระจายอยู่หลายปฏิทิน

[↑ กลับสารบัญ](#toc)

---

<a id="part-8"></a>

## ภาคที่ 8 — เชื่อมระบบกับเพจ Facebook

_ที่มา: `FACEBOOK-PAGE.md` (รวมเข้าเอกสารนี้แล้ว)_

ค้นข้อมูล 13 ก.ย. 2569 · เพจ: Phuping Corporation (`profile.php?id=61579645271293`)

**ข้อสรุป: ไม่ทำเป็นช่องทางจองที่สอง — ใช้เพจเป็นปากทางแล้วส่งต่อเข้า LINE**

---

### 1. คำถามที่ตั้งต้น

บริษัทมีเพจ Facebook อยู่แล้วและมีลูกค้าทักเข้ามา คำถามคือควรต่อ Messenger
เข้าระบบจองแบบเดียวกับ LINE OA หรือไม่

### 2. สิ่งที่ Messenger Platform ทำได้

- **ฟรี** ไม่มีค่าใช้จ่ายรายข้อความสำหรับการตอบในกรอบเวลาปกติ
- ผูก webhook เข้าระบบได้ สถาปัตยกรรมเหมือน LINE — โครงของ `app/api/line/webhook/route.ts` ใช้เป็นแม่แบบได้เกือบทั้งหมด
- มีเมนูค้างด้านล่าง (Persistent Menu) เทียบได้กับ rich menu
- มีการ์ด/ปุ่ม (Generic Template, Quick Reply) เทียบได้กับ Flex แต่ปรับแต่งได้น้อยกว่า
- ต้องขอสิทธิ์ `pages_messaging`, `pages_show_list`, `pages_manage_metadata`, `pages_read_engagement`

### 3. ตัวขวางที่ทำให้ไม่คุ้ม

#### 3.1 ส่งแจ้งเตือนเองไม่ได้ (ตัวตัดสิน)

Messenger ให้ตอบได้เฉพาะใน **24 ชั่วโมง** หลังลูกค้าทักมา

เดิมมี message tag ให้ยิงนอกกรอบเวลาได้ แต่ **ตั้งแต่ 27 เม.ย. 2026 Meta ปิดไปแล้ว** —
`CONFIRMED_EVENT_UPDATE`, `ACCOUNT_UPDATE`, `POST_PURCHASE_UPDATE` ตอบกลับเป็น error 100

สิ่งที่ระบบเราส่งทุกวันจึงยิงผ่าน Messenger ไม่ได้:

- ยืนยันการจอง / อนุมัติคำขอรถพาร์ทเนอร์
- เตือนก่อนถึงวันรับรถ
- แจ้งว่าคนส่งรถกำลังออกเดินทาง
- เตือนคืนรถ · ใบเสร็จ · แจ้งคืนเงินประกัน

ทางเลือกที่เหลือ: Human Agent tag (7 วัน แต่ต้องเป็น **คน** พิมพ์ ไม่ใช่ระบบยิง)
หรือ Utility Messages ซึ่งเป็นเทมเพลตที่ต้องขออนุมัติและ **เสียเงินรายข้อความ**

LINE ไม่มีข้อจำกัดนี้ — push ได้ตลอดถ้าเป็นเพื่อนกัน (จำกัดแค่โควตารายเดือน)

#### 3.2 ไม่มีของเทียบเท่า LIFF

จุดแข็งของระบบคือ LINE Login ผูก `lineUserId` กับ `Customer` แล้วเปิดฟอร์มจองใน LIFF ได้เลย
ฝั่ง Messenger ต้องเปิด webview + Facebook Login แยก ซึ่งต้องผ่าน **App Review** และ
**Business Verification** ของ Meta (ส่งเอกสารบริษัท ใช้เวลาเป็นสัปดาห์)

#### 3.3 ระบบสองช่องทางแปลว่าต้องดูแลสองชุด

การ์ด ข้อความ เมนู และ flow ทั้งหมดต้องมีสองเวอร์ชัน และต้องรู้ว่าลูกค้าคนเดียวกัน
ที่ทักมาทั้งสองทางคือคนเดียวกัน (ระบบผูก `Customer` กับ `lineUserId` อยู่)

### 4. แนวทางที่เลือก — "ตอบรับแล้วส่งต่อ"

ลงแรงน้อย ไม่ติดข้อจำกัดข้อไหนเลย เพราะทุกอย่างเกิดในกรอบ 24 ชม.

1. ลูกค้าทักเพจ → ระบบตอบอัตโนมัติทันที พร้อมการ์ด "เช็ครถว่าง / ดูราคา"
   และปุ่มใหญ่ **"จองผ่าน LINE"** ลิงก์ไป `@623oohcz`
2. ตั้ง Persistent Menu ของเพจให้มีปุ่มเดียวกัน
3. การแจ้งเตือนทั้งหมดยังเดินผ่าน LINE เหมือนเดิม

**เหตุผล:** ถ้าปล่อยให้ลูกค้าจองจบใน Messenger ได้ ระบบจะเตือนอะไรเขาไม่ได้เลยหลัง 24 ชม.
ซึ่งแย่กว่าไม่มีช่องทางนั้นตั้งแต่แรก

### 5. สิ่งที่ทำไปแล้วกับเพจ (ไม่ต้องใช้ API)

- ลิงก์ชวนรีวิวเพจในการ์ดต้อนรับตอนแอดเพื่อน LINE และหลังลูกค้าคืนรถ
- ค่าคงที่อยู่ที่ `lib/contact.ts` → `FACEBOOK_PAGE`, `FACEBOOK_REVIEW_URL`
- ใช้ `forLineBrowser(url)` ต่อท้าย `openExternalBrowser=1` เพราะเบราว์เซอร์ในแอป LINE
  เปิดหน้า Facebook ไม่ขึ้น ต้องบังคับให้เด้งออกไปเบราว์เซอร์เครื่อง

### 6. ถ้าวันหนึ่งจะทำจริง ต้องเตรียมอะไร

- [ ] Business Verification ของบริษัทใน Meta Business Suite (ทำล่วงหน้าได้ ใช้เวลานาน)
- [ ] สร้าง Meta App + ขอสิทธิ์ `pages_messaging` แล้วผ่าน App Review
- [ ] `FB_PAGE_ACCESS_TOKEN`, `FB_APP_SECRET`, `FB_VERIFY_TOKEN` ใน env
- [ ] endpoint `app/api/facebook/webhook/route.ts` — ตรวจ `X-Hub-Signature-256` ด้วย `FB_APP_SECRET`
      (เทียบเท่าการตรวจ `X-Line-Signature` ที่ทำอยู่)
- [ ] ตัดสินใจว่าจะผูกตัวตนลูกค้าอย่างไร ถ้ายังไม่ทำ Facebook Login

### แหล่งอ้างอิง

- https://developers.facebook.com/documentation/business-messaging/messenger-platform/overview
- https://developers.facebook.com/documentation/business-messaging/messenger-platform/send-messages
- https://developers.facebook.com/documentation/business-messaging/messenger-platform/policy

[↑ กลับสารบัญ](#toc)

---

<a id="part-9"></a>

## ภาคที่ 9 — โทนสีแบรนด์

_ที่มา: `BRAND-COLORS.md` (รวมเข้าเอกสารนี้แล้ว)_

บริษัทส่งมาวันที่ 6 ก.ย. 2569 — **บันทึกไว้ก่อน ยังไม่ได้นำไปใช้ในระบบ**
ตอนนี้เว็บยังใช้โทนกรมท่า + ทองเดิมอยู่

### ค่าสี

| ชื่อ | HEX | RGB | CMYK | บทบาทที่แนะนำ |
|---|---|---|---|---|
| Deep Emerald Green | `#1e5841` | 30 88 65 | 85 39 75 38 | สีหลัก — หัวเว็บ ปุ่มหลัก หัวข้อ |
| Antique Gold | `#b08d57` | 176 141 87 | 27 39 68 16 | สีรอง — เส้นคั่น ไอคอน ตัวอักษรใหญ่ |
| Ivory Cream | `#f5f0e1` | 245 240 225 | 5 5 14 0 | พื้นหลังหน้าเว็บ |
| Pale Gold | `#d9c29b` | 217 194 155 | 16 22 42 2 | พื้นอ่อน การ์ด ขอบ |

### ค่าอัตราความต่างของสี (ตรวจแล้ว)

ตัวเลขนี้คือ contrast ratio ตามมาตรฐาน WCAG — ตัวอักษรปกติต้องได้ **4.5:1 ขึ้นไป**
ตัวอักษรใหญ่ (18pt+ หรือ 14pt ตัวหนา) ต้องได้ **3:1 ขึ้นไป**

| คู่สี | ค่า | ใช้ได้ไหม |
|---|---|---|
| เขียวเข้ม บนขาว | 8.31:1 | ✅ ผ่านทุกขนาด |
| เขียวเข้ม บนครีม | 7.29:1 | ✅ ผ่านทุกขนาด |
| ขาว บนเขียวเข้ม | 8.31:1 | ✅ ผ่านทุกขนาด |
| ครีม บนเขียวเข้ม | 7.29:1 | ✅ ผ่านทุกขนาด |
| Pale Gold บนเขียวเข้ม | 4.80:1 | ✅ ผ่านทุกขนาด |
| **Antique Gold บนขาว** | 3.09:1 | ⚠️ ตัวอักษรใหญ่เท่านั้น |
| **Antique Gold บนครีม** | 2.71:1 | ❌ อ่านยาก |
| **Antique Gold บนเขียวเข้ม** | 2.69:1 | ❌ อ่านยาก |
| **Pale Gold บนขาว** | 1.73:1 | ❌ ใช้เป็นพื้นเท่านั้น |

### ข้อสรุปตอนนำไปใช้

1. **เขียวเข้ม `#1e5841` เป็นสีอักษรและปุ่มหลัก** — ปลอดภัยทุกกรณี
2. **ทองทั้งสองตัวห้ามใช้เป็นสีตัวอักษรเล็ก** ใช้เป็นเส้นคั่น ขอบ พื้นอ่อน ไอคอน หรือหัวข้อใหญ่
3. อยากได้ตัวอักษรสีทองที่อ่านได้ ต้องทำทองเข้มขึ้นอีกเวอร์ชัน (ประมาณ `#7a5f2e` ขึ้นไป) ไว้ใช้เฉพาะตัวหนังสือ
4. ครีม `#f5f0e1` เป็นพื้นหน้าเว็บ ใช้ขาวเป็นพื้นการ์ดให้ตัดกัน
5. สีสถานะ (เขียวผ่าน / เหลืองรอ / แดงไม่ผ่าน) ควรคงไว้ตามเดิม อย่าเปลี่ยนเป็นโทนแบรนด์
   ไม่งั้นเขียวแบรนด์กับเขียว "สำเร็จ" จะแยกกันไม่ออก

[↑ กลับสารบัญ](#toc)

---

<a id="part-10"></a>

## ภาคที่ 10 — ผลตรวจ UX/UI รอบแรก

_ที่มา: `UXUI-REVIEW.md` (รวมเข้าเอกสารนี้แล้ว)_

ตรวจวันที่ 7 ก.ย. 2569 · ครอบคลุม 51 ไฟล์ (หน้าลูกค้า · หน้า LIFF/LINE · หลังบ้าน · คอมโพเนนต์ร่วม)

เกณฑ์ที่ใช้: กฎระบบสีใน `app/globals.css`, ตาราง contrast ใน ภาคที่ 9, WCAG AA,
เกณฑ์พื้นที่กด 44px, ความพร้อมของระบบสองภาษาใน `lib/i18n.ts`

**หมายเหตุความน่าเชื่อถือ** — ข้อที่ทำเครื่องหมาย ✔ ผมเปิดไฟล์ยืนยันเองแล้ว
ข้ออื่นมาจากการอ่านไฟล์ทั้งฉบับ ควรเช็คหน้าจอจริงอีกครั้งก่อนแก้

---

### สรุปสั้น

1. **มี 3 บั๊กที่ทำให้ผู้ใช้ทำงานไม่จบ** ไม่ใช่เรื่องความสวยงาม — สลิปถูกปฏิเสธแล้วส่งใหม่ไม่ได้,
   ระบบกันจองซ้อนในหน้า LIFF ไม่ทำงานเลย, แดชบอร์ดหลังบ้านแสดงสถานะการจองผิด
2. **โหมดมืดเสร็จราว 80%** ที่เหลือคือ `bg-slate-900` + `text-white` จำนวน 12 จุด
   ซึ่งตรงกับ "ปุ่มหลัก" ของหน้าสำคัญเกือบทุกหน้า พอสลับโหมดจะเป็นขาวบนขาว กดไม่ได้
3. **สีม่วง `violet` เป็นหลุมในระบบสี** ใช้อยู่ 24 จุดแต่ไม่ได้ประกาศใน `globals.css` เลย
   จึงไม่สลับตามโหมดและหลุดจากโทนเขียว-ทอง
4. **การกระทำที่ย้อนกลับไม่ได้ยังกดง่ายเกินไป** ยกเลิกการจอง ปฏิเสธสลิป ลบผู้ใช้ — คลิกเดียวจบ
   ไม่มีการยืนยัน และหลายปุ่มไม่มีสถานะ "กำลังส่ง" ทำให้แอดมินกดซ้ำ
5. **สองภาษาเป็นช่องว่างเชิงระบบ** มีหน้าเดียวในเว็บที่เรียก `dict()` คือหน้าแรก
   ลูกค้ากด EN แล้วกดต่อไปหน้าที่สองก็เจอภาษาไทยทันที (~240 จุดที่ยังไม่ได้แปล)

---

### P0 — บั๊กที่ทำให้ผู้ใช้ทำงานไม่จบ

#### 1. ✔ สลิปถูกปฏิเสธแล้วลูกค้าส่งใหม่ไม่ได้เลย

`app/booking/[id]/page.tsx:286`

```tsx
{!booking.deposit && booking.status === "PENDING_DEPOSIT" && (<SlipUpload … />)}
```

เมื่อแอดมินกด "ปฏิเสธสลิป" แถว deposit ถูกสร้างแล้วด้วยสถานะ `REJECTED`
เงื่อนไข `!booking.deposit` จึงเป็นเท็จ **การ์ดอัปโหลดหายไปทั้งใบ**
เหลือแค่ข้อความบรรทัด 318 ว่า "กรุณาติดต่อแอดมินที่ LINE @606ugqjs" ซึ่งเป็นข้อความเปล่า กดไม่ได้

ลูกค้าที่โอนเงินแล้วแต่ถ่ายสลิปไม่ชัด จึงไปต่อไม่ได้ในเว็บ ต้องทักแชทเอง

**แก้:**
```tsx
{(!booking.deposit || booking.deposit.status === "REJECTED")
  && booking.status === "PENDING_DEPOSIT" && (<SlipUpload … />)}
```
และทำ LINE ID บรรทัด 320 ให้เป็นปุ่มลิงก์ (มี `lineAddFriendUrl()` ใน `app/my/MyLogin.tsx:132` อยู่แล้ว)

#### 2. ✔ ระบบกันจองซ้อนในหน้า LIFF ไม่ทำงานเลย

`app/line/book/page.tsx:125` ไม่ส่ง prop `busySpans` ให้ `<LiffBooking>`
ส่วน `LiffBooking.tsx:70` ตั้งค่าเริ่มต้นเป็น `[]` — จึงไม่มี error ให้เห็น แต่กลไกตายเงียบทั้งชุด

เทียบกับหน้าเว็บปกติที่ทำถูก: `app/cars/[id]/book/page.tsx:38` เรียก `getBusySpans(car.id, 120)` แล้วส่งที่บรรทัด 66

ผลที่ตามมาในหน้า LIFF:
- `timeChoicesFor` (`:172-173`) ไม่มีเวลาไหนขึ้นว่า "รถไม่ว่าง"
- `rangeBusy` (`:174`) คืน `false` ตลอด
- คำเตือนคาบเวลา (`:561-565`) ไม่เคยแสดง

ลูกค้าที่จองจากแชทเลือกเวลาที่รถยังอยู่กับคนอื่นได้ แล้วไปเด้ง error จาก API ทีหลัง
ขณะที่ลูกค้าที่จองผ่านเว็บถูกกันไว้ตั้งแต่ต้น — **สองช่องทางให้ผลต่างกัน**

**แก้:** เพิ่มใน `app/line/book/page.tsx`
```tsx
const busySpans = await getBusySpans(car.id, 120);
// แล้วส่ง busySpans={busySpans} ที่บรรทัด 125
```

#### 3. ✔ แดชบอร์ดหลังบ้านแสดงสถานะการจองผิด

`app/admin/page.tsx:161-166` เขียนตาราง `statusLabel` ขึ้นใหม่เอง และ **ขาด `REQUESTED` กับ `REJECTED`**
ส่วน fallback บรรทัด 246 คือ `statusLabel.PENDING_DEPOSIT`

ผลคือการจองที่สถานะ "รอเช็คกับเจ้าของรถ" (`REQUESTED`) จะแสดงว่า **"รอตรวจสลิป"**
แอดมินไปนั่งรอสลิปที่ลูกค้าไม่มีทางส่ง เพราะยังไม่ได้รับอนุมัติให้จอง

**แก้:** ลบบรรทัด 161-166 ทิ้ง แล้ว `import { STATUS_LABEL, STATUS_CLASS } from "@/lib/booking-status"`
(หน้า `app/admin/bookings/page.tsx:452-453` ทำถูกอยู่แล้ว ใช้เป็นแบบอย่าง)

---

### P0 — โหมดมืด: ปุ่มหลักหายทั้งระบบ

#### 4. ✔ `bg-slate-900` + `text-white` — 12 จุด

โหมดมืด `--color-slate-900` = `#f2f5f3` (เกือบขาว) เพราะสเกลถูกสลับให้เป็น**สีตัวอักษร**
แต่โค้ดยังใช้เป็น**พื้นปุ่ม** คู่กับ `text-white` → ขาวบนขาว contrast 1.05:1 อ่านไม่ออกเลย

| ไฟล์:บรรทัด | จุดที่พัง |
|---|---|
| `components/AssignSubmit.tsx:24` | **ปุ่ม "มอบหมายและแจ้งทาง LINE"** — ปุ่มหลักของงานประจำวัน |
| `app/admin/bookings/page.tsx:427` | ชิปตัวกรองที่เลือกอยู่ → ไม่รู้ว่ากรองหมวดไหน |
| `app/cars/page.tsx:140` | ปุ่มเรียงลำดับที่เลือกอยู่ (หน้าลูกค้า) |
| `app/line/connect/ConnectLine.tsx:202, 220` | เลขขั้นตอน 1 และ 2 หายทั้งเลข |
| `app/admin/audit/page.tsx:41, 211` | ชิปตัวกรอง + ปุ่ม "กรอง" |
| `app/admin/cars/[id]/rates/page.tsx:235` | ปุ่มบันทึกช่วงราคา |
| `app/admin/after-hours/page.tsx:364` | ปุ่ม "เพิ่ม" ช่วงเวลา |
| `app/admin/account/page.tsx:352` | ปุ่มเชื่อมต่อ Google Calendar |
| `app/admin/layout.tsx:50`, `app/admin/users/page.tsx:333, 345` | วงกลมตัวอักษรย่อ + ป้าย "ผู้ดูแลระบบ" |

**แก้:** ปุ่ม → `bg-blue-600 hover:bg-blue-700 text-white` (เฉดกลางเป็นพื้นปุ่มทั้งสองโหมด)
วงกลม/ป้าย → `bg-panel text-white` (โทเคนไม่สลับ)

#### 5. ✔ ปุ่ม "จองรถเลย" ในหัวเว็บ อ่านไม่ออกในโหมดมืด

`components/SiteHeader.tsx:192` และ `:284` — `bg-amber-500 text-white`
โหมดมืด `amber-500` = `#c9a978` (ทองอ่อน) คู่ตัวอักษรขาว = contrast **2.1:1** (เกณฑ์ 4.5:1)

เป็นปุ่มที่สำคัญที่สุดในหัวเว็บ

**แก้:** `bg-amber-500 text-ink` (ทองคู่ตัวอักษรเข้ม ได้ 8.8:1 ทั้งสองโหมด)
จุดเดียวกัน `app/page.tsx:332` (เลขขั้นตอน 1-4) ก็ต้องแก้ด้วย

#### 6. ✔ ปุ่ม CTA หน้าแรก กลายเป็นดำบนดำตอนเอาเมาส์ชี้

`app/page.tsx:168` และ `:368` — `bg-gold-fixed hover:bg-amber-200 text-ink`
`gold-fixed` ไม่สลับ (ถูกแล้ว) แต่ `amber-200` สลับ → โหมดมืดเป็น `#3d3421` (น้ำตาลเข้ม)
คู่ `text-ink` = `#0d2b1f` → contrast 1.4:1

**แก้:** `hover:bg-gold-fixed/85` หรือประกาศ `--color-gold-fixed-hover` เพิ่มในชุดโทเคนไม่สลับ

#### 7. ✔ ป้ายเครื่องหมายถูกในรูปใหญ่

`app/page.tsx:149` — `bg-gold-fixed/90 text-blue-900`
โหมดมืด `blue-900` = `#c4eedd` (เขียวมิ้นต์สว่าง) บนพื้นทองอ่อน → เครื่องหมายถูกหาย

**แก้:** `text-ink`

#### 8. ปุ่มสลับโหมดและปุ่มภาษา มองไม่เห็นบนหัวเว็บโปร่งใส

`components/ThemeToggle.tsx:49` และ `components/LangToggle.tsx:29,40`
ใช้คลาสตายตัว `border-slate-200 text-slate-500` แต่บนหน้าแรกก่อนเลื่อน
หัวเว็บโปร่งใสทับรูปเขียวเข้ม (`SiteHeader.tsx:121-122`) → ไอคอนเทาจมหายในภาพ

สองตัวนี้เป็นคอมโพเนนต์เดียวที่ยังไม่รับ prop `tone` แบบ `Brand`

**แก้:** ส่ง `over` ลงไปแล้วสลับเป็น `border-white/25 text-white hover:bg-white/10`
ให้เหมือนปุ่มเมนูที่ `SiteHeader.tsx:208`

#### 9. ✔ สีม่วง `violet` — 24 จุดที่หลุดจากระบบสี

`grep violet app/globals.css` = **0** แต่ใช้อยู่ 24 จุด จึงเป็นม่วง Tailwind เดิม
ไม่มีค่าโหมดมืด และตัดกับโทนเขียว-ทองอย่างชัดเจน

จุดที่เห็นชัดสุด: `lib/booking-status.ts:18` (`STATUS_CLASS.REQUESTED`) ซึ่งกระจายไปทุกที่ที่แสดงป้ายสถานะ,
แผงใหญ่ที่ `app/admin/bookings/page.tsx:504-543` และ `app/admin/partners/page.tsx:155-163`
(`bg-violet-50` = `#f5f3ff` เป็นแผงขาวอมม่วงสว่างจ้ากลางหน้าจอมืด),
ปุ่มหลัก `components/AddPartnerForm.tsx:451`

**แก้ (เลือกทางเดียว):**
- **ทางที่แนะนำ** — เลิกใช้ violet ให้สถานะ "รออนุมัติ/รถพาร์ทเนอร์" ใช้ทอง
  (`bg-amber-50 text-amber-700 border-amber-200`) แล้วเลื่อน "รอตรวจสลิป" ไปใช้ `blue-50/700`
  แก้ที่ `lib/booking-status.ts` และ `lib/assignments.ts` เป็นหลัก ที่เหลือไล่ตาม
- หรือประกาศสเกล violet ใน `globals.css` ทั้งสองโหมดให้เข้าโทน (ม่วงอมเทาอุ่น)

---

### P1 — การกระทำที่ย้อนกลับไม่ได้

#### 10. ปุ่มที่ส่งข้อความ LINE หาลูกค้าทันที ไม่มีการยืนยัน

`app/admin/bookings/page.tsx:641-666` (ผ่าน/ไม่ผ่านเอกสาร) และ `:717-731` (ยืนยัน/ปฏิเสธสลิป)

ทั้งสองยิง LINE หาลูกค้าทันทีและย้อนกลับไม่ได้ แต่เป็น `<form action>` เปล่า
**กดแล้วหน้าเงียบ** ไม่มี spinner ไม่มีปุ่มถูกปิด — แอดมินจะกดซ้ำ
(คอมเมนต์ใน `AssignSubmit.tsx:6-9` บันทึกปัญหานี้ไว้เองแล้ว แต่แก้เฉพาะปุ่มมอบหมาย)

ที่แย่กว่า: ปุ่ม "ไม่ผ่าน" อยู่ติดใต้ช่องเหตุผลที่ปล่อยว่างได้ กดพลาดแล้วลูกค้าได้ข้อความ
เหตุผลเริ่มต้น "รูปไม่ชัด กรุณาถ่ายใหม่" (`:171`) ทั้งที่แอดมินยังไม่ได้พิมพ์อะไร

**แก้:** ทำ `<PendingButton>` ด้วย `useFormStatus` แบบเดียวกับ `AssignSubmit` แล้วใช้ทุกฟอร์มในหน้านี้
· ใส่ยืนยันหนึ่งจังหวะกับปุ่มที่ส่ง LINE · `required` ช่องเหตุผลของ "ไม่ผ่าน"

#### 11. ยกเลิกการจองได้ด้วยคลิกเดียว

`app/admin/bookings/page.tsx:756-765` — ปุ่มเป็น `text-xs text-slate-400`
(เล็กและจางที่สุดในการ์ด) แต่ทำสิ่งที่ย้อนกลับไม่ได้ ไม่มีทางกู้จากหน้าเว็บ

**แก้:** ทำสองจังหวะเหมือน `components/EditCarForm.tsx:262-285` (state `confirmDelete`)
และย้ายไปโซนล่างที่มีหัวข้อกำกับ

#### 12. ปุ่มลบไม่มียืนยัน อีก 4 หน้า

- `app/admin/users/page.tsx:449` ลบบัญชีแอดมิน
- `app/admin/after-hours/page.tsx:289` ลบช่วงค่าบริการ — **อยู่ห่างปุ่มบันทึกแค่ 8px**
- `app/admin/pickup-points/page.tsx:492` ลบจุดรับ-ส่ง
- `app/admin/cars/[id]/rates/page.tsx:368` ลบช่วงราคา

`components/EditCarForm.tsx:262` เป็นจุดเดียวที่ทำถูก → ยกเป็นมาตรฐาน

#### 13. ไม่มี flash message ยืนยันผลในหน้ารายการจอง

`app/admin/bookings/page.tsx:437-448` — flash ครอบแค่ผลของ AssignmentBox
ส่วนยืนยันสลิป / ผ่านเอกสาร / ยกเลิกการจอง **ไม่มี flash เลย** แค่ `revalidatePath` แล้วจบ
แอดมินต้องไล่ดูป้ายสถานะเองว่าเปลี่ยนไหม (นี่คือปัญหาเดียวกับที่เคยแก้ไปแล้วรอบก่อน แต่ยังไม่ครบทุกแอ็กชัน)

**แก้:** ให้ทุกแอ็กชัน `redirect("/admin/bookings?ok=…")` แล้วเพิ่มคีย์ใน `FLASH`
และใส่ `role="status" aria-live="polite"` ที่ div บรรทัด 438

---

### P1 — หน้ารายการจองไม่รองรับการโต

#### 14. โหลดการจองทั้งหมดทุกครั้ง ไม่มีค้นหา ไม่มีแบ่งหน้า

`app/admin/bookings/page.tsx:378-394` — `findMany` ไม่มี `take`
และ include ทั้ง assignments + photos + documents ของทุกใบ

ผ่านไปหนึ่งปีมี 500 การจอง = การ์ด 500 ใบในหน้าเดียว มือถือค้าง
และ **ไม่มีช่องค้นหาชื่อลูกค้า/เบอร์/ทะเบียน/รหัสจอง** เลย
แอดมินที่ลูกค้าโทรมาถามต้องกด Ctrl+F ในเบราว์เซอร์

คำตอบมีอยู่แล้วในระบบ: `app/admin/audit/page.tsx:60-104` มี `q` + `skip/take` + `PAGE_SIZE`
+ ปุ่มเลื่อนหน้า ครบถ้วน ยกมาใช้ได้ตรงๆ

#### 15. เรียงตามวันที่สร้าง ไม่ใช่ความเร่งด่วน

`app/admin/bookings/page.tsx:380` — `orderBy: { createdAt: "desc" }`
งานที่ต้องส่งรถพรุ่งนี้เช้าอาจอยู่หน้า 3 ส่วนคำขอที่เพิ่งเข้ามาแต่รับรถเดือนหน้าอยู่บนสุด

**แก้:** หมวดที่ยังทำงานอยู่ให้เรียง `startDate: "asc"` และใส่ตัวเลขจำนวนในชิปกรองทุกหมวด

#### 16. การ์ดไม่แสดงรหัสจอง

หน้าประวัติ (`app/admin/audit/page.tsx:274`) และข้อความ LINE ทุกฉบับอ้างรหัส 8 ตัว
แต่การ์ดในหน้ารายการจองไม่โชว์รหัสนี้ → คลิกจากประวัติมาแล้วหาไม่เจอว่าใบไหน

**แก้:** ใส่ `{b.id.slice(0,8).toUpperCase()}` แบบ `font-mono` ข้างทะเบียน (บรรทัด 465-467)

---

### P1 — มือถือ

#### 17. ลิงก์ที่ทำหน้าที่ปุ่ม ต่ำกว่า 44px

`app/globals.css:265-271` บังคับ `min-height: 2.75rem` ให้ `button`/`input`/`select` — **ทำไว้ดีมาก**
แต่ไม่ครอบ `<a>` และ `<Link>` ผลคือทุกลิงก์ที่เป็นปุ่มอยู่ที่ 26-40px

จุดที่กระทบมากสุด: ตัวกรองยี่ห้อและเรียงลำดับใน `app/cars/page.tsx:109,121,138` (~32px เรียงชิดกันหลายสิบอัน),
ปุ่ม "จองรถ" บนการ์ด `components/CarCard.tsx:119` (40px),
ชิปกรองหลังบ้าน `app/admin/bookings/page.tsx:422` (~34px),
ลิงก์ท้ายเว็บ `components/SiteFooter.tsx:77,127` (~28px),
สารบัญคู่มือ `app/how-to-book/page.tsx:153` (13 รายการ `gap-y-1.5`)

**แก้ที่เดียวจบ:** เพิ่มใน `globals.css`
```css
a[role="button"], .btn {
  min-height: 2.75rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
```
แล้วติดคลาส `btn` ให้ลิงก์ที่เป็นปุ่ม

#### 18. ปุ่ม "ดูทั้งหมด" หายไปบนมือถือ

`app/page.tsx:412` — `hidden sm:inline-flex` ใน `SectionHead`
ทำให้ทั้งสามส่วนไม่มีทางไปหน้ารถทั้งหมดบนจอแคบ

**แก้:** บนมือถือแสดงเป็นลิงก์เต็มความกว้างใต้กริดแทนการซ่อน

#### 19. ปฏิทินหลังบ้านใช้บนมือถือไม่ได้เลย

`app/admin/calendar/page.tsx:124-142` — ข้อมูลทั้งหมด (ชื่อลูกค้า เวลารับคืน) อยู่ใน `title=`
ซึ่ง**มือถือแตะไม่ขึ้น** และช่องแต่ละวันเป็น `<div>` เปล่าที่สื่อด้วยสีเพียงอย่างเดียว
(คนตาบอดสีแยกเขียว/เหลืองยาก)

**แก้:** ใส่อักษรกำกับในช่อง + `aria-label` ต่อช่อง และบนมือถือเปลี่ยนเป็นรายการ 7 วันข้างหน้าต่อคัน

#### 20. เมนูหลังบ้านบนมือถือเป็นแถบเลื่อนแนวนอน

`components/AdminNav.tsx:305` — 11 รายการใน `overflow-x-auto` แถวเดียว
ต้องปาดหา ไม่มีเงาบอกว่ามีต่อ และ "ดูหน้าเว็บไซต์" ถูกซ่อนหายบนมือถือ (`layout.tsx:30`)

คนขับรถใช้มือถือเป็นหลัก จึงกระทบงานจริง

**แก้:** ปุ่มแฮมเบอร์เกอร์เปิด drawer หรือแถบล่างแบบ tab bar 4-5 อันที่ใช้บ่อย

#### 21. หน้า LIFF — ปุ่มยืนยันอยู่ไกลนิ้วโป้ง และ error โผล่นอกจอ

`app/line/book/LiffBooking.tsx:398-402` เทียบ `:594`
ฟอร์มยาว 4-5 จอ กดยืนยันล่างสุดแล้ว error ไปโผล่บนสุดนอกจอ
ผู้ใช้เห็นจอนิ่ง ไม่มีอะไรเกิดขึ้น จึงกดซ้ำ

และ `:596` ปุ่มยังกดได้ทั้งที่โค้ดรู้อยู่แล้วว่าจองไม่ได้ (`sameDayInvalid`, `overlaps` คำนวณไว้แล้ว)

**แก้:** ทำแถบล่างติดหน้าจอ `sticky bottom-0` รวมยอดรวม + ปุ่มยืนยัน
พร้อม `pb-[env(safe-area-inset-bottom)]` · ย้าย error มาเหนือปุ่ม + `scrollIntoView`
· เพิ่ม `sameDayInvalid || overlaps` เข้าไปใน `disabled`
(ปัญหาเดียวกันที่หน้าเว็บ: `app/cars/[id]/book/BookingForm.tsx:295-305 vs :403`)

---

### P2 — สองภาษา (~240 จุด)

`lib/i18n.ts` มี 4 หมวด (`nav`, `common`, `home`, `footer`) และมี**หน้าเดียว**ในเว็บที่เรียก `dict()`
คือ `app/page.tsx:34` ที่เหลือพิมพ์ไทยตายทั้งหมด

| ลำดับ | หน้า | จุด (ประมาณ) | เหตุผล |
|---|---|---|---|
| 1 | `app/cars/page.tsx` | 11 | หน้าที่สองที่ทุกคนกดต่อจากหน้าแรก |
| 2 | `app/cars/[id]/book/*` | 36 | หน้าจอง — ถ้าอ่านไม่ออกก็จองไม่ได้ |
| 3 | `components/AvailabilityCalendar.tsx` | 20 | หัวใจของหน้าจอง ชื่อวัน/เดือนตายเป็นไทย |
| 4 | `components/CarCard.tsx` | 8 | `t.common` มีคีย์ตรงตัวรออยู่แล้ว แก้เร็วที่สุด |
| 5 | `app/booking/[id]/*` + `lib/booking-status.ts` | 47 | หน้าที่ลูกค้าเปิดหลังจ่ายเงิน |
| 6 | `app/my/*` | 27 | ทางเข้าประวัติการจอง |
| 7 | `app/contact/page.tsx` | 15 | สั้น แปลง่าย และเป็นทางออกเมื่อผู้ใช้ตัน |
| 8 | `app/how-to-book/page.tsx` | ~150 | เนื้อหามากสุด ไดอะแกรมมีข้อความไทยฝังอยู่ด้วย |
| 9 | `app/fees/page.tsx` | 25 | โปสเตอร์ (`:41-55`) เป็นรูปไทย ต้องทำรูป EN ด้วย |
| 10 | `app/terms` / `app/privacy` | 65 | ควรให้ฝ่ายกฎหมายแปล ไม่ใช่แปลในโค้ด |
| — | `app/login`, `app/job/[token]`, `app/admin/**` | — | หน้าพนักงาน **ไม่ต้องแปล** |

**ลำดับ 1-6 (149 จุด) ครอบคลุมเส้นทาง ดูรถ → จอง → จ่าย → ติดตาม ได้ครบ** ควรทำเป็นก้อนเดียว

---

### P2 — การเข้าถึง

- **อัปโหลดไฟล์ด้วยคีย์บอร์ดไม่ได้** `app/booking/[id]/DocumentUpload.tsx:173-198`
  และ `SlipUpload.tsx:121-151` ใช้ `<input type="file" className="hidden">`
  ซึ่ง `display:none` โฟกัสไม่ได้ → เปลี่ยนเป็น `sr-only` และเพิ่ม `id`/`htmlFor`
- **label ไม่ผูก input ในหน้าล็อกอินลูกค้า** `app/my/MyLogin.tsx:73-74, 92-95` ไม่มี `htmlFor`/`id`
- **ฟอร์มมอบหมายงานไม่มี label เลย** `components/AssignmentBox.tsx:217-266` พึ่ง placeholder อย่างเดียว
  (ช่องวันที่ที่ `:235` ไม่มี placeholder ด้วย)
- **label ไม่ผูก** `app/admin/cars/[id]/rates/page.tsx:175-221`, `app/admin/bookings/page.tsx:549, 655`,
  `app/line/connect/ConnectLine.tsx:259`
- **กล่อง error ไม่มี `role="alert"` ทั้งโปรเจกต์** (grep เจอ 0 จุด)
- **`focus:outline-none` ล้ม focus-visible** `app/admin/bookings/page.tsx:658`
  (`globals.css:296` ตั้งไว้ดีแล้วแต่ถูกทับ)
- **รูปเอกสารในหน้าคนส่งรถถูกลดความสว่าง** `app/job/[token]/page.tsx:182-186` ไม่มี `data-no-dim`
  ซึ่งคอมเมนต์ใน `globals.css:291` ระบุเองว่าเคสตรวจเอกสารควรใส่
- SVG ประดับส่วนใหญ่ไม่มี `aria-hidden="true"`

---

### P2 — การอัปโหลดไฟล์

- **ไม่ตรวจขนาดและชนิดไฟล์ฝั่งเบราว์เซอร์เลย** `SlipUpload.tsx:141` บอกว่า "ไม่เกิน 8MB"
  แต่ไม่มีการเช็ค ผู้ใช้ iPhone ที่ตั้ง HEIC จะรออัปโหลดจนจบแล้วเจอ 413
  → เช็ค `file.size` และ `file.type` ก่อนเริ่ม
- **ไม่มี preview รูป** `SlipUpload.tsx:134-135` เห็นแค่ชื่อไฟล์ ซึ่งบนมือถือคือ `IMG_4821.HEIC`
  ผู้ใช้ไม่รู้ว่าแนบสลิปถูกใบหรือเปล่า → `URL.createObjectURL(file)`
- **ช่อง "ยอดที่โอนจริง" ไม่มี `min` และส่งค่าว่างได้** `SlipUpload.tsx:108-114`
- **error รวมกองไว้ตัวเดียว** `DocumentUpload.tsx:99` มีเอกสารหลายรายการแต่ error ตัวเดียว
  อัปโหลดใบที่ 3 พลาด ข้อความไปโผล่บนสุด

---

### P2 — LIFF ที่ยังไม่แข็งแรง

- **`LiffLinker.tsx:66-69` ไม่มีตัวกันวนลูปล็อกอิน** ถ้าคุกกี้ถูกบล็อกหรือเปิดนอกแอป LINE
  จะเด้งออก-กลับไม่จบ · `LiffBooking.tsx:124-131` มี `LOGIN_ATTEMPT_KEY` แก้ไว้แล้ว ยกมาใช้
- **`LiffLinker.tsx:63` และ `ConnectLine.tsx:59` ไม่มี timeout ตอน init**
  เน็ตหลุดแล้วหมุนค้างถาวร ไม่มีปุ่มลองใหม่ · `LiffBooking.tsx:110-116` กัน 12 วินาทีไว้แล้ว
- **POST จองไม่มี idempotency** `LiffBooking.tsx:233-247` เน็ตสะดุดหลัง server สร้าง booking แล้ว
  แต่ response หาย → ผู้ใช้กดใหม่ได้ booking ซ้ำสองใบ → ส่ง `requestId` ไปกับ body
- **ยิงข้อความ error ดิบภาษาอังกฤษให้ผู้ใช้อ่าน** `LiffLinker.tsx:100`, `LiffBooking.tsx:145`
  ("Failed to fetch") → map เป็นไทยที่บอกทางออก
- **`grid-cols-2` บีบช่องวันที่บนจอ 320px** `LiffBooking.tsx:417, 500`
- **`notFound()` เมื่อรถไม่ว่าง** `app/line/book/page.tsx:116` ได้หน้า 404 กลางที่ไม่มีทางกลับ

**เรื่องบังคับโหมดสว่างในหน้า LIFF: ไม่ควรทำ** เพราะจะกระพริบสว่าง-มืดตอนข้ามไป `/booking/[id]`
ที่ยังเป็นโหมดมืด ทางที่ถูกคือแก้ข้อ 4 ให้จบแล้วทดสอบทั้งสามหน้าในโหมดมืดหนึ่งรอบ

---

### P3 — ความสม่ำเสมอ

- **สไตล์ปุ่มหลัก 4 แบบ** — `bg-blue-600` (6 หน้า), `bg-slate-900` (5 จุด), `bg-emerald-600`
  (`bookings:554,645,721`), `bg-violet-600` (`AddPartnerForm:451`)
  หนักสุดคือ `app/admin/after-hours/page.tsx` ที่หน้าเดียวมีทั้ง `bg-blue-600` ("บันทึก")
  และ `bg-slate-900` ("เพิ่ม") — แอดมินอ่านลำดับความสำคัญไม่ออก
  → นิยาม `btnPrimary` / `btnSecondary` / `btnDanger` ที่ `lib/ui.ts` แล้ว import ใช้ทุกหน้า
- **ปุ่ม "จอง" มี 3 ทรง** `rounded-full` (หน้าแรก หัวเว็บ) · `rounded-xl` (การ์ดรถ ฟอร์มจอง)
  · `rounded-lg` (เมนูมือถือ)
- **การ์ดมี 3 รัศมี** `rounded-3xl` (CarCard:32, login:41) · `rounded-2xl` (ที่อื่นเกือบทั้งหมด)
- **รูปแบบวันที่ 2 แบบในหน้าจอเดียว** `BookingForm.tsx:225` แสดง ISO ดิบ `2569-09-07 ถึง 2569-09-14`
  ขณะที่ปฏิทินด้านบนใช้ "7 ก.ย. 2569"
- **อีโมจิปนกับ SVG** `app/admin/cars/[id]/page.tsx:50` (📅), `users:367,377`, `account:241,277`
- **สีฝังค่าดิบ** `app/admin/after-hours/page.tsx:171-179` เขียน `rgb(241 245 249)`
  และ `rgba(217,119,6,…)` ใน `style=` จึงไม่ผ่านตัวแปร → โหมดมืดเป็นเทาสว่างจ้า
  และสีทองผิดจากแบรนด์ (`#b08d57`)
- **เฉดที่ไม่ได้ประกาศ** `components/AvailabilityCalendar.tsx:268` ใช้ `text-red-400`
  แต่ `globals.css` ประกาศ red ไว้แค่ 50/100/200/500/600/700/800 → หลุดไปใช้ค่า Tailwind เดิม
- **`bg-white text-blue-700` เป็นปุ่มบนแผงเขียว** `app/how-to-book/page.tsx:507`
  → ใช้ `bg-paper text-ink` ที่มีไว้แล้วสำหรับกรณีนี้
- **ฮาร์ดโค้ดตัวเลขที่ควรดึงจากตั้งค่า** `app/how-to-book/page.tsx:284` เขียน "เงินประกันรถ 3,000 บาท"
  ทั้งที่บรรทัด 469 ในไฟล์เดียวกันดึงจาก `SECURITY_DEPOSIT.amount`
- **หน้าติดต่อเรา มีแค่ 1 ใน 3 ช่องที่แตะได้** `app/contact/page.tsx:83,86`
  LINE ไม่มี `href` และที่ตั้งไม่มีลิงก์แผนที่ (`app/job/[token]/page.tsx:128-137` ทำลิงก์ Maps ไว้แล้ว)
  · `:8-9` เบอร์สองเบอร์ต่อกันเป็นสตริงเดียวแต่ `href` ชี้เบอร์แรก แตะเบอร์ที่สองก็โทรเบอร์แรก

---

### สิ่งที่ทำไว้ดีแล้ว ไม่ต้องแตะ

- **`app/globals.css:265-271`** บังคับ `min-height: 2.75rem` ให้ปุ่มและช่องกรอกทั้งระบบ
- **`app/admin/audit/page.tsx`** เป็นแบบอย่างของหน้าที่ข้อมูลโตตามเวลา — ค้นหา + กรอง + แบ่งหน้า
  + ค่าเริ่มต้น 7 วันย้อนหลัง ครบถ้วน
- **`app/admin/settings/page.tsx`** label ผูกครบทุกช่อง validate ครบ error ไทยชัด
- **`app/admin/cars/page.tsx:63-64`** ตารางครอบ `overflow-x-auto` + `min-w-[680px]`
  และป้ายสถานะมีทั้งจุดสีและข้อความ
- **`lib/booking-status.ts`** เป็น single source ของป้ายสถานะ (ยกเว้นสีม่วง)
- **`components/Brand.tsx`** แยก tone navy/white ถูกต้อง ใช้ `text-gold-fixed` บนพื้นเข้ม
  และ `text-amber-700` บนพื้นสว่าง ตรงตามกฎ contrast
- **`components/AssignSubmit.tsx`** ตรรกะ pending state ถูกและมีคอมเมนต์อธิบายดี (พังแค่สีพื้น)
- **`app/booking/[id]/PlacePicker.tsx`** label ครบ pending state ครบ error ครบ breakpoint ครบ
- **`components/ServiceNote.tsx`** ใช้สเกล amber ถูกทั้งสองโหมด มี `aria-hidden` คืน null เมื่อว่าง
- **`app/page.tsx`** i18n ครบ ตัวเลขทุกตัวมาจากฐานข้อมูลจริง ไม่มีเลขพิมพ์ตาย

---

### ลำดับการแก้ที่แนะนำ

**ก้อน 1 — บั๊กที่ทำให้งานไม่จบ (ครึ่งวัน)**
ข้อ 1, 2, 3 · แก้ไม่กี่บรรทัดต่อข้อ แต่เป็นสามจุดที่ผู้ใช้ทำงานไม่จบจริง

**ก้อน 2 — ปิดโหมดมืดให้จบ (1 วัน)**
ข้อ 4-9 · ไล่ `bg-slate-900` 12 จุด, ปุ่มทอง, hover, ปุ่มสลับโหมด/ภาษารับ tone,
ตัดสินใจเรื่อง violet ครั้งเดียวแล้วไล่ 24 จุด
เสร็จแล้วลบบล็อก "สะพานชั่วคราว" ใน `globals.css:196-207` ได้

**ก้อน 3 — ความปลอดภัยของการกระทำ + มือถือ (1-2 วัน)**
ข้อ 10-13, 17, 18 · ทำ `PendingButton` และ `btn` ที่เดียวแล้วใช้ทั้งระบบ

**ก้อน 4 — หน้ารายการจองรองรับการโต (1 วัน)**
ข้อ 14-16 · ยก pattern จากหน้า audit มาใช้

**ก้อน 5 — สองภาษาเส้นทางจอง (2-3 วัน)**
ลำดับ 1-6 ในตาราง (149 จุด) · เติมหมวด `cars`, `booking`, `my`, `calendar` ใน `lib/i18n.ts`
`tsc --noEmit` จะฟ้องเองถ้าลืมแปลคีย์ไหน

**ทำทีหลังได้** ข้อ 19-21 (ปฏิทินและเมนูหลังบ้านบนมือถือ, LIFF แข็งแรงขึ้น), P2 การเข้าถึง, P3 ความสม่ำเสมอ

[↑ กลับสารบัญ](#toc)

---

<a id="part-11"></a>

## ภาคที่ 11 — ผลตรวจ UX/UI รอบสอง

_ที่มา: `UXUI-REVIEW-2.md` (รวมเข้าเอกสารนี้แล้ว)_

ตรวจวันที่ 9 ก.ย. 2569 · เทียบกับ ภาคที่ 10 (7 ก.ย. 2569)
วิธีตรวจ: เปิดไฟล์จริงทุกข้อ + ไล่ทั้งโปรเจกต์ด้วยการค้นคลาสสีและเทียบกับตัวแปรที่ประกาศใน `app/globals.css`

> **ยังไม่ได้รันคอมไพล์** — ผมแก้ไฟล์จากนอกเครื่อง จึงยังไม่ได้รัน `tsc`/`next build`
> ก่อนใช้จริงให้รัน `npx tsc --noEmit` แล้ว `npm run dev` ดูหนึ่งรอบ

---

### 1. ข้อที่หายไปแล้ว (แก้ก่อนหน้านี้ ตรวจซ้ำแล้วผ่าน)

| ข้อ | เรื่อง | หลักฐาน |
|---|---|---|
| 1 | สลิปถูกปฏิเสธแล้วส่งใหม่ไม่ได้ | `app/booking/[id]/page.tsx:290` เช็ค `!deposit \|\| deposit.status === "REJECTED"` และ API ใช้ `upsert` แล้ว |
| 2 | กันจองซ้อนใน LIFF ไม่ทำงาน | `lib/create-booking.ts:76-89` เช็คช่วงทับซ้อนฝั่งเซิร์ฟเวอร์ และ `/api/line/book` เรียกผ่าน `createBooking` |
| 3 | แดชบอร์ดนับสถานะผิด | `app/admin/page.tsx:20` นับเฉพาะ `PENDING_DEPOSIT` แล้ว |
| 6, 7 | ปุ่ม CTA หน้าแรก / ป้ายในรูปใหญ่ | ใช้ `bg-gold-fixed text-ink` และ `bg-gold-fixed/90 text-blue-900` แล้ว |

---

### 2. ข้อที่แก้ในรอบนี้

**ข้อ 4 — `bg-slate-900` + `text-white` 13 จุด (ขาวบนขาวในโหมดมืด)**
ในโหมดมืด `--color-slate-900` คือ `#f2f5f3` (สีตัวอักษรสว่าง) ปุ่มจึงหายทั้งใบ แก้ตามบทบาท

- ปุ่มส่งฟอร์ม 4 จุด (`after-hours`, `audit`, `account`, `cars/[id]/rates`) → `bg-blue-600 hover:bg-blue-700`
- ชิปกรองที่ถูกเลือก 3 จุด (`audit` chipOn, `admin/bookings`, `cars`) → `bg-blue-600 border-blue-600`
- วงกลมตัวย่อชื่อ/ป้ายบทบาท/เลขขั้นตอน 5 จุด (`admin/layout`, `admin/users` ×2, `line/connect` ×2) → `bg-panel` ซึ่งเข้มทั้งสองโหมด
- `AssignSubmit` → `bg-blue-600 hover:bg-blue-700` และเปลี่ยนสีตอน pending เป็น `bg-blue-500` ให้ยังต่างจากปกติ

**ข้อ 9 — สีม่วง 24 จุดที่ไม่ได้ประกาศ**
ไม่ได้เลิกใช้ม่วงตามที่เอกสารรอบแรกแนะนำ เพราะ **ทองถูกใช้กับ `PENDING_DEPOSIT` (รอตรวจสลิป) ไปแล้ว**
ถ้าย้าย `REQUESTED` (รอเช็คกับเจ้าของรถ) มาเป็นทองด้วย สองสถานะจะกลายเป็นสีเดียวกัน
จึงประกาศสเกลม่วงพลัมแบบลดความสดใน `globals.css` ทั้งสองโหมดแทน (`50/100/200/500/600/700/900`)
ผลคือ 24 จุดเดิมไม่ต้องแตะเลย แต่สลับตามโหมดถูกต้องและเข้าโทนเขียว-ทองขึ้น
เพิ่มสะพาน `hover:bg-violet-700` ในโหมดมืดคู่กับของเดิมที่ทำไว้ให้ `blue-700`

**ข้อ 8 — ปุ่มสลับโหมด/ภาษา มองไม่เห็นบนหัวเว็บโปร่งใส**
`ThemeToggle` และ `LangToggle` รับ prop `tone` (`navy` / `white`) แบบเดียวกับ `Brand` แล้ว
`SiteHeader` ส่ง `tone={over ? "white" : "navy"}` ให้ทั้งสามจุด (แถบบน, มือถือ)

**เพิ่มเติมที่เจอในรอบนี้ — ไม่มีในเอกสารรอบแรก**

- **ปุ่ม "จองรถเลย" บนหัวเว็บใช้ `bg-amber-500 text-white`** ขาวบนทอง `#b08d57` ได้ 3.09:1 ไม่ผ่านเกณฑ์ตัวอักษรเล็ก
  และในโหมดมืด amber-500 กลายเป็นทองอ่อน `#c9a978` ยิ่งอ่านไม่ออก → เปลี่ยนเป็น `bg-gold-fixed text-ink` ให้ตรงกับปุ่มหน้าแรก
  (แก้ทั้งปุ่มบนหัวเว็บและปุ่มในเมนูมือถือ รวมถึงป้ายเลขขั้นตอนที่ `app/page.tsx:332`)
- **เฉดที่ยังไม่ได้ประกาศอีก 3 ตัว** `emerald-900`, `red-900` (ใช้อยู่ 4 จุด) หลุดไปใช้ค่า Tailwind เดิมซึ่งไม่สลับโหมด
  → ประกาศเพิ่มทั้งสองโหมด · `text-red-400` 2 จุด (`AvailabilityCalendar`, `admin/bookings`) → `text-red-500`
- **`bg-slate-300 text-white`** ในหมุดขั้นตอนของ `AvailabilityCalendar:163` ได้ 1.7:1 → `bg-slate-200 text-slate-500`
- **สีฝังค่าดิบใน `admin/after-hours`** `rgb(241 245 249)` และ `rgba(217,119,6,…)`
  → เปลี่ยนเป็น `var(--color-slate-200)` และ `color-mix()` กับ `var(--color-amber-500)` จึงสลับโหมดและตรงสีแบรนด์
- **ไอคอนสถิติบนแดชบอร์ด** `text-*-600` บนพื้น `*-50` ในโหมดมืดได้ราว 2.3:1 → ยกเป็น `text-*-700` ซึ่งผ่านทั้งสองโหมด

หลังรอบนี้ ทุกคลาสสีที่ใช้ในโปรเจกต์มีตัวแปรประกาศครบแล้ว (ตรวจด้วยสคริปต์เทียบ utility กับ `--color-*`)

---

### 3. ที่ยังค้าง (ตามลำดับเดิม)

> อัปเดต 10 ก.ย. 2569 — ก้อน 3, 4 และงานเข้าถึง/ความทนทานทำเสร็จแล้ว รายละเอียดอยู่หัวข้อ 3.1

**ก้อน 5 — สองภาษาเส้นทางจอง** — **ยกเลิก** ตัดระบบสองภาษาออกทั้งหมด เหลือภาษาไทยเดียว

**ยังค้างจริง**

- [ ] ตรวจปุ่มที่เป็น `<Link>` ในหน้าอื่นนอกจากหน้าแรก ว่าสูงถึง 44px ครบทุกจุด
- [ ] เงินประกันแยกรายรุ่นรถ (ตอนนี้ค่าเดียวใช้ทุกคัน)
- [ ] ค่าบริการจุดรับ-ส่ง (`PickupPoint.fee`) ยังไม่ถูกบวกเข้า `totalPrice`
- [ ] ลูกค้ายกเลิก/เลื่อนวันเองในเว็บ

---

### 3.1 ที่แก้ในรอบ 10 ก.ย. 2569

**กันกดพลาด (ก้อน 3)**

- [x] เพิ่ม `lib/ui.ts` — `BTN` (คลาสปุ่มกลาง), `NOTICE` (กล่องแจ้งผล), `CONFIRM` (ข้อความยืนยันมาตรฐาน)
- [x] เพิ่ม `components/ActionButton.tsx` — ปุ่มส่งฟอร์มที่ถามยืนยันก่อน และปิดตัวเองระหว่างรอ (`useFormStatus`)
      ทำให้ปุ่มเดิมที่กดรัวได้ กดซ้ำไม่ได้อีก
- [x] ใส่คอนเฟิร์มให้ทุกปุ่มที่ยิง LINE หาลูกค้าทันที: รถว่าง/รถไม่ว่าง · เอกสารไม่ผ่าน ·
      ยืนยัน/ปฏิเสธค่าจอง · ส่งการ์ดงานซ้ำ · ถอนคนออกจากงาน
- [x] ใส่คอนเฟิร์มให้ทุกปุ่มที่ลบหรือเปลี่ยนสิทธิ์: ยกเลิกการจอง · ลบจุดรับ-ส่ง · ลบแอดมิน ·
      ตัดการผูก LINE · ตัดการเชื่อมปฏิทิน · เปลี่ยนประเภทบัญชี · เปลี่ยนรหัสผ่าน
- [x] เหตุผล "เอกสารไม่ผ่าน" เปลี่ยนจากช่องพิมพ์เปล่าเป็นรายการให้เลือก 6 แบบ + ช่อง "อื่น ๆ"
      (เดิมถ้าไม่พิมพ์จะส่ง "รูปไม่ชัด กรุณาถ่ายใหม่" ให้ลูกค้าเสมอ ไม่ว่าปัญหาจริงคืออะไร)
- [x] หน้าจุดรับ-ส่งเคย redirect มาพร้อม `?ok=` แต่ไม่เคยแสดงข้อความ — ตอนนี้ขึ้นข้อความแยกตามงานที่ทำ

**หน้ารายการจองรองรับการโต (ก้อน 4)**

- [x] ช่องค้นหา — ชื่อ / เบอร์ / ทะเบียน / รหัสจอง 8 ตัวหน้า
- [x] แบ่งหน้า หน้าละ 20 รายการ (เดิมดึงทั้งหมดมาทีเดียว)
- [x] ตัวเลือกเรียง "ใกล้ถึงวันรับรถก่อน" + ตัวกรอง "ต้องทำ" (คำขอรอเช็ค + รอตรวจสลิป)
- [x] โชว์รหัสจอง `#XXXXXXXX` บนการ์ด จะได้อ้างอิงกับลูกค้าได้ตรงกัน

**ความทนทานของ LIFF**

- [x] `LiffLinker` เพิ่มกันวนลูป login (`sessionStorage`) และ timeout 12 วินาที เท่ากับ `LiffBooking`
- [x] กันกดจองซ้ำเป็นสองรายการ — ถ้าคนเดิม รถคันเดิม ช่วงเวลาเดิม จองซ้ำใน 15 นาที
      ระบบคืนใบจองเดิมแทนที่จะสร้างใหม่ (`app/api/line/book/route.ts`)
- [x] แปล error ดิบเป็นข้อความไทยที่บอกว่าต้องทำอะไรต่อ (`thaiError()` ใน `LiffBooking.tsx`)
- [x] ปุ่มยืนยันติดขอบล่างแบบ sticky และเลื่อนจอไปหากล่อง error เอง — เดิม error อยู่บนสุด กดปุ่มล่างสุดแล้วไม่เห็น

**การเข้าถึง**

- [x] ผูก `label`/`htmlFor` ครบทุกช่องในกล่องมอบหมายงาน + ช่องค้นหา/เรียงลำดับ
- [x] `role="alert"` + `aria-live` บนกล่องแจ้งผลทุกหน้า
- [x] `data-no-dim` บนรูปเอกสารในใบงานและรูปสภาพรถ — โหมดมืดเคยหรี่รูปจนตรวจไม่ได้
- [x] ช่องคู่ (วัน/เวลา, จุดรับ/จุดคืน) ไม่บีบเป็นสองคอลัมน์บนจอแคบกว่า 360px แล้ว
- [x] ปุ่ม "ดูทั้งหมด" ที่หัวหน้าแรกสูงถึง 44px และไม่ซ่อนบนมือถืออีกต่อไป

**หน้าตารางรับ-ส่งรถ เฟส 2**

- [x] เปลี่ยนสถานะงานได้จากหน้าเว็บ (รับทราบ / ปิดงาน / ย้อนสถานะ) เผื่อคนรับ-ส่งลืมกดในแชท
      DRIVER แก้ได้เฉพาะงานตัวเอง
- [x] อัปเดตหน้าเองทุก 60 วินาที ปิดสวิตช์ได้ และหยุดเองเมื่อแท็บไม่ได้เปิดอยู่
- [x] ปุ่มพิมพ์ + `@media print` ใน `globals.css` (ซ่อน `.no-print`, บังคับโทนสว่าง, ใช้ตารางแทนการ์ด)

---

### 4. ก่อน deploy

1. `npx tsc --noEmit`
2. `npm run dev` แล้วสลับโหมดมืดหนึ่งรอบใน 5 หน้า: หน้าแรก · `/cars` · `/cars/[id]/book` · `/booking/[id]` · `/admin/bookings`
3. เปิดหน้าแรกแล้วเลื่อนขึ้น-ลง ดูปุ่มภาษา/โหมดตอนหัวเว็บโปร่งใสและตอนทึบ
4. เปิด `/admin/after-hours` ดูแถบ 24 ชั่วโมงทั้งสองโหมด (เปลี่ยนวิธีลงสีใหม่)

[↑ กลับสารบัญ](#toc)

---

<a id="part-12"></a>

## ภาคที่ 12 — รายการคลิปสอนใช้งาน

_ที่มา: `คลิปสอนใช้งาน/รายการคลิป.md` (รวมเข้าเอกสารนี้แล้ว)_

รายการคลิปสอนใช้งาน ระบบจองรถเช่า ภูพิงค์ คอร์เปอเรชั่น
(ถ่ายจากระบบทดสอบ ข้อมูลลูกค้า บัตร และสลิปในคลิปเป็นข้อมูลสมมติทั้งหมด)

ลูกค้า — เว็บไซต์ (แนวตั้ง 1080x1920)
  C01 จองรถผ่านเว็บ
  C02 โอนค่าจอง แนบสลิป และส่งเอกสาร

ลูกค้า — LINE (แนวตั้ง 1080x1920)
  L01 เริ่มต้นใช้ LINE ของร้าน (เมนูด้านล่าง ค่าปรับ ติดต่อ เช็คสถานะ)
  L02 จองรถผ่าน LINE (จนถึงส่งสลิป)
  L03 แจ้งเตือนจากร้านใน LINE (ยืนยันการจอง → ยืนยันรับรถ → เตือนคืนรถ → คืนเงินประกัน)

คนรับ-ส่งรถ (แนวตั้ง 1080x1920)
  D01 รับงานทาง LINE เปิดหน้างาน ถ่ายรูปสภาพรถ และปิดงาน

หลังบ้าน — แอดมิน (แนวนอน 1920x1080)
  A01 เข้าสู่ระบบ และภาพรวมเมนู
  A02 ตรวจสลิปค่าจอง และตรวจเอกสาร
  A03 แก้ไขการจอง ปรับราคา และแจ้งลูกค้า
  A04 สร้างใบจองแทนลูกค้า
  A05 มอบหมายคนส่ง-รับรถ และตารางงาน
  A06 ออกใบเสร็จ และคืนเงินประกัน
  A07 จัดการรถ ราคา ส่วนลด และแผนการเดินทาง

ผู้ดูแลระบบ (แนวนอน 1920x1080)
  A08 ผู้ใช้ ผูก LINE และตั้งค่าระบบ

ทุกคลิปมีไฟล์ซับไตเติล .srt ชื่อเดียวกัน (เผื่ออัปโหลด YouTube แล้วเปิด/ปิดซับได้)

[↑ กลับสารบัญ](#toc)

---

<a id="part-13"></a>

## ภาคที่ 13 — บันทึกการเปลี่ยนแปลง

_ที่มา: `CHANGELOG.md` (รวมเข้าเอกสารนี้แล้ว)_

เรียงจากใหม่ไปเก่า · รายละเอียดกฎและเหตุผลเต็ม ๆ อยู่ใน ภาคที่ 2 หัวข้อ 4

---

### 17 ต.ค. 2569

#### ย้ายไป Vercel Hobby + หน้าส่งออกข้อมูลก่อนปิดระบบ

**Cron** — `vercel.json` ปรับ `/api/cron/reminders` เป็นวันละครั้ง (Hobby ตั้งถี่กว่านี้ไม่ได้ ไม่งั้น deploy ไม่ผ่าน)
การเตือนลูกค้าทุก 15 นาทีย้ายไป GitHub Actions (`.github/workflows/customer-reminders.yml`)
ต้องตั้ง Secrets `CRON_SECRET` กับ `SITE_URL`

**ส่งออกข้อมูลทั้งระบบ** — หน้า `/admin/export` โหลด ZIP เดียว: CSV 19 ไฟล์ + ใบเสร็จ PDF + README.txt
(มี SHA-256 ของทุกไฟล์) เข้าได้เฉพาะบัญชี DEV — ล็อกให้เหลืออีเมลเดียวได้ด้วย env `EXPORT_OWNER_EMAIL`
ไม่รวมรูป/เอกสารใน Blob เลขบัตรประชาชน รหัสผ่านและโทเคน · ทุกครั้งที่ส่งออกบันทึกใน audit log
ไฟล์: `app/admin/export/page.tsx`, `app/admin/export/download/route.ts`, `lib/export-data.ts`,
`lib/export-guard.ts`, `lib/zip-stream.ts` (ตัวเขียน ZIP แบบสตรีม ไม่เพิ่ม dependency)

---

### 4 ต.ค. 2569

#### แจ้งเตือน LINE

**การ์ด "ลูกค้าอัปโหลดสลิปแล้ว" (ถึงแอดมิน)** — เพิ่มรายละเอียดให้เห็นแล้วรู้เลยไม่ต้องเปิดหลังบ้าน
ทะเบียนรถ · วันเวลารับ-คืน · จำนวนวัน · ค่าเช่า `1,200 × 2 = 2,400` (แยกบรรทัดถ้าคร่อมหลายช่วงราคา)
· ยอดจองรวม (ขึ้นเฉพาะตอนมีค่าบริการอื่นหรือส่วนลด) — ปุ่มตรวจสลิปเหมือนเดิม

**การ์ด "รับทราบงาน" (ถึงคนส่งรถ)** — เปลี่ยนจากข้อความสั้นเป็นการ์ดสรุปงาน
บรรทัดแรก "รถ (เบอร์ลูกค้า)" · รับ/คืน วันเวลาสถานที่ · รวมกี่วัน · ค่าเช่าต่อวัน × วัน · ประกัน · รวม
· ปุ่มโทรหาลูกค้า · ปุ่มแผนที่ (เฉพาะจุดนัดที่ไม่ใช่จุดประจำ)
การ์ดงานเดิมที่มียอด "เก็บเงินหน้างาน" ไม่ได้เปลี่ยน

**หน้าตัวอย่างข้อความทั้งหมด** — `/admin/notifications` แท็บ "ตัวอย่างข้อความทั้งหมด"
รวมข้อความ LINE 37 แบบ แบ่ง 6 กลุ่ม (ลูกค้า: จองในแชท / อัตโนมัติ / แอดมินกดส่ง · บอทตอบในแชท
· แอดมิน · คนรับ-ส่งรถ) วาดจากโค้ดตัวเดียวกับที่ส่งจริง แก้แล้วเห็นผลทันทีโดยไม่ต้องส่งทดสอบเข้า LINE

เพื่อให้ตัวอย่างตรงกับของจริง ย้ายข้อความที่เคยพิมพ์ฝังในหน้าออกมาเป็นฟังก์ชันกลาง
(ถ้อยคำที่ส่งจริงไม่เปลี่ยนแม้แต่ตัวเดียว):

- `lib/driver-cards.ts` — การ์ดงาน การ์ดรับทราบ ข้อความปิดงาน/ถอนงาน
- `lib/customer-texts.ts` — อนุมัติ/ปฏิเสธคำขอจอง · สลิปไม่ผ่าน · เอกสารไม่ผ่าน · เปลี่ยนรถ
- `lib/line-help.ts` — ข้อความต้อนรับ · คำแนะนำคนส่งรถ · ข้อความตอบค่าปรับ

#### Google Calendar

โน้ตใน event ของงานรับ-ส่งรถ เปลี่ยนเป็น:

```
Honda City Turbo (081-234-5678)
รับ 6 ต.ค. 16:00 · สถานีขนส่งอาเขต
คืน 8 ต.ค. 16:00 · สนามบินเชียงใหม่
รวม 2 วัน

ค่าเช่าต่อวัน 1,200 × 2 = 2,400
ประกัน 3,000
รวม 5,400 บาท

ทะเบียน: CITY-01
ลูกค้า: สมชาย ใจดี
รหัสจอง: CMTZSCN4
เวลานัดงานนี้: 6 ต.ค. 2569 16:00 น.

เอกสารการจอง:
https://…/job/<token>

บจก. ภูพิงค์คอร์ปอเรชั่น
```

- ส่วนบนเหมือนการ์ดรับทราบงานทุกบรรทัด (ฟังก์ชันเดียวกัน)
- ลิงก์เปลี่ยนจาก `/admin/bookings` (ต้องล็อกอิน) เป็นหน้างาน `/job/<token>` เปิดเอกสารได้ทันที
- คนส่งรถกด "รับทราบ" แล้วโน้ตอัปเดตเป็นแบบใหม่เอง
- สคริปต์ `scripts/resync-calendar.ts` อัปเดต event เก่าทั้งหมดทีเดียว (รันหลัง deploy)

⚠️ ห้ามแชร์ปฏิทิน "งานรับส่งรถ PHUPING" ให้คนนอกทีมส่งรถ — ลิงก์ในโน้ตเปิดเอกสารลูกค้าได้

#### แดชบอร์ด

เพิ่มตัวกรองช่วงวันที่: วันนี้ · 7 วันล่าสุด · เดือนนี้ · เดือนที่แล้ว · ปีนี้ · ทั้งหมด · หรือเลือกวันเอง
นับตามวันรับรถ หรือวันที่ลูกค้ากดจอง — **เปิดหน้ามาเริ่มที่ "เดือนนี้"** (เดิมนับรวมทั้งหมด)

กรองเฉพาะยอดสะสม (ยืนยันแล้ว · การจอง · ค่าจอง · มูลค่าการจอง · รายการการจอง เพิ่มเป็น 10 ใบ)
ตัวเลขงานที่ต้องทำ (รอตรวจเอกสาร · งานวันนี้ · ยังไม่มีคนรับ) แสดงสถานะปัจจุบันเสมอ

#### แก้บั๊ก

- ปุ่ม/แท็บที่เลือกอยู่ในโหมดมืดเป็นพื้นขาวตัวหนังสือขาว — เปลี่ยนเป็นเขียวแบรนด์

#### ไฟล์

ใหม่: `lib/driver-cards.ts` · `lib/customer-texts.ts` · `lib/line-help.ts` · `lib/line-message-catalog.ts`
· `lib/rent-breakdown.ts` · `lib/dashboard-range.ts` · `scripts/resync-calendar.ts` · ภาคที่ 13

แก้: `lib/driver-jobs.ts` · `lib/calendar-sync.ts` · `lib/line-flex.ts` · `lib/notification-samples.ts`
· `components/LinePreview.tsx` · `app/admin/page.tsx` · `app/admin/notifications/page.tsx`
· `app/admin/bookings/page.tsx` · `app/api/line/webhook/route.ts` · `app/api/bookings/[id]/deposit/route.ts`
· ภาคที่ 2

ไม่มีการเปลี่ยนโครงสร้างฐานข้อมูล — ไม่ต้องรัน `prisma db push`

#### ขั้นตอนขึ้นระบบ

```
npm run build
git add <ไฟล์ทั้งหมดข้างบน>
git commit -m "..."
git push
:: รอ Vercel deploy เสร็จ
npx tsx scripts/resync-calendar.ts          ← ดูก่อน
npx tsx scripts/resync-calendar.ts --yes    ← อัปเดตจริง
```

[↑ กลับสารบัญ](#toc)
