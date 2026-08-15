# ระบบจองรถเช่า (Car Booking MVP)

เอกสารสรุปโปรเจกต์ — เวอร์ชันทดลอง (MVP) ที่ deploy บน Vercel

> **สถานะปัจจุบัน:** ใช้งานได้จริงแล้ว — ฐานข้อมูลเชื่อมต่อสำเร็จ, ระบบ login ทำงาน,
> จองรถ/อัปโหลดสลิป/ยืนยันมัดจำครบวงจร
> **ยังไม่ทำ (เฟส 2):** LINE OA, Bank API, OCR อ่านสลิปอัตโนมัติ

---

## 1. ภาพรวมระบบ

ระบบจองรถเช่าออนไลน์ แบ่งเป็น 2 ส่วน:

**หน้าบ้าน (ลูกค้า)**
เลือกรถ → ระบุวันรับ-คืนรถ → กรอกข้อมูลติดต่อ → จองสำเร็จ → โอนมัดจำ 30% → อัปโหลดสลิป → รอแอดมินยืนยัน

**หลังบ้าน (แอดมิน)**
ต้อง login ก่อน → ดูแดชบอร์ด → จัดการรถ (เพิ่ม/เปิด-ปิดการใช้งาน) → ตรวจสลิปมัดจำ → ยืนยันหรือปฏิเสธการจอง

---

## 2. เทคโนโลยีที่ใช้

| ส่วน | เทคโนโลยี | หมายเหตุ |
|---|---|---|
| Framework | **Next.js 16.3.1** (App Router) | เวอร์ชันใหม่มาก มี breaking changes |
| ภาษา | TypeScript | |
| UI | Tailwind CSS v4 | โทนสว่าง สีหลักน้ำเงิน |
| ฟอนต์ | Noto Sans Thai + Geist | |
| ฐานข้อมูล | **Neon Postgres** (Free tier) | region: Washington D.C. (iad1) |
| ORM | **Prisma 7.9.1** | มี breaking changes เยอะ ดูหัวข้อ 7 |
| Login | **Auth.js (NextAuth v5 beta)** | Credentials + JWT + bcryptjs |
| เก็บไฟล์ | **Vercel Blob** (Private access) | รูปรถ + สลิปมัดจำ |
| Deploy | Vercel (Hobby plan) | auto-deploy เมื่อ push ขึ้น `main` |
| Repo | GitHub — `phattharatayati-hue/car-booking-mvp` | **ต้องเป็น Public** ดูหัวข้อ 7 |

---

## 3. โครงสร้างไฟล์

```
car-booking-mvp/
├── app/
│   ├── layout.tsx              # Root layout + ฟอนต์ + metadata
│   ├── globals.css             # ธีมสว่าง + animation
│   ├── page.tsx                # หน้าแรก (hero + รถแนะนำ)
│   ├── cars/
│   │   ├── page.tsx            # รถทั้งหมด + กรองยี่ห้อ/เรียงราคา
│   │   └── [id]/book/
│   │       ├── page.tsx        # หน้าจองรถ (2 คอลัมน์)
│   │       └── BookingForm.tsx # ฟอร์มจอง (client)
│   ├── booking/[id]/
│   │   ├── page.tsx            # สถานะการจอง + stepper
│   │   └── SlipUpload.tsx      # อัปโหลดสลิป (client)
│   ├── how-to-book/page.tsx    # วิธีการจอง + FAQ
│   ├── contact/page.tsx        # ติดต่อเรา
│   ├── login/page.tsx          # เข้าสู่ระบบแอดมิน
│   ├── admin/
│   │   ├── layout.tsx          # Sidebar หลังบ้าน
│   │   ├── page.tsx            # แดชบอร์ด + รายได้ + จองล่าสุด
│   │   ├── cars/page.tsx       # จัดการรถ
│   │   └── bookings/page.tsx   # ตรวจสลิป/ยืนยันการจอง
│   └── api/
│       ├── auth/[...nextauth]/route.ts
│       ├── cars/route.ts             # GET (public) / POST (ต้อง login)
│       ├── cars/[id]/route.ts        # PATCH / DELETE (ต้อง login)
│       ├── bookings/route.ts         # POST สร้างการจอง
│       ├── bookings/[id]/deposit/route.ts  # POST บันทึกสลิป
│       ├── upload/route.ts           # POST อัปโหลดไฟล์เข้า Blob
│       └── file/route.ts             # GET ดึงรูปจาก Blob (private)
├── components/
│   ├── SiteHeader.tsx          # เมนูหลัก + mobile menu (client)
│   ├── SiteFooter.tsx
│   ├── PublicShell.tsx         # ครอบ header + footer
│   ├── CarCard.tsx             # การ์ดรถ
│   ├── AdminNav.tsx            # เมนูหลังบ้าน + active state (client)
│   └── AddCarForm.tsx          # ฟอร์มเพิ่มรถ + อัปโหลดรูป (client)
├── lib/
│   ├── prisma.ts               # Prisma client + driver adapter
│   └── auth.ts                 # ตั้งค่า NextAuth
├── prisma/
│   ├── schema.prisma           # โครงสร้างฐานข้อมูล
│   ├── seed.ts                 # สร้างแอดมินคนแรก
│   └── seed-demo.ts            # ใส่ข้อมูลจำลอง (รถ/ลูกค้า/การจอง)
├── prisma.config.ts            # ตั้งค่า Prisma 7 (แทน datasource url)
├── proxy.ts                    # Middleware (Next 16 เปลี่ยนชื่อจาก middleware.ts)
└── .env                        # ตัวแปรลับ (ห้าม commit)
```

---

## 4. โครงสร้างฐานข้อมูล

```
AdminUser   id, email(unique), passwordHash, name, role, createdAt
Car         id, name, brand, licensePlate(unique), pricePerDay,
            photoUrl?, source, status, createdAt, updatedAt
Customer    id, fullName, phone, email?, idCardNumber?,
            isBlacklisted, createdAt
Booking     id, carId→Car, customerId→Customer, startDate, endDate,
            totalPrice, status, note?, createdAt, updatedAt
Deposit     id, bookingId→Booking(unique), amount, slipImageUrl,
            status, confirmedBy?, confirmedAt?, createdAt
```

**Enum**

- `CarSource` — `OWN` (รถของเรา) / `PARTNER` (รถพาร์ทเนอร์)
- `CarStatus` — `AVAILABLE` / `UNAVAILABLE`
- `BookingStatus` — `PENDING_DEPOSIT` / `CONFIRMED` / `CANCELLED` / `COMPLETED`
- `DepositStatus` — `PENDING` / `CONFIRMED` / `REJECTED`

**ความสัมพันธ์:** Car 1—* Booking, Customer 1—* Booking, Booking 1—1 Deposit

---

## 5. การติดตั้งและรันบนเครื่อง

### ครั้งแรก

```bash
# 1. ดึงโค้ดล่าสุด (หรือใช้ GitHub Desktop: Fetch origin → Pull origin)
git pull origin main

# 2. ติดตั้ง dependencies
npm install

# 3. ดึงตัวแปร environment จาก Vercel
vercel login
vercel link                                    # เลือก project: car-booking-mvp
vercel env pull .env.local --environment=production

# 4. คัดลอกเป็น .env (Prisma CLI อ่านเฉพาะ .env)
copy .env.local .env

# 5. เติมค่าที่ Vercel ไม่ยอมส่งออกมา (แสดงเป็น [SENSITIVE])
#    → เอาค่า DATABASE_URL จริงจาก Neon dashboard มาใส่ ดูหัวข้อ 6

# 6. สร้างตารางในฐานข้อมูล + สร้างแอดมินคนแรก
npm run db:push
npm run db:seed
```

### รันทุกครั้ง

```bash
npm run dev      # เปิด http://localhost:3000
```

กด `Ctrl + C` เพื่อหยุด

### คำสั่งอื่น

```bash
npm run build            # build production
npm run lint             # ตรวจ code style
npx tsc --noEmit         # ตรวจ TypeScript
npx prisma generate      # สร้าง Prisma Client ใหม่ (หลังแก้ schema)
npm run db:push          # อัปเดตโครงสร้างตารางตาม schema
npm run db:seed          # สร้าง/อัปเดตแอดมิน
npx tsx prisma/seed-demo.ts   # ใส่ข้อมูลจำลอง (รันซ้ำได้ปลอดภัย)
```

---

## 6. ตัวแปร Environment

| ตัวแปร | ใช้ทำอะไร | หาได้จากไหน |
|---|---|---|
| `DATABASE_URL` | เชื่อมต่อ Neon (แบบ pooled) | Vercel → Storage → Neon → Quickstart → **Show secret** |
| `DATABASE_URL_UNPOOLED` | เชื่อมต่อแบบไม่ผ่าน pgbouncer | ที่เดียวกัน |
| `AUTH_SECRET` | เข้ารหัส session ของ NextAuth | สร้างเองด้วย `openssl rand -base64 32` (local ใช้ค่าอะไรก็ได้) |
| `BLOB_READ_WRITE_TOKEN` | อัปโหลดไฟล์เข้า Vercel Blob | Vercel → Storage → Blob store |
| `SEED_ADMIN_EMAIL` | อีเมลแอดมินตอน seed | ไม่ตั้งก็ได้ (default `admin@example.com`) |
| `SEED_ADMIN_PASSWORD` | รหัสผ่านแอดมินตอน seed | ไม่ตั้งก็ได้ (default `changeme123`) |

> ⚠️ **สำคัญ:** ตัวแปรที่ติดป้าย **"Sensitive"** ใน Vercel จะ**ดูค่าไม่ได้เลย** ทั้งหน้าเว็บและ `vercel env pull`
> (จะได้ค่าเป็น `[SENSITIVE]` แทน) ต้องไปเอาค่าจริงจากต้นทาง เช่น Neon dashboard

> ⚠️ ห้าม commit ไฟล์ `.env` ขึ้น GitHub — `.gitignore` กันไว้แล้ว

**บัญชีแอดมินเริ่มต้น:** `admin@example.com` / `changeme123` → **ควรเปลี่ยนรหัสผ่านทันที**

---

## 7. ปัญหาที่เจอและวิธีแก้ (สำคัญมาก)

รวมบทเรียนทั้งหมดจากการ setup — ถ้าเจอ error เหล่านี้อีกให้ดูตรงนี้

### 7.1 Prisma 7 — `url` / `directUrl` ใช้ใน schema ไม่ได้แล้ว

```
error: The datasource property 'url' is no longer supported in schema files
```

**แก้:** ลบ `url` และ `directUrl` ออกจาก `schema.prisma` ให้เหลือแค่ `provider`
แล้วย้ายไปตั้งใน `prisma.config.ts` แทน

### 7.2 Prisma 7 — ต้องใช้ driver adapter

```
PrismaClientInitializationError: PrismaClient was instantiated without any options.
A driver adapter is required to connect to your database.
```

**แก้:** ติดตั้ง `@prisma/adapter-pg` + `pg` แล้วสร้าง client แบบนี้

```ts
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });
```

### 7.3 `prisma.config.ts` ไม่โหลด .env เอง

```
PrismaConfigEnvError: Cannot resolve environment variable: DATABASE_URL
```

**แก้:** ใส่ `import "dotenv/config";` เป็น**บรรทัดแรก**ของ `prisma.config.ts`
(Prisma ตั้งใจปิด auto-load dotenv ไว้)

### 7.4 Prisma CLI อ่าน `.env` ไม่ใช่ `.env.local`

**แก้:** `copy .env.local .env` (Next.js อ่าน `.env.local` แต่ Prisma CLI อ่าน `.env`)

### 7.5 `vercel env pull` ไม่ได้ตัวแปรมา

**สาเหตุ:** ตัวแปรตั้งไว้เฉพาะ "Production and Preview" แต่คำสั่ง default ดึงจาก "Development"

**แก้:** `vercel env pull .env.local --environment=production`

### 7.6 Next.js 16 — `middleware.ts` เปลี่ยนชื่อเป็น `proxy.ts`

**แก้:** เปลี่ยนชื่อไฟล์เป็น `proxy.ts` และ export ชื่อ `proxy` แทน `middleware`

### 7.7 Build fail — ตารางยังไม่มีในฐานข้อมูล

```
PrismaClientKnownRequestError P2021: The table does not exist
```

**สาเหตุ:** Next.js พยายาม prerender หน้าที่ query ฐานข้อมูลตอน build

**แก้:** ใส่ `export const dynamic = "force-dynamic";` เป็นบรรทัดแรกของทุกหน้าที่ query DB
(และต้องรัน `npm run db:push` ให้สำเร็จก่อน)

### 7.8 Vercel "Deployment Blocked"

**สาเหตุ:** Hobby plan ไม่ให้ deploy commit จากคนที่ไม่มีสิทธิ์ ถ้า repo เป็น Private

**แก้:** เปลี่ยน repo เป็น **Public** (Settings → Danger Zone → Change visibility)
หรืออัปเกรดเป็น Pro

### 7.9 อัปโหลดสลิปแล้วขึ้น "Unexpected end of JSON input"

```
Error: Vercel Blob: Cannot use public access...
```

**สาเหตุ:** Blob store สร้างเป็นแบบ **Private** แต่โค้ดสั่งอัปโหลดเป็น `access: "public"`
พอ error แล้ว route ไม่มี try/catch เลยส่ง response เปล่ากลับมา

**แก้:** เปลี่ยนเป็น `access: "private"` และดึงรูปผ่าน `/api/file?p=<pathname>`
พร้อมใส่ try/catch ให้ทุก API route ส่ง error เป็น JSON เสมอ

---

## 8. การจัดการรูปภาพและความปลอดภัย

Blob store เป็นแบบ **Private** ทั้งหมด — เข้าถึงผ่าน `/api/file?p=<pathname>` เท่านั้น

| โฟลเดอร์ | เนื้อหา | ใครดูได้ |
|---|---|---|
| `cars/` | รูปรถ | ทุกคน |
| `slips/` | **สลิปมัดจำ** (มีข้อมูลธนาคารลูกค้า) | **เฉพาะแอดมินที่ login แล้ว** |

`/api/file` จะเช็ค session ก่อนเสมอถ้า path ขึ้นต้นด้วย `slips/` — ถ้าไม่ได้ login จะได้ 401

**ข้อจำกัด:** การอัปโหลดจะ**ไม่ทำงานบนเครื่อง local** ถ้า `BLOB_READ_WRITE_TOKEN` ยังเป็น `[SENSITIVE]`
ต้องทดสอบบน Vercel หรือเอา token จริงจาก Vercel dashboard มาใส่

---

## 9. ขั้นตอนการ deploy

1. แก้โค้ดบนเครื่อง
2. ทดสอบด้วย `npm run dev`
3. เปิด **GitHub Desktop** → ใส่ข้อความ commit → **Commit to main** → **Push origin**
4. Vercel จะ deploy อัตโนมัติภายใน 1-2 นาที
5. ดูสถานะได้ที่ Vercel dashboard → Deployments

**ถ้า deploy ไม่ผ่าน:** ดู log ที่ Vercel → Deployments → คลิก deployment ที่ error → Build Logs
**ถ้าเว็บ error ตอนใช้งาน:** ดูที่ Vercel → **Logs** (runtime logs) — บอกสาเหตุจริงเสมอ

---

## 10. URL สำคัญ

| อะไร | ที่ไหน |
|---|---|
| เว็บไซต์ | https://car-booking-mvp.vercel.app |
| หลังบ้าน | https://car-booking-mvp.vercel.app/login |
| GitHub repo | https://github.com/phattharatayati-hue/car-booking-mvp |
| Vercel project | https://vercel.com/phatthara/car-booking-mvp |
| Vercel Logs | https://vercel.com/phatthara/car-booking-mvp/logs |
| Neon (ฐานข้อมูล) | Vercel → Storage → neon-citrine-nest → Open in Neon |

---

## 11. สิ่งที่ทำเสร็จแล้ว

- [x] โครงสร้างฐานข้อมูลครบ (รถ / ลูกค้า / การจอง / มัดจำ / แอดมิน)
- [x] ระบบ login แอดมิน (Auth.js + bcrypt + JWT)
- [x] ป้องกันหน้า `/admin/*` ด้วย proxy (middleware)
- [x] หน้าลูกค้า: หน้าแรก, รถทั้งหมด + ตัวกรอง, วิธีการจอง, ติดต่อเรา
- [x] จองรถ: เลือกวัน คำนวณราคาอัตโนมัติ กันเลือกวันย้อนหลัง
- [x] อัปโหลดสลิปมัดจำ (เก็บแบบ private)
- [x] หน้าสถานะการจองพร้อม stepper
- [x] หลังบ้าน: แดชบอร์ด + รายได้ + การจองล่าสุด
- [x] หลังบ้าน: จัดการรถ + อัปโหลดรูปรถ + เปิด/ปิดการใช้งาน
- [x] หลังบ้าน: ตรวจสลิป ยืนยัน/ปฏิเสธ/ยกเลิกการจอง + ตัวกรองสถานะ
- [x] UI โทนสว่าง responsive + ฟอนต์ไทย + เมนูนำทาง
- [x] สคริปต์ข้อมูลจำลองสำหรับทดสอบ

## 12. สิ่งที่ยังไม่ได้ทำ

**ควรทำก่อนใช้งานจริง**

- [ ] เปลี่ยนรหัสผ่านแอดมินจาก `changeme123`
- [ ] ใส่เลขบัญชีธนาคารจริง (ตอนนี้เป็นตัวอย่างใน `SlipUpload.tsx`)
- [ ] แก้ข้อมูลติดต่อจริงใน `SiteFooter.tsx` และ `app/contact/page.tsx`
- [ ] กันจองรถซ้ำช่วงวันที่ทับกัน (ตอนนี้เช็คแค่สถานะรถ)
- [ ] หน้าแก้ไข/ลบรถในหลังบ้าน (API มีแล้ว แต่ยังไม่มี UI)
- [ ] ระบบเปลี่ยนรหัสผ่าน / เพิ่มแอดมินคนอื่น

**เฟส 2 (ตามที่คุยไว้)**

- [ ] เชื่อมต่อ LINE OA — แจ้งเตือนแอดมินเมื่อมีการจองใหม่, แจ้งลูกค้าเมื่อยืนยัน
- [ ] Bank API เช็คยอดเงินเข้าอัตโนมัติ
- [ ] OCR อ่านสลิปอัตโนมัติ
- [ ] ระบบสัญญาเช่า / ใบเสร็จ
- [ ] รายงานรายได้แบบละเอียด

---

## 13. ข้อควรระวัง

1. **ฐานข้อมูลมีชุดเดียว** — เครื่อง local ต่อฐานข้อมูลตัวเดียวกับเว็บจริง
   ถ้าเพิ่ม/ลบข้อมูลตอนทดสอบ ข้อมูลจริงจะเปลี่ยนตามด้วย
2. **ไฟล์ `AGENTS.md` ในโปรเจกต์** เตือนว่า Next.js เวอร์ชันนี้มี breaking changes
   ถ้าจะแก้โค้ดควรเช็คเอกสารใน `node_modules/next/dist/docs/` ก่อน
3. **อย่าลบไฟล์ `prisma.config.ts`** — Prisma 7 ต้องใช้ ไม่งั้นต่อฐานข้อมูลไม่ได้
4. **หลังแก้ `schema.prisma` ทุกครั้ง** ต้องรัน `npx prisma generate` แล้วตามด้วย `npm run db:push`
5. `npx prisma db push` จะแก้โครงสร้างตารางจริง — ระวังข้อมูลหาย ถ้าลบ field ออก
