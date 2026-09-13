# เชื่อมระบบกับเพจ Facebook — ผลการศึกษาและข้อสรุป

ค้นข้อมูล 13 ก.ย. 2569 · เพจ: Phuping Corporation (`profile.php?id=61579645271293`)

**ข้อสรุป: ไม่ทำเป็นช่องทางจองที่สอง — ใช้เพจเป็นปากทางแล้วส่งต่อเข้า LINE**

---

## 1. คำถามที่ตั้งต้น

บริษัทมีเพจ Facebook อยู่แล้วและมีลูกค้าทักเข้ามา คำถามคือควรต่อ Messenger
เข้าระบบจองแบบเดียวกับ LINE OA หรือไม่

## 2. สิ่งที่ Messenger Platform ทำได้

- **ฟรี** ไม่มีค่าใช้จ่ายรายข้อความสำหรับการตอบในกรอบเวลาปกติ
- ผูก webhook เข้าระบบได้ สถาปัตยกรรมเหมือน LINE — โครงของ `app/api/line/webhook/route.ts` ใช้เป็นแม่แบบได้เกือบทั้งหมด
- มีเมนูค้างด้านล่าง (Persistent Menu) เทียบได้กับ rich menu
- มีการ์ด/ปุ่ม (Generic Template, Quick Reply) เทียบได้กับ Flex แต่ปรับแต่งได้น้อยกว่า
- ต้องขอสิทธิ์ `pages_messaging`, `pages_show_list`, `pages_manage_metadata`, `pages_read_engagement`

## 3. ตัวขวางที่ทำให้ไม่คุ้ม

### 3.1 ส่งแจ้งเตือนเองไม่ได้ (ตัวตัดสิน)

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

### 3.2 ไม่มีของเทียบเท่า LIFF

จุดแข็งของระบบคือ LINE Login ผูก `lineUserId` กับ `Customer` แล้วเปิดฟอร์มจองใน LIFF ได้เลย
ฝั่ง Messenger ต้องเปิด webview + Facebook Login แยก ซึ่งต้องผ่าน **App Review** และ
**Business Verification** ของ Meta (ส่งเอกสารบริษัท ใช้เวลาเป็นสัปดาห์)

### 3.3 ระบบสองช่องทางแปลว่าต้องดูแลสองชุด

การ์ด ข้อความ เมนู และ flow ทั้งหมดต้องมีสองเวอร์ชัน และต้องรู้ว่าลูกค้าคนเดียวกัน
ที่ทักมาทั้งสองทางคือคนเดียวกัน (ระบบผูก `Customer` กับ `lineUserId` อยู่)

## 4. แนวทางที่เลือก — "ตอบรับแล้วส่งต่อ"

ลงแรงน้อย ไม่ติดข้อจำกัดข้อไหนเลย เพราะทุกอย่างเกิดในกรอบ 24 ชม.

1. ลูกค้าทักเพจ → ระบบตอบอัตโนมัติทันที พร้อมการ์ด "เช็ครถว่าง / ดูราคา"
   และปุ่มใหญ่ **"จองผ่าน LINE"** ลิงก์ไป `@623oohcz`
2. ตั้ง Persistent Menu ของเพจให้มีปุ่มเดียวกัน
3. การแจ้งเตือนทั้งหมดยังเดินผ่าน LINE เหมือนเดิม

**เหตุผล:** ถ้าปล่อยให้ลูกค้าจองจบใน Messenger ได้ ระบบจะเตือนอะไรเขาไม่ได้เลยหลัง 24 ชม.
ซึ่งแย่กว่าไม่มีช่องทางนั้นตั้งแต่แรก

## 5. สิ่งที่ทำไปแล้วกับเพจ (ไม่ต้องใช้ API)

- ลิงก์ชวนรีวิวเพจในการ์ดต้อนรับตอนแอดเพื่อน LINE และหลังลูกค้าคืนรถ
- ค่าคงที่อยู่ที่ `lib/contact.ts` → `FACEBOOK_PAGE`, `FACEBOOK_REVIEW_URL`
- ใช้ `forLineBrowser(url)` ต่อท้าย `openExternalBrowser=1` เพราะเบราว์เซอร์ในแอป LINE
  เปิดหน้า Facebook ไม่ขึ้น ต้องบังคับให้เด้งออกไปเบราว์เซอร์เครื่อง

## 6. ถ้าวันหนึ่งจะทำจริง ต้องเตรียมอะไร

- [ ] Business Verification ของบริษัทใน Meta Business Suite (ทำล่วงหน้าได้ ใช้เวลานาน)
- [ ] สร้าง Meta App + ขอสิทธิ์ `pages_messaging` แล้วผ่าน App Review
- [ ] `FB_PAGE_ACCESS_TOKEN`, `FB_APP_SECRET`, `FB_VERIFY_TOKEN` ใน env
- [ ] endpoint `app/api/facebook/webhook/route.ts` — ตรวจ `X-Hub-Signature-256` ด้วย `FB_APP_SECRET`
      (เทียบเท่าการตรวจ `X-Line-Signature` ที่ทำอยู่)
- [ ] ตัดสินใจว่าจะผูกตัวตนลูกค้าอย่างไร ถ้ายังไม่ทำ Facebook Login

## แหล่งอ้างอิง

- https://developers.facebook.com/documentation/business-messaging/messenger-platform/overview
- https://developers.facebook.com/documentation/business-messaging/messenger-platform/send-messages
- https://developers.facebook.com/documentation/business-messaging/messenger-platform/policy
