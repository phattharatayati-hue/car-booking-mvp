# ระบบจองรถ (MVP)

Next.js + Prisma + Neon Postgres + Auth.js + Vercel Blob

## สิ่งที่มีในรอบนี้

- หน้าบ้าน: เลือกรถ, จองวันที่, กรอกข้อมูลลูกค้า, อัปโหลดสลิปมัดจำ, ดูสถานะการจอง
- หลังบ้าน (ต้อง login): แดชบอร์ด, จัดการรถ, ตรวจสอบ/ยืนยัน/ปฏิเสธสลิปมัดจำ
- ยังไม่มี: LINE OA, Bank API/OCR อัตโนมัติ, ระบบแจ้งเตือน (เป็นเฟสถัดไป)

## ตั้งค่าครั้งแรก (ทำในเครื่องตัวเอง)

1. ติดตั้ง [Vercel CLI](https://vercel.com/docs/cli): `npm i -g vercel`
2. ที่โฟลเดอร์โปรเจกต์ รัน `vercel link` แล้วเลือกโปรเจกต์ `car-booking-mvp`
3. ดึง environment variables จาก Vercel ลงมาเป็น `.env.local`: `vercel env pull .env.local`
4. สร้างค่า `AUTH_SECRET` แล้วใส่ในไฟล์ `.env.local`: `npx auth secret` (คำสั่งนี้จะเพิ่มให้อัตโนมัติ)
5. ติดตั้ง dependencies: `npm install`
6. สร้างตารางในฐานข้อมูล Neon: `npm run db:push`
7. สร้างบัญชีแอดมินคนแรก (แก้ไอเมล/รหัสผ่านใน `.env.local` ก่อนได้ตามต้องการ): `npm run db:seed`
8. รันดูในเครื่อง: `npm run dev` แล้วเปิด http://localhost:3000 (หน้าบ้าน) และ http://localhost:3000/login (หลังบ้าน)

## Deploy ขึ้น Vercel

โปรเจกต์เชื่อมกับ Vercel ไว้แล้ว ทุกครั้งที่ push โค้ดขึ้น branch `main` จะ deploy ให้อัตโนมัติ

ก่อน deploy ครั้งแรกให้จริง ต้องตั้งค่า Environment Variable `AUTH_SECRET` ในหน้า Vercel Dashboard → Settings → Environment Variables ด้วย (ค่าเดียวกับที่ใช้ตอนรันในเครื่อง หรือสร้างใหม่ก็ได้)

หลัง deploy แล้วต้องรัน `npm run db:push` และ `npm run db:seed` อีกครั้งจากเครื่องตัวเอง (ชี้ไปที่ฐานข้อมูล Neon เดียวกัน) เพื่อสร้างตารางและบัญชีแอดมินบนฐานข้อมูลจริง

