import type { Lang } from "@/lib/locale";

/**
 * คำแปลของหน้าลูกค้า
 *
 * วิธีใช้ในหน้า (server component)
 *   const lang = await getLang();
 *   const t = dict(lang);
 *   <h1>{t.home.heroTitle}</h1>
 *
 * กันข้อความไทยโผล่ในหน้าอังกฤษได้อย่างไร
 *   ชุด en ประกาศเป็นชนิด Dict ที่ถอดโครงมาจากชุด th
 *   ถ้าลืมแปลคีย์ใดคีย์หนึ่ง TypeScript จะฟ้องตอน tsc --noEmit ทันที
 *   ไม่ต้องไล่หาด้วยตาเอง
 *
 * ตัวเลขที่เป็นข้อมูลจริง (ค่าจอง เงินประกัน จำนวนรถ) ไม่เก็บไว้ที่นี่
 * ดึงจากฐานข้อมูลหรือหน้าตั้งค่าเสมอ ที่นี่เก็บแต่ข้อความ
 */

const th = {
  nav: {
    home: "หน้าแรก",
    cars: "รถทั้งหมด",
    howTo: "คู่มือการจอง",
    fees: "ค่าปรับ",
    my: "ประวัติการจอง",
    line: "เชื่อมต่อ LINE",
    contact: "ติดต่อเรา",
    admin: "สำหรับแอดมิน",
    bookNow: "จองรถเลย",
    openMenu: "เปิดเมนู",
    callToBook: "โทรจองรถ",
    freeDelivery: "ส่งรถฟรีในเขตเมืองเชียงใหม่ · จองได้ 24 ชม.",
  },
  common: {
    perDay: "฿/วัน",
    baht: "บาท",
    viewAll: "ดูทั้งหมด",
    viewAllCars: "ดูรถทั้งหมด",
    book: "จองรถ",
    bookThis: "จองคันนี้",
    request: "ขอจอง",
    needsApproval: "ต้องรอยืนยัน",
    free: "ว่าง",
    freeToday: "ว่างวันนี้",
    busy: "ไม่ว่างช่วงนี้",
    freeFrom: "ว่าง",
    noPhoto: "ยังไม่มีรูป",
    insurance: "ประกันชั้น 1",
    petrol: "เบนซิน",
    plate: "ทะเบียน",
    popular: "ยอดนิยม",
  },
  home: {
    heroBadge: "บริการเช่ารถเชียงใหม่ · รับส่งถึงที่",
    heroTitle: "เช่ารถคุณภาพ",
    heroTitleAccent: "ส่งถึงมือคุณ ทุกที่ในเชียงใหม่",
    heroDesc:
      "เลือกรถ ระบุวันเวลา แล้วยืนยันด้วยการโอนค่าจอง ใช้เวลาไม่ถึง 5 นาที พนักงานนำรถไปส่งตามจุดที่นัดไว้",
    heroChip1: "ประกันชั้น 1 ทุกคัน",
    heroChip2: "รับส่งถึงที่",
    heroChip3: "จองผ่าน LINE ได้",
    ctaCars: "ดูรถทั้งหมด",
    ctaHowTo: "วิธีการจอง",

    statCars: "คันพร้อมให้เช่า",
    statFrom: "เริ่มต้นต่อวัน",
    statHours: "จองได้ตลอดเวลา",
    statHoursValue: "24 ชม.",
    statDeposit: "ค่าจองกันวัน",

    whyEyebrow: "ทำไมต้องเรา",
    whyTitle: "บริการที่วางใจได้",
    why1Title: "ประกันชั้น 1 ทุกคัน",
    why1Desc: "เงินประกันคืนให้ครบเมื่อคืนรถเรียบร้อย",
    why2Title: "รับส่งถึงที่",
    why2Desc: "สนามบิน โรงแรม หรือจุดที่นัดไว้ในตัวเมือง",
    why3Title: "จองผ่าน LINE ได้",
    why3Desc: "เลือกรถ เลือกวัน ส่งสลิป จบในแชทเดียว",
    why4Title: "ราคาชัดเจน",
    why4Desc: "เห็นยอดรวมทุกก้อนก่อนกดจอง ไม่มีบวกเพิ่มทีหลัง",

    stepsEyebrow: "ขั้นตอน",
    stepsTitle: "จองง่ายใน 4 ขั้นตอน",
    step1Title: "เลือกรถและวันเวลา",
    step1Desc: "ปฏิทินบอกว่าคันไหนว่างจริง ระบุเวลารับ-คืนได้",
    step2Title: "กรอกข้อมูลและจุดรับรถ",
    step2Desc: "เลือกจุดรับรถที่สะดวก หรือระบุที่อยู่เอง",
    step3Title: "โอนค่าจองและแนบสลิป",
    step3Desc: "โอนค่าจองเพื่อกันวันไว้ให้ แล้วแนบสลิปในระบบ",
    step4Title: "รับรถตามนัด",
    step4Desc: "พนักงานนำรถไปส่ง พร้อมแจ้งเตือนทาง LINE",

    pickedEyebrow: "รถแนะนำ",
    pickedTitle: "ว่างพร้อมให้เช่าตอนนี้",
    pickedDesc: "ราคารวมประกันชั้น 1",
    emptyTitle: "ยังไม่มีรถว่างให้จองในขณะนี้",
    emptyDesc: "กรุณากลับมาใหม่อีกครั้ง",

    brandsEyebrow: "เลือกตามยี่ห้อ",
    brandsTitle: "ยี่ห้อรถที่ให้เช่า",
    carsCountSuffix: "คัน",

    lineBadge: "รับแจ้งเตือนทาง LINE",
    lineTitle: "ไม่ต้องคอยเปิดเว็บเช็คเอง",
    lineDesc:
      "เชื่อมต่อ LINE ครั้งเดียว แล้วรู้ทันทีเมื่อแอดมินตรวจสลิปเสร็จ พร้อมเตือนก่อนถึงวันคืนรถ และเช็คสถานะได้ในแชท",
    lineCta: "เชื่อมต่อ LINE",
    lineP1: "แจ้งผลตรวจสลิปทันที",
    lineP2: "เตือนก่อนวันคืนรถ",
    lineP3: "เช็คสถานะในแชท",
    lineP4: "จองครั้งหน้าในแชทได้เลย",

    bandTitle: "พร้อมออกเดินทางแล้วหรือยัง",
    bandDesc: "เพิ่มเพื่อนใน LINE แล้วจองในแชทได้เลย ตอบกลับเร็วที่สุด",
    bandLine: "เพิ่มเพื่อน LINE",
  },
  footer: {
    about:
      "บริการเช่ารถคุณภาพในเชียงใหม่ รถสะอาด ราคาชัดเจน จองออนไลน์ได้ตลอด 24 ชั่วโมง",
    menu: "เมนู",
    legal: "ข้อกำหนด",
    contact: "ติดต่อ",
    feesLong: "ค่าปรับและค่าบริการ",
    terms: "เงื่อนไขการใช้บริการ",
    privacy: "นโยบายความเป็นส่วนตัว",
    call: "โทร",
  },
} as const;

/** โครงของพจนานุกรม — ค่าทุกตัวเป็นข้อความ */
type Deep<T> = { [K in keyof T]: T[K] extends string ? string : Deep<T[K]> };
export type Dict = Deep<typeof th>;

const en: Dict = {
  nav: {
    home: "Home",
    cars: "All cars",
    howTo: "How to book",
    fees: "Fees",
    my: "My bookings",
    line: "Connect LINE",
    contact: "Contact",
    admin: "Staff login",
    bookNow: "Book now",
    openMenu: "Open menu",
    callToBook: "Call to book",
    freeDelivery: "Free delivery within Chiang Mai city · book any hour",
  },
  common: {
    perDay: "THB/day",
    baht: "THB",
    viewAll: "View all",
    viewAllCars: "See all cars",
    book: "Book",
    bookThis: "Book this car",
    request: "Request",
    needsApproval: "Approval required",
    free: "Available",
    freeToday: "Available today",
    busy: "Fully booked",
    freeFrom: "Free from",
    noPhoto: "No photo yet",
    insurance: "Full insurance",
    petrol: "Petrol",
    plate: "Plate",
    popular: "Popular",
  },
  home: {
    heroBadge: "Car rental in Chiang Mai · delivered to you",
    heroTitle: "Quality cars,",
    heroTitleAccent: "delivered anywhere in Chiang Mai",
    heroDesc:
      "Pick a car, set your dates, and confirm with a deposit transfer — under five minutes. Our staff bring the car to the spot you choose.",
    heroChip1: "Full insurance on every car",
    heroChip2: "Delivery and pick-up",
    heroChip3: "Book over LINE",
    ctaCars: "Browse cars",
    ctaHowTo: "How it works",

    statCars: "cars ready to rent",
    statFrom: "starting per day",
    statHours: "book any time",
    statHoursValue: "24/7",
    statDeposit: "deposit to hold your dates",

    whyEyebrow: "Why us",
    whyTitle: "A service you can rely on",
    why1Title: "Full insurance on every car",
    why1Desc: "Your security deposit is returned in full on a clean return.",
    why2Title: "Delivery and pick-up",
    why2Desc: "The airport, your hotel, or any spot you name in the city.",
    why3Title: "Book over LINE",
    why3Desc: "Choose a car, set dates, send the slip — all in one chat.",
    why4Title: "Clear pricing",
    why4Desc: "Every charge shown before you confirm. Nothing added later.",

    stepsEyebrow: "The process",
    stepsTitle: "Book in four steps",
    step1Title: "Choose a car and your dates",
    step1Desc: "The calendar shows real availability, down to the hour.",
    step2Title: "Fill in your details and pick-up point",
    step2Desc: "Choose a convenient pick-up point or give us an address.",
    step3Title: "Transfer the deposit and attach the slip",
    step3Desc: "The deposit holds your dates. Upload the slip in the system.",
    step4Title: "Meet the car",
    step4Desc: "Our staff deliver it, with reminders sent over LINE.",

    pickedEyebrow: "Featured cars",
    pickedTitle: "Available to rent right now",
    pickedDesc: "Prices include full insurance.",
    emptyTitle: "No cars are available right now",
    emptyDesc: "Please check back again soon.",

    brandsEyebrow: "Browse by brand",
    brandsTitle: "Brands we rent",
    carsCountSuffix: "cars",

    lineBadge: "Updates on LINE",
    lineTitle: "No need to keep checking the site",
    lineDesc:
      "Connect LINE once and you will know the moment your transfer is verified, get a reminder before the return date, and can check your booking right in the chat.",
    lineCta: "Connect LINE",
    lineP1: "Instant transfer verification",
    lineP2: "Reminder before return day",
    lineP3: "Check status in chat",
    lineP4: "Book again from the chat",

    bandTitle: "Ready to hit the road?",
    bandDesc: "Add us on LINE and book right in the chat — we reply fastest there.",
    bandLine: "Add us on LINE",
  },
  footer: {
    about:
      "Quality car rental in Chiang Mai — clean cars, clear pricing, book online around the clock.",
    menu: "Menu",
    legal: "Legal",
    contact: "Contact",
    feesLong: "Fees and charges",
    terms: "Terms of service",
    privacy: "Privacy policy",
    call: "Call",
  },
};

const DICTS: Record<Lang, Dict> = { th, en };

export function dict(lang: Lang): Dict {
  return DICTS[lang];
}
