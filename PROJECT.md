# ระบบจองรถเช่า CM Car Rent (Car Booking MVP)

เอกสารสรุปโปรเจกต์ — เว็บจองรถเช่าเชียงใหม่ พร้อมหลังบ้านและ LINE OA deploy บน Vercel

> **สถานะ:** ใช้งานได้จริงทั้ง 3 ช่องทาง — เว็บ, LIFF ในแอป LINE, และแชท LINE
> จองรถ → ชำระค่าจอง → ส่งเอกสาร → แอดมินตรวจ → ยืนยัน ครบวงจร
> จองรถ → ค่าจอง → เอกสาร → รับรถ → คืนรถ → คืนเงินประกัน → ใบเสร็จ ครบวงจร
> **ยังไม่ทำ:** Bank API เช็คยอดอัตโนมัติ, OCR อ่านสลิป, VAT ในใบเสร็จ

---

## 1. ภาพรวม

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

## 2. เทคโนโลยี

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

## 3. โครงสร้างฐานข้อมูล

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

## 4. กฎธุรกิจสำคัญ

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
(ตอนนี้ `vercel.json` = `0 2 * * *` ≈ 09:00 ไทย) เมื่ออัปเป็น Pro ให้แก้เป็น `*/15 * * * *`
หรือใช้ cron ภายนอกยิงมาพร้อม header `Authorization: Bearer <CRON_SECRET>`

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

---

## 5. ไฟล์ที่ควรรู้จัก

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

---

## 6. ติดตั้งและรันบนเครื่อง

### ครั้งแรก

```bash
npm install

vercel env pull .env.local --environment=production
copy .env.local .env

# เติมค่าที่ Vercel ส่งออกมาเป็น [SENSITIVE] ด้วยมือ (ดูหัวข้อ 7)

npm run db:push
npx tsx prisma/seed-cars.ts
npx tsx prisma/seed-pickup-points.ts
```

### รันทุกครั้ง

```bash
npm run dev
```

### สคริปต์

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
| `npm run build` | **ต้องรันก่อน push ทุกครั้ง** |
| `npx tsc --noEmit` | ตรวจ type |

---

## 7. ตัวแปร Environment

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

## 8.1 ตั้งค่า Google Calendar

1. Google Cloud Console → สร้างโปรเจกต์ → เปิด **Google Calendar API**
2. OAuth consent screen — ถ้าองค์กรมี Google Workspace เลือก **Internal** (ไม่ต้องส่ง Google ตรวจ)
   ถ้าใช้ Gmail ทั่วไปเลือก External + โหมด Testing แล้วใส่อีเมลแอดมินเป็น test user (ได้ถึง 100 คน)
3. สร้าง **OAuth client ID** แบบ Web application ใส่ redirect URI สองตัว:
   `https://<โดเมน>/api/google/callback` และ `http://localhost:3000/api/google/callback`
4. ใส่ env 3 ตัว (ดูหัวข้อ 7) แล้ว redeploy
5. แอดมินแต่ละคนเข้า `/admin/account` กดเชื่อมเอง

> scope ที่ขอคือ `calendar.app.created` เท่านั้น — สร้างปฏิทินของแอปเองและจัดการ event ในนั้นได้
> ไม่เห็นและไม่แก้ปฏิทินอื่นของแอดมิน

## 8. ตั้งค่า LINE

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

## 9. รูปภาพและความปลอดภัย

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

## 10. ปัญหาที่เจอและวิธีแก้

### Prisma 7 — `url` ใน schema ใช้ไม่ได้แล้ว
`datasource` มีแค่ `provider` ต้องส่ง connection string ผ่าน driver adapter (`PrismaPg`) ใน `lib/prisma.ts`

### `prisma.config.ts` ไม่โหลด .env เอง
ใส่ `import "dotenv/config";` เป็นบรรทัดแรก

### Prisma CLI อ่าน `.env` ไม่ใช่ `.env.local`
`copy .env.local .env` ทุกครั้งที่ดึง env ใหม่

### `vercel env pull` ได้ค่าไม่ครบ
ต้องใส่ `--environment=production` และตัวแปรที่ตั้งเป็น **Sensitive** จะได้ `[SENSITIVE]` เสมอ
อ่านค่าจริงไม่ได้ทั้งจาก CLI และ dashboard — ต้องไปเอาจากต้นทาง (Neon → Quickstart → Show secret)

### Next.js 16 — `middleware.ts` เปลี่ยนชื่อเป็น `proxy.ts`

### อัปโหลดสลิปขึ้น "Unexpected end of JSON input"
Blob store เป็น Private แต่โค้ดสั่ง `access: "public"` → แก้เป็น `"private"` + ดึงผ่าน `/api/file`
และใส่ try/catch ให้ทุก route ตอบ JSON เสมอ

### LINE bot ตอบข้อความ default
Webhooks toggle ปิดอยู่ใน LINE OA Manager

### Rich menu บันทึกไม่ได้ "Enter a display period"
Display period เป็นช่องบังคับ ต้องใส่ช่วงวันที่

### `react-hooks/purity` error
เรียก `Date.now()` ตอน render → ย้ายไป module scope หรือ `useEffect`

### Build fail: `Module not found: Can't resolve 'dns'`
มี client component import โมดูลที่ `import prisma` เข้ามา → Turbopack ลาก `pg` ไป bundle ฝั่ง browser
**แยกไฟล์**: helper ที่ client ใช้ต้องไม่มี prisma (ดู `lib/pickup-points.ts` vs `-server.ts`)

### กดเลือกรถใน LINE แล้ววนกลับมาหน้าเลือกรถไม่จบ
LINE ส่งพารามิเตอร์ของลิงก์ LIFF มาเป็น `liff.state` เช่น `?liff.state=%3Fcar%3Dabc`
ปกติ LIFF SDK แกะให้ตอน `liff.init()` แต่หน้าที่ไม่ได้เรียก init จะไม่มีใครแกะ
พอเด้งไปล็อกอินแล้ว LINE ส่งกลับมาที่ endpoint เปล่าๆ จึงวนซ้ำ
**แก้:** แกะ `liff.state` เองฝั่ง server แล้ว redirect + ใส่ตัวกันวนลูปตอนเรียก `liff.login`

### อัปโหลดรูปขึ้น 413
Vercel จำกัด request body ของ serverless function ไว้ราว **4.5MB** และปฏิเสธก่อนถึงโค้ดเรา
แก้ด้วยการย่อรูปในเบราว์เซอร์ก่อนส่ง (`lib/image-resize.ts`)

### `TS2304: Cannot find name 'settings'`
ลืมว่าฟังก์ชันนั้นไม่มี `settings` ในขอบเขต → ใช้ `(await getSettings())` ที่จุดใช้งาน
**ESLint จับ error ประเภทนี้ไม่ได้** ต้องรัน `npx tsc --noEmit`

---

## 11. ขั้นตอน deploy

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

## 12. ข้อจำกัดของแผน Hobby

| เรื่อง | ข้อจำกัด |
|---|---|
| Cron | วันละครั้ง คลาดเคลื่อน ±59 นาที — ถ้าต้องการถี่กว่านี้ใช้ cron-job.org ยิงเข้า endpoint |
| Request body | ~4.5MB (เหตุของ 413) |
| Logs | ย้อนได้แค่ 1 ชั่วโมง |
| ToS | **ห้ามใช้เชิงพาณิชย์** — ถ้าเปิดรับเงินจริงต้องอัปเป็น Pro |

**ข้อจำกัดของ LINE**

- datetimepicker ปิดวันที่รายวันไม่ได้ → ใช้ LIFF เมื่อต้องการปฏิทินที่ปิดวันไม่ว่างได้
- reply message ฟรีไม่จำกัด แต่ push message มีโควตา

---

## 13. สิ่งที่ยังไม่ได้ทำ / ค่าที่ยังเป็นของสมมติ

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

## 14. ข้อควรระวังเวลาแก้โค้ด

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
